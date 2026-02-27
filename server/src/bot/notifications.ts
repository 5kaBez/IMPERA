import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { sendMessage } from './index';
import { getSemesterWeekNumber, getSemesterWeekParity, getDayOfWeek } from './scheduleUtils';

export function startNotifications(prisma: PrismaClient) {
  // Проверяем каждую минуту
  cron.schedule('* * * * *', async () => {
    try {
      await checkAndNotify(prisma);
    } catch (err) {
      console.error('Notification check error:', err);
    }
  });

  console.log('🔔 Notification system started');
}

async function checkAndNotify(prisma: PrismaClient) {
  const now = new Date();
  const dayOfWeek = getDayOfWeek(now);
  const weekNum = getSemesterWeekNumber();
  const parity = getSemesterWeekParity();

  // Рассчитываем время через 15 минут
  const in15min = new Date(now.getTime() + 15 * 60 * 1000);
  const targetHours = in15min.getHours();
  const targetMinutes = in15min.getMinutes();

  // Форматируем время для поиска — ищем пары, начинающиеся в HH:MM
  const timeTarget = `${targetHours.toString().padStart(2, '0')}:${targetMinutes.toString().padStart(2, '0')}`;

  // Находим все пары, которые начинаются через 15 минут
  const lessons = await prisma.lesson.findMany({
    where: {
      dayOfWeek,
      timeStart: timeTarget,
      OR: [{ parity }, { parity: 2 }],
      weekStart: { lte: weekNum },
      weekEnd: { gte: weekNum },
    },
    include: {
      group: {
        include: {
          users: {
            where: { notifyBefore: true },
          },
        },
      },
    },
  });

  // Отправляем уведомления
  for (const lesson of lessons) {
    const users = lesson.group.users;
    if (users.length === 0) continue;

    const escMd = (s: string) => s.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');

    const type = lesson.lessonType === 'Лекция' ? '📘' :
      lesson.lessonType === 'Практика' ? '📗' :
        lesson.lessonType === 'Лабораторная' ? '🔬' : '📙';

    let text = `🔔 *Через 15 минут начнётся пара\\!*\n\n`;
    text += `${type} *${escMd(lesson.subject)}*\n`;
    text += `⏰ ${escMd(lesson.timeStart)} — ${escMd(lesson.timeEnd)}\n`;
    if (lesson.teacher) text += `👤 ${escMd(lesson.teacher)}\n`;
    if (lesson.room) text += `📍 Ауд\\. ${escMd(lesson.room)}\n`;

    for (const user of users) {
      await sendMessage(user.telegramId, text, 'MarkdownV2');
    }
  }

  // Утреннее уведомление — расписание на день (в 7:30)
  if (now.getHours() === 7 && now.getMinutes() === 30) {
    await sendDailySchedule(prisma, dayOfWeek, weekNum, parity);
  }
}

async function sendDailySchedule(prisma: PrismaClient, dayOfWeek: number, weekNum: number, parity: number) {
  // Воскресенье — не отправляем
  if (dayOfWeek === 7) return;

  const DAY_NAMES: Record<number, string> = {
    1: 'Понедельник', 2: 'Вторник', 3: 'Среда', 4: 'Четверг',
    5: 'Пятница', 6: 'Суббота', 7: 'Воскресенье',
  };

  // Получаем всех пользователей с уведомлениями
  const users = await prisma.user.findMany({
    where: {
      notifyBefore: true,
      groupId: { not: null },
    },
    include: { group: true },
  });

  // Группируем по groupId
  const groupMap = new Map<number, typeof users>();
  for (const user of users) {
    const gid = user.groupId!;
    if (!groupMap.has(gid)) groupMap.set(gid, []);
    groupMap.get(gid)!.push(user);
  }

  for (const [groupId, groupUsers] of groupMap) {
    const lessons = await prisma.lesson.findMany({
      where: {
        groupId,
        dayOfWeek,
        OR: [{ parity }, { parity: 2 }],
        weekStart: { lte: weekNum },
        weekEnd: { gte: weekNum },
      },
      orderBy: { pairNumber: 'asc' },
    });

    if (lessons.length === 0) continue;

    const escMd = (s: string) => s.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');

    let text = `☀️ *Доброе утро\\!*\n\n`;
    text += `📅 *${escMd(DAY_NAMES[dayOfWeek])}* — ${lessons.length} ${lessons.length === 1 ? 'пара' : lessons.length < 5 ? 'пары' : 'пар'}\n\n`;

    for (const l of lessons) {
      const type = l.lessonType === 'Лекция' ? '📘' :
        l.lessonType === 'Практика' ? '📗' :
          l.lessonType === 'Лабораторная' ? '🔬' : '📙';

      text += `${type} *${l.pairNumber}\\)* ${escMd(l.timeStart)} — ${escMd(l.subject)}`;
      if (l.room) text += ` \\(${escMd(l.room)}\\)`;
      text += '\n';
    }

    text += `\nХорошего дня\\! 💪`;

    for (const user of groupUsers) {
      await sendMessage(user.telegramId, text, 'MarkdownV2');
    }
  }
}
