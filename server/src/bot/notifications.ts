import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { sendMessage } from './index';
import { getSemesterWeekNumber, getSemesterWeekParity, getDayOfWeek, getMoscowDate } from './scheduleUtils';

export function startNotifications(prisma: PrismaClient) {
  // Check every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      await checkAndNotify(prisma);
    } catch (err) {
      console.error('Notification check error:', err);
    }
  });

  console.log('🔔 Notification system started');
}

async function checkAndNotify(prisma: PrismaClient) {
  // Use Moscow time for all calculations
  const msk = getMoscowDate();
  const dayOfWeek = getDayOfWeek(msk);
  const weekNum = getSemesterWeekNumber();
  const parity = getSemesterWeekParity();

  const mskHours = msk.getHours();
  const mskMinutes = msk.getMinutes();

  // Calculate time 15 minutes from now (in MSK)
  const in15min = new Date(msk.getTime() + 15 * 60 * 1000);
  const targetHours = in15min.getHours();
  const targetMinutes = in15min.getMinutes();

  // Format time for lesson lookup — e.g. "09:00"
  const timeTarget = `${targetHours.toString().padStart(2, '0')}:${targetMinutes.toString().padStart(2, '0')}`;

  console.log(`[Notify] MSK ${mskHours}:${mskMinutes.toString().padStart(2, '0')} | day=${dayOfWeek} week=${weekNum} parity=${parity} | checking for lessons at ${timeTarget}`);

  // Find lessons starting in 15 minutes
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

  // Send 15-min pre-class notifications
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

    console.log(`[Notify] Sending 15-min alert for "${lesson.subject}" to ${users.length} users`);

    for (const user of users) {
      try {
        await sendMessage(user.telegramId, text, 'MarkdownV2');
      } catch (e) {
        console.error(`Failed to notify user ${user.telegramId}:`, e);
      }
    }
  }

  // Morning schedule notification at 7:30 MSK
  if (mskHours === 7 && mskMinutes === 30) {
    console.log('[Notify] Sending morning schedule...');
    await sendDailySchedule(prisma, dayOfWeek, weekNum, parity);
  }
}

async function sendDailySchedule(prisma: PrismaClient, dayOfWeek: number, weekNum: number, parity: number) {
  // Sunday — skip
  if (dayOfWeek === 7) return;

  const DAY_NAMES: Record<number, string> = {
    1: 'Понедельник', 2: 'Вторник', 3: 'Среда', 4: 'Четверг',
    5: 'Пятница', 6: 'Суббота', 7: 'Воскресенье',
  };

  // Get all users with notifications enabled
  const users = await prisma.user.findMany({
    where: {
      notifyBefore: true,
      groupId: { not: null },
    },
    include: { group: true },
  });

  // Group by groupId
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
      try {
        await sendMessage(user.telegramId, text, 'MarkdownV2');
      } catch (e) {
        console.error(`Failed to send daily to ${user.telegramId}:`, e);
      }
    }
  }
}
