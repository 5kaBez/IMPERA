import { Bot, InlineKeyboard, Context } from 'grammy';
import { PrismaClient } from '@prisma/client';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://impera-4nqp.onrender.com';

let bot: Bot | null = null;

export function getBotInstance(): Bot | null {
  return bot;
}

export async function startBot(prisma: PrismaClient) {
  if (!BOT_TOKEN || BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
    console.log('⚠️  TELEGRAM_BOT_TOKEN not set, bot not started');
    return null;
  }

  bot = new Bot(BOT_TOKEN);

  // /start command
  bot.command('start', async (ctx: Context) => {
    const firstName = ctx.from?.first_name || 'студент';

    const keyboard = new InlineKeyboard()
      .webApp('📱 Открыть IMPERA', WEB_APP_URL);

    await ctx.reply(
      `Привет, ${firstName}! 👋\n\n` +
      `Я — *IMPERA*, твой цифровой помощник в университете ГУУ\\.\n\n` +
      `📅 *Расписание* — всегда под рукой\n` +
      `🔔 *Уведомления* — напомню о парах\n` +
      `📊 *Информация* — все данные о учёбе\n\n` +
      `Нажми кнопку ниже, чтобы открыть приложение\\!`,
      {
        parse_mode: 'MarkdownV2',
        reply_markup: keyboard,
      }
    );
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
    const keyboard = new InlineKeyboard()
      .webApp('📱 Открыть IMPERA', WEB_APP_URL);

    await ctx.reply(
      'Я понимаю только команды 😊\n\nИспользуй /help для списка команд или открой Mini App!',
      { reply_markup: keyboard }
    );
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

    bot.start();
    console.log('🤖 Telegram bot started successfully');
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
