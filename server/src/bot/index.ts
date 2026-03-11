import { Bot, InlineKeyboard, Context } from 'grammy';
import { PrismaClient } from '@prisma/client';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://xn--80ajiqph.xn--p1acf/';

let bot: Bot | null = null;

// Store pending broadcasts waiting for confirmation
const pendingBroadcasts = new Map<string, { messageId: number; chatId: number }>();

// Global prisma instance for bot
let globalPrisma: PrismaClient | null = null;

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

  // /start command — welcome message with invite code handling
  bot.command('start', async (ctx: Context) => {
    const firstName = ctx.from?.first_name || 'студент';
    const telegramId = ctx.from?.id?.toString();
    const inviteCode = ctx.match?.trim(); // Параметр из ссылки: /start ABC123INV

    if (!telegramId) return;

    try {
      let user = await prisma.user.findUnique({ where: { telegramId } });
      let activated = false;
      let inviteMessage = '';

      // Auto-register user if not exists
      if (!user) {
        user = await prisma.user.create({
          data: {
            telegramId,
            firstName: ctx.from?.first_name || 'User',
            lastName: ctx.from?.last_name || null,
            username: ctx.from?.username || null,
            activated: false,
          },
        });
      }

      // Если есть инвайт-код, активируем пользователя
      if (inviteCode) {
        try {
          const inviteRecord = await prisma.inviteCode.findUnique({
            where: { code: inviteCode },
            include: { createdBy: true },
          });

          if (inviteRecord && !inviteRecord.usedAt) {
            // Код валиден и не использован — активируем пользователя
            await prisma.inviteCode.update({
              where: { code: inviteCode },
              data: {
                usedAt: new Date(),
                usedById: user.id,
              },
            });

            // Активируем пользователя
            await prisma.user.update({
              where: { id: user.id },
              data: { activated: true },
            });

            activated = true;
            inviteMessage = `\n\n✅ *Неплохо\\!* Ты активирован через код от ${inviteRecord.createdBy?.firstName || 'одноклассника'}\\!`;
          } else if (inviteRecord?.usedAt) {
            inviteMessage = `\n\n⚠️ Этот код уже использован\\.`;
          } else {
            inviteMessage = `\n\n❌ Неверный инвайт\\-код\\. Видимо, ссылка потеряла актуальность\\.`;
          }
        } catch (err) {
          console.error('Invite code processing error:', err);
          inviteMessage = `\n\n⚠️ Ошибка при обработке кода приглашения\\.`;
        }
      }

      const keyboard = new InlineKeyboard()
        .webApp('📱 Открыть IMPERA', WEB_APP_URL);

      await ctx.reply(
        `Привет, ${firstName}\\! 👋\n\n` +
        `Добро пожаловать в *IMPERA* — цифровую платформу для студентов ГУУ\\!\n\n` +
        `🎓 *Что умеет IMPERA:*\n\n` +
        `📅 *Расписание* — персональное расписание на сегодня, завтра и всю неделю\\. Всегда актуальное, всегда под рукой\\.\n\n` +
        `🔔 *Уведомления* — напомню о паре за 15 минут до начала, чтобы ты не опоздал\\. Утром пришлю расписание на весь день\\.\n\n` +
        `⭐ *Отзывы о преподавателях* — оставляй оценки и читай отзывы других студентов\\.\n\n` +
        `💬 *Обратная связь* — предложения, жалобы, баги — всё принимаем\\!\n\n` +
        `👇 *Нажми кнопку ниже, чтобы начать\\!*\n` +
        `Выбери свой институт, направление и группу — и расписание всегда будет с тобой\\.` +
        inviteMessage,
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
      '/notify\\_on \\— Включить уведомления\n' +
      '/notify\\_off \\— Выключить уведомления\n\n' +
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

      const escMd = (s: string) => s.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');

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

  // Handle any other message
  bot.on('message', async (ctx: Context) => {
    const telegramId = ctx.from?.id?.toString();
    const ADMIN_ID = '1038062816';

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

    // Обычные пользователи получают сообщение о помощи
    const keyboard = new InlineKeyboard()
      .webApp('📱 Открыть IMPERA', WEB_APP_URL);

    await ctx.reply(
      'Я понимаю только команды 😊\n\nИспользуй /help для списка команд или открой Mini App!',
      { reply_markup: keyboard }
    );
  });

  // Handle broadcast confirmation
  bot.on('callback_query:data', async (ctx: Context) => {
    const data = ctx.callbackQuery?.data;
    const ADMIN_ID = '1038062816';
    const adminId = ctx.from?.id?.toString();

    if (!data?.startsWith('broadcast_')) return;
    if (adminId !== ADMIN_ID) {
      await ctx.answerCallbackQuery({
        text: '❌ Только админ может использовать эту кнопку',
        show_alert: true,
      });
      return;
    }

    if (data === 'broadcast_cancel') {
      await ctx.editMessageText('❌ Рассылка отменена');
      return;
    }

    if (data === 'broadcast_confirm') {
      try {
        await ctx.editMessageText('⏳ Отправляю сообщение...');

        if (!globalPrisma) {
          throw new Error('Database not available');
        }

        // Get all users
        const users = await globalPrisma.user.findMany({
          select: { telegramId: true },
          where: { banned: false, telegramId: { not: ADMIN_ID } },
        });

        let sent = 0;
        let failed = 0;
        const errors: { telegramId: string; reason: string }[] = [];

        // Get the original message ID (it's the one before confirmation message)
        const chatId = ctx.chat!.id;
        const sourceMessageId = ctx.callbackQuery!.message!.message_id - 1;

        // Copy message to each user (with rate limiting)
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

            console.error(`[Broadcast] Failed to ${user.telegramId}:`, reason);
          }
        }

        // Send confirmation to admin
        const emoji = failed === 0 ? '✅' : failed < sent ? '⚠️' : '❌';
        let message = `${emoji} *Рассылка отправлена*\n` +
          `Успешно: ${sent}\n` +
          `Ошибок: ${failed}`;

        if (errors.length > 0) {
          message += '\n\n*Ошибки:*\n';
          errors.forEach(e => {
            message += `• ${e.telegramId}: ${e.reason}\n`;
          });
        }

        await ctx.editMessageText(message, { parse_mode: 'MarkdownV2' });
      } catch (err: any) {
        console.error('Broadcast execution error:', err);
        await ctx.editMessageText(`❌ Ошибка при отправке: ${err.message}`);
      }
    }
  });

  // Error handler
  bot.catch((err) => {
    console.error('Bot error:', err);
  });

  // Start the bot
  try {
    await bot.api.setMyCommands([
      { command: 'start', description: 'Запустить бота' },
      { command: 'schedule', description: 'Расписание на сегодня' },
      { command: 'help', description: 'Помощь' },
      { command: 'notify_on', description: 'Включить уведомления' },
      { command: 'notify_off', description: 'Выключить уведомления' },
    ]);

    // Set bot description (shown before user starts the bot)
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

    // Configure Mini App menu button
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

    // Start polling with conflict handling (during Render redeploys)
    const startPolling = (attempt = 1) => {
      bot!.start({
        drop_pending_updates: true,
        onStart: () => console.log('🤖 Telegram bot started successfully'),
      }).catch((err: any) => {
        if (err?.error_code === 409 && attempt <= 5) {
          console.log(`⚠️ Bot conflict (attempt ${attempt}/5), retrying in ${attempt * 3}s...`);
          setTimeout(() => startPolling(attempt + 1), attempt * 3000);
        } else {
          console.error('Bot polling error:', err.message || err);
        }
      });
    };
    startPolling();
  } catch (err) {
    console.error('Failed to start bot:', err);
  }

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
