import { Bot, InlineKeyboard, Context } from 'grammy';
import { PrismaClient } from '@prisma/client';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://xn--80ajiqph.xn--p1acf/';

let bot: Bot | null = null;

// Store pending broadcasts waiting for confirmation
const pendingBroadcasts = new Map<string, { messageId: number; chatId: number }>();

// Note creation sessions
interface NoteSession {
  text: string;
  step: 'confirm' | 'day' | 'lesson';
  date?: string; // YYYY-MM-DD
}
const noteSessions = new Map<string, NoteSession>();

// Global prisma instance for bot
let globalPrisma: PrismaClient | null = null;

// Helper: escape MarkdownV2
const escMd = (s: string) => s.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');

export function getBotInstance(): Bot | null {
  return bot;
}

export async function startBot(prisma: PrismaClient) {
  if (!BOT_TOKEN || BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
    console.log('⚠️  TELEGRAM_BOT_TOKEN not set, bot not started');
    return null;
  }

  globalPrisma = prisma;
  bot = new Bot(BOT_TOKEN);

  // /start command — welcome message
  bot.command('start', async (ctx: Context) => {
    const firstName = ctx.from?.first_name || 'студент';
    const telegramId = ctx.from?.id?.toString();

    if (!telegramId) return;

    try {
      let user = await prisma.user.findUnique({ where: { telegramId } });

      // Auto-register user if not exists
      if (!user) {
        user = await prisma.user.create({
          data: {
            telegramId,
            firstName: ctx.from?.first_name || 'User',
            lastName: ctx.from?.last_name || null,
            username: ctx.from?.username || null,
            activated: true,
          },
        });
      } else if (!user.activated) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { activated: true },
        });
      }

      const keyboard = new InlineKeyboard()
        .webApp('📱 Открыть IMPERA', WEB_APP_URL);

      await ctx.reply(
        `Привет, ${escMd(firstName)}\\! 👋\n\n` +
        `Добро пожаловать в *IMPERA* — цифровую платформу для студентов ГУУ\\!\n\n` +
        `🎓 *Что умеет IMPERA:*\n\n` +
        `📅 *Расписание* — персональное расписание на сегодня, завтра и всю неделю\\. Всегда актуальное, всегда под рукой\\.\n\n` +
        `🔔 *Уведомления* — напомню о паре за 15 минут до начала, чтобы ты не опоздал\\. Утром пришлю расписание на весь день\\.\n\n` +
        `⭐ *Отзывы о преподавателях* — оставляй оценки и читай отзывы других студентов\\.\n\n` +
        `💬 *Обратная связь* — предложения, жалобы, баги — всё принимаем\\!\n\n` +
        `👇 *Нажми кнопку ниже, чтобы начать\\!*\n` +
        `Выбери свой институт, направление и группу — и расписание всегда будет с тобой\\.`,
        {
          parse_mode: 'MarkdownV2',
          reply_markup: keyboard,
        }
      );
    } catch (err) {
      console.error('Start command error:', err);
      await ctx.reply('❌ Произошла ошибка при запуске бота. Попробуй позже.');
    }
  });

  // /help command
  bot.command('help', async (ctx: Context) => {
    const keyboard = new InlineKeyboard()
      .webApp('📱 Открыть приложение', WEB_APP_URL);

    await ctx.reply(
      '🆘 *Помощь*\n\n' +
      'Доступные команды:\n' +
      '/start \\— Запустить бота\n' +
      '/help \\— Показать помощь\n' +
      '/schedule \\— Расписание на сегодня\n' +
      '/note \\— Создать заметку\n' +
      '/notify\\_on \\— Включить уведомления\n' +
      '/notify\\_off \\— Выключить уведомления\n\n' +
      '💡 *Быстрые заметки:* просто отправь или перешли любое сообщение — предложу создать заметку\\!\n\n' +
      'Или просто открой Mini App\\!',
      {
        parse_mode: 'MarkdownV2',
        reply_markup: keyboard,
      }
    );
  });

  // /schedule — today's schedule in text
  bot.command('schedule', async (ctx: Context) => {
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) return;

    try {
      const user = await prisma.user.findUnique({
        where: { telegramId },
        include: { group: true },
      });

      if (!user || !user.groupId) {
        const keyboard = new InlineKeyboard()
          .webApp('📱 Выбрать группу', WEB_APP_URL);
        await ctx.reply('⚠️ Ты ещё не выбрал группу. Открой приложение и выбери группу!', {
          reply_markup: keyboard,
        });
        return;
      }

      const { getSemesterWeekNumber, getSemesterWeekParity, getDayOfWeek } = await import('./scheduleUtils');

      const now = new Date();
      const dayOfWeek = getDayOfWeek(now);
      const parity = getSemesterWeekParity();
      const weekNum = getSemesterWeekNumber();

      const DAY_NAMES: Record<number, string> = {
        1: 'Понедельник', 2: 'Вторник', 3: 'Среда', 4: 'Четверг',
        5: 'Пятница', 6: 'Суббота', 7: 'Воскресенье',
      };

      const lessons = await prisma.lesson.findMany({
        where: {
          groupId: user.groupId,
          dayOfWeek,
          OR: [{ parity }, { parity: 2 }],
          weekStart: { lte: weekNum },
          weekEnd: { gte: weekNum },
        },
        orderBy: { pairNumber: 'asc' },
      });

      if (lessons.length === 0) {
        await ctx.reply(`📅 *${DAY_NAMES[dayOfWeek]}*\n\n✨ Сегодня нет пар\\! Отдыхай\\!`, {
          parse_mode: 'MarkdownV2',
        });
        return;
      }

      let text = `📅 *${escMd(DAY_NAMES[dayOfWeek])}* \\(неделя №${weekNum}, ${parity === 1 ? 'нечётная' : 'чётная'}\\)\n`;
      text += `👥 ${escMd(user.group!.name)} \\— ${user.group!.course} курс\n\n`;

      for (const l of lessons) {
        const type = l.lessonType === 'Лекция' ? '📘' :
          l.lessonType === 'Практика' ? '📗' :
            l.lessonType === 'Лабораторная' ? '🔬' : '📙';

        text += `${type} *${l.pairNumber} пара* \\(${escMd(l.timeStart)} — ${escMd(l.timeEnd)}\\)\n`;
        text += `   ${escMd(l.subject)}\n`;
        if (l.teacher) text += `   👤 ${escMd(l.teacher)}\n`;
        if (l.room) text += `   📍 Ауд\\. ${escMd(l.room)}\n`;
        text += '\n';
      }

      await ctx.reply(text.trim(), { parse_mode: 'MarkdownV2' });
    } catch (err) {
      console.error('Schedule command error:', err);
      await ctx.reply('❌ Произошла ошибка при получении расписания. Попробуй позже.');
    }
  });

  // /notify_on
  bot.command('notify_on', async (ctx: Context) => {
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) return;

    await prisma.user.updateMany({
      where: { telegramId },
      data: { notifyBefore: true },
    });

    await ctx.reply('🔔 Уведомления включены! Я буду напоминать тебе о парах за 15 минут.');
  });

  // /notify_off
  bot.command('notify_off', async (ctx: Context) => {
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) return;

    await prisma.user.updateMany({
      where: { telegramId },
      data: { notifyBefore: false },
    });

    await ctx.reply('🔕 Уведомления выключены. Включить: /notify_on');
  });

  // /note command — create note from command text
  bot.command('note', async (ctx: Context) => {
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) return;

    const text = (ctx.message as any)?.text?.replace(/^\/note\s*/, '').trim();
    if (!text) {
      await ctx.reply('📝 Напиши текст заметки после команды:\n/note Сдать лабу по физике');
      return;
    }

    noteSessions.set(telegramId, { text, step: 'confirm' });
    setTimeout(() => noteSessions.delete(telegramId), 5 * 60 * 1000);

    const keyboard = new InlineKeyboard()
      .text('📝 Создать заметку', 'note_create')
      .text('❌ Отмена', 'note_cancel');

    const preview = text.length > 80 ? text.slice(0, 80) + '...' : text;
    await ctx.reply(`📝 Создать заметку?\n\n"${preview}"`, { reply_markup: keyboard });
  });

  // Handle any other message
  bot.on('message', async (ctx: Context) => {
    const telegramId = ctx.from?.id?.toString();
    const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID || '';

    // Админ отправляет рассылку
    if (telegramId === ADMIN_ID) {
      try {
        // Get count of recipients
        const users = await prisma.user.findMany({
          select: { telegramId: true },
          where: { banned: false, telegramId: { not: ADMIN_ID } },
        });

        if (users.length === 0) {
          await ctx.reply('Нет пользователей для рассылки');
          return;
        }

        // Show confirmation buttons
        const keyboard = new InlineKeyboard()
          .text('✅ Подтвердить', `broadcast_confirm`)
          .text('❌ Отмена', `broadcast_cancel`);

        const confirmMsg = await ctx.reply(
          `📢 Отправить это сообщение ${users.length} пользователям?`,
          { reply_markup: keyboard }
        );

        // Store pending broadcast
        const key = `${ctx.chat!.id}_${ctx.message!.message_id}`;
        pendingBroadcasts.set(key, {
          messageId: ctx.message!.message_id,
          chatId: ctx.chat!.id,
        });

        // Auto-cleanup after 5 minutes
        setTimeout(() => {
          pendingBroadcasts.delete(key);
        }, 5 * 60 * 1000);
      } catch (err: any) {
        console.error('Broadcast error:', err);
        await ctx.reply(`❌ Ошибка: ${err.message}`);
      }
      return;
    }

    // Обычные пользователи — предложить создать заметку
    const msgText = (ctx.message as any)?.text
      || (ctx.message as any)?.caption
      || (ctx.message as any)?.forward_origin?.type && 'Пересланное сообщение';

    if (!msgText || !telegramId) {
      await ctx.reply('Используй /help для списка команд.');
      return;
    }

    noteSessions.set(telegramId, { text: msgText, step: 'confirm' });
    setTimeout(() => noteSessions.delete(telegramId), 5 * 60 * 1000);

    const keyboard = new InlineKeyboard()
      .text('📝 Создать заметку', 'note_create')
      .text('❌ Отмена', 'note_cancel');

    const preview = msgText.length > 80 ? msgText.slice(0, 80) + '...' : msgText;
    await ctx.reply(`📝 Создать заметку из этого сообщения?\n\n"${preview}"`, { reply_markup: keyboard });
  });

  // Handle all callback queries (broadcast + notes)
  bot.on('callback_query:data', async (ctx: Context) => {
    const data = ctx.callbackQuery?.data;
    const telegramId = ctx.from?.id?.toString();
    if (!data || !telegramId) return;

    // ── Broadcast callbacks (admin only) ──
    if (data.startsWith('broadcast_')) {
      const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID || '';
      if (telegramId !== ADMIN_ID) {
        await ctx.answerCallbackQuery({ text: '❌ Только админ', show_alert: true });
        return;
      }

      if (data === 'broadcast_cancel') {
        await ctx.editMessageText('❌ Рассылка отменена');
        return;
      }

      if (data === 'broadcast_confirm') {
        try {
          await ctx.editMessageText('⏳ Отправляю сообщение...');
          if (!globalPrisma) throw new Error('Database not available');

          const users = await globalPrisma.user.findMany({
            select: { telegramId: true },
            where: { banned: false, telegramId: { not: ADMIN_ID } },
          });

          let sent = 0, failed = 0;
          const errors: { telegramId: string; reason: string }[] = [];
          const chatId = ctx.chat!.id;
          const sourceMessageId = ctx.callbackQuery!.message!.message_id - 1;

          for (const user of users) {
            try {
              await ctx.api.copyMessage(parseInt(user.telegramId), chatId, sourceMessageId);
              sent++;
              await new Promise(resolve => setTimeout(resolve, 50));
            } catch (err: any) {
              failed++;
              const reason = err.message || 'Unknown error';
              if (reason.includes('blocked') || reason.includes('403')) {
                errors.push({ telegramId: user.telegramId, reason: 'Заблокировал бота' });
              } else if (reason.includes('user not found') || reason.includes('400')) {
                errors.push({ telegramId: user.telegramId, reason: 'Чат не найден' });
              } else {
                errors.push({ telegramId: user.telegramId, reason });
              }
            }
          }

          const emoji = failed === 0 ? '✅' : failed < sent ? '⚠️' : '❌';
          let message = `${emoji} *Рассылка отправлена*\nУспешно: ${sent}\nОшибок: ${failed}`;
          if (errors.length > 0) {
            message += '\n\n*Ошибки:*\n';
            errors.forEach(e => { message += `• ${e.telegramId}: ${e.reason}\n`; });
          }
          await ctx.editMessageText(message, { parse_mode: 'MarkdownV2' });
        } catch (err: any) {
          await ctx.editMessageText(`❌ Ошибка: ${err.message}`);
        }
      }
      return;
    }

    // ── Note callbacks ──
    if (data.startsWith('note_')) {
      const session = noteSessions.get(telegramId);

      if (data === 'note_cancel') {
        noteSessions.delete(telegramId);
        await ctx.editMessageText('❌ Отменено');
        await ctx.answerCallbackQuery();
        return;
      }

      if (data === 'note_create') {
        if (!session) {
          await ctx.editMessageText('⏳ Сессия истекла. Отправь сообщение ещё раз.');
          await ctx.answerCallbackQuery();
          return;
        }

        // Show day picker
        session.step = 'day';
        const { getMoscowDate } = await import('./scheduleUtils');
        const now = getMoscowDate();

        const DAY_NAMES_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        const keyboard = new InlineKeyboard();

        for (let i = 0; i < 3; i++) {
          const d = new Date(now);
          d.setDate(d.getDate() + i);
          const label = i === 0 ? 'Сегодня' : i === 1 ? 'Завтра' : 'Послезавтра';
          const dayName = DAY_NAMES_SHORT[d.getDay()];
          const dateStr = `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
          keyboard.text(`${label} (${dayName} ${dateStr})`, `note_day_${i}`);
          if (i < 2) keyboard.row();
        }
        keyboard.row().text('❌ Отмена', 'note_cancel');

        await ctx.editMessageText('📅 На какой день?', { reply_markup: keyboard });
        await ctx.answerCallbackQuery();
        return;
      }

      if (data.startsWith('note_day_')) {
        if (!session) {
          await ctx.editMessageText('⏳ Сессия истекла.');
          await ctx.answerCallbackQuery();
          return;
        }

        const offset = parseInt(data.replace('note_day_', ''));
        const { getMoscowDate, getDayOfWeek, getSemesterWeekNumber, getSemesterWeekParity } = await import('./scheduleUtils');
        const now = getMoscowDate();
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + offset);

        // Store date as YYYY-MM-DD
        const yyyy = targetDate.getFullYear();
        const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
        const dd = String(targetDate.getDate()).padStart(2, '0');
        session.date = `${yyyy}-${mm}-${dd}`;
        session.step = 'lesson';

        // Fetch schedule for this day
        const user = await prisma.user.findUnique({ where: { telegramId } });
        if (!user?.groupId) {
          noteSessions.delete(telegramId);
          const kb = new InlineKeyboard().webApp('📱 Выбрать группу', WEB_APP_URL);
          await ctx.editMessageText('⚠️ Сначала выбери группу в приложении!', { reply_markup: kb });
          await ctx.answerCallbackQuery();
          return;
        }

        const dayOfWeek = getDayOfWeek(targetDate);

        // Calculate parity for the target date
        const SEMESTER_START = new Date(2026, 1, 9);
        const diffMs = targetDate.getTime() - SEMESTER_START.getTime();
        const weekNum = diffMs < 0 ? 1 : Math.min(Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1, 18);
        const parity = weekNum % 2 === 1 ? 1 : 0;

        const lessons = await prisma.lesson.findMany({
          where: {
            groupId: user.groupId,
            dayOfWeek,
            OR: [{ parity }, { parity: 2 }],
            weekStart: { lte: weekNum },
            weekEnd: { gte: weekNum },
          },
          orderBy: { pairNumber: 'asc' },
        });

        if (lessons.length === 0) {
          // No lessons — create day-level note directly
          try {
            await prisma.note.create({
              data: {
                userId: user.id,
                date: new Date(`${session.date}T00:00:00Z`),
                title: session.text.slice(0, 100),
                text: session.text.length > 100 ? session.text : null,
                isPublic: false,
                groupId: user.groupId || null,
              },
            });
            noteSessions.delete(telegramId);

            const kb = new InlineKeyboard().webApp('📱 Открыть в IMPERA', WEB_APP_URL);
            await ctx.editMessageText(`✅ Заметка создана на ${dd}.${mm}!\n\nВ этот день нет пар — заметка привязана ко дню.`, { reply_markup: kb });
          } catch (err) {
            console.error('Note create error:', err);
            await ctx.editMessageText('❌ Ошибка при создании заметки.');
          }
          await ctx.answerCallbackQuery();
          return;
        }

        // Show lesson picker
        const keyboard = new InlineKeyboard();
        for (const l of lessons) {
          const type = l.lessonType === 'Лекция' ? '📘' :
            l.lessonType === 'Практика' ? '📗' :
              l.lessonType === 'Лабораторная' ? '🔬' : '📙';
          const subj = l.subject.length > 25 ? l.subject.slice(0, 25) + '…' : l.subject;
          keyboard.text(`${type} ${l.pairNumber}п ${l.timeStart} ${subj}`, `note_lesson_${l.id}`).row();
        }
        keyboard.text('📌 На весь день', 'note_lesson_day').row();
        keyboard.text('❌ Отмена', 'note_cancel');

        await ctx.editMessageText(`📚 На какую пару? (${dd}.${mm})`, { reply_markup: keyboard });
        await ctx.answerCallbackQuery();
        return;
      }

      if (data.startsWith('note_lesson_')) {
        if (!session || !session.date) {
          await ctx.editMessageText('⏳ Сессия истекла.');
          await ctx.answerCallbackQuery();
          return;
        }

        const user = await prisma.user.findUnique({ where: { telegramId } });
        if (!user) {
          await ctx.editMessageText('❌ Пользователь не найден.');
          await ctx.answerCallbackQuery();
          return;
        }

        const lessonId = data === 'note_lesson_day' ? null : parseInt(data.replace('note_lesson_', ''));

        try {
          const note = await prisma.note.create({
            data: {
              userId: user.id,
              date: new Date(`${session.date}T00:00:00Z`),
              title: session.text.slice(0, 100),
              text: session.text.length > 100 ? session.text : null,
              lessonId,
              isPublic: false,
              groupId: user.groupId || null,
            },
            include: { lesson: true },
          });

          noteSessions.delete(telegramId);

          const [, mm, dd] = session.date.split('-');
          let msg = `✅ Заметка создана на ${dd}.${mm}`;
          if (note.lesson) {
            msg += `\n📚 ${note.lesson.pairNumber} пара — ${note.lesson.subject}`;
          }
          msg += `\n\n"${note.title}"`;

          const kb = new InlineKeyboard().webApp('📱 Открыть в IMPERA', WEB_APP_URL);
          await ctx.editMessageText(msg, { reply_markup: kb });
        } catch (err) {
          console.error('Note create error:', err);
          await ctx.editMessageText('❌ Ошибка при создании заметки.');
        }
        await ctx.answerCallbackQuery();
        return;
      }
    }
  });

  // Error handler
  bot.catch((err) => {
    console.error('Bot error:', err);
  });

  // Configure bot metadata (non-critical — don't block startup)
  try {
    await bot.api.setMyCommands([
      { command: 'start', description: 'Запустить бота' },
      { command: 'schedule', description: 'Расписание на сегодня' },
      { command: 'note', description: 'Создать заметку' },
      { command: 'help', description: 'Помощь' },
      { command: 'notify_on', description: 'Включить уведомления' },
      { command: 'notify_off', description: 'Выключить уведомления' },
    ]);
  } catch (e) {
    console.log('⚠️  Could not set bot commands (will retry on next restart)');
  }

  try {
    await bot.api.setMyDescription(
      'IMPERA — цифровая платформа для студентов ГУУ. Расписание, уведомления о парах, отзывы о преподавателях. Нажми /start чтобы начать!'
    );
    await bot.api.setMyShortDescription(
      'Расписание ГУУ, уведомления о парах, отзывы о преподавателях'
    );
  } catch (e) {
    console.log('⚠️  Could not set bot description');
  }

  try {
    await bot.api.setChatMenuButton({
      menu_button: {
        type: 'web_app',
        text: 'IMPERA',
        web_app: { url: WEB_APP_URL },
      },
    });
  } catch (e) {
    console.log('⚠️  Could not set menu button (need valid HTTPS URL)');
  }

  // Start polling with retry on network/conflict errors
  const startPolling = (attempt = 1) => {
    bot!.start({
      drop_pending_updates: true,
      onStart: () => console.log('🤖 Telegram bot started successfully'),
    }).catch((err: any) => {
      if (attempt <= 5) {
        const delay = attempt * 3;
        console.log(`⚠️ Bot start failed (attempt ${attempt}/5), retrying in ${delay}s... [${err.message || err}]`);
        setTimeout(() => startPolling(attempt + 1), delay * 1000);
      } else {
        console.error('❌ Bot failed to start after 5 attempts:', err.message || err);
      }
    });
  };
  startPolling();

  return bot;
}

// Send message to a specific user by telegram ID
export async function sendMessage(telegramId: string, text: string, parseMode?: 'MarkdownV2' | 'HTML') {
  if (!bot) return;
  try {
    await bot.api.sendMessage(telegramId, text, {
      parse_mode: parseMode,
    });
  } catch (err) {
    console.error(`Failed to send message to ${telegramId}:`, err);
  }
}
