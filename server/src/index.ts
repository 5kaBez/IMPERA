import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import scheduleRoutes from './routes/schedule';
import structureRoutes from './routes/structure';
import userRoutes from './routes/user';
import adminRoutes from './routes/admin';
import feedbackRoutes from './routes/feedback';
import teacherRoutes from './routes/teachers';
import sportsRoutes from './routes/sports';
import sportsAttendanceRoutes from './routes/sports-attendance';
import { errorHandler } from './middleware/errorHandler';
import { startBot } from './bot/index';
import { startNotifications } from './bot/notifications';
import cron from 'node-cron';
import { runAutoImport } from './utils/guuScheduleImporter';

// Ensure database tables exist on startup
try {
  console.log('📦 Syncing database schema...');
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    timeout: 30000,
  });
  console.log('✅ Database schema synced');
} catch (e) {
  console.error('⚠️ Schema sync failed (will retry):', e instanceof Error ? e.message : e);
}

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';

app.use(helmet({
  contentSecurityPolicy: false, // Allow Telegram Web App scripts
  frameguard: false, // Allow Telegram Desktop to open Mini App in iframe
}));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
}

// Make prisma available to routes
app.locals.prisma = prisma;

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/structure', structureRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/sports', sportsRoutes);
app.use('/api/sports/attendance', sportsAttendanceRoutes);

// Health check
app.get('/api/health', async (_req, res) => {
  let dbStatus = 'unknown';
  let dbError = '';
  let userCount = 0;
  try {
    userCount = await prisma.user.count();
    dbStatus = 'connected';
  } catch (e: any) {
    dbStatus = 'error';
    dbError = e?.message || String(e);
  }
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    db: dbStatus,
    dbError: dbError || undefined,
    users: userCount,
    hasDbUrl: !!process.env.DATABASE_URL,
  });
});

// SPA fallback in production (Express v5 requires {*path} instead of *)
if (process.env.NODE_ENV === 'production') {
  app.get('{*path}', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

// Error handler
app.use(errorHandler);

app.listen(Number(PORT), HOST, async () => {
  console.log(`🚀 IMPERA server running on http://${HOST}:${PORT}`);

  // Ensure admin user exists (TG ID 1038062816 @bogtradinga)
  try {
    await prisma.user.upsert({
      where: { telegramId: '1038062816' },
      update: { role: 'admin', activated: true },
      create: {
        telegramId: '1038062816',
        firstName: 'Admin',
        username: 'bogtradinga',
        role: 'admin',
        activated: true,
      },
    });
    console.log('👤 Admin user ensured');
  } catch (e) {
    console.error('Failed to seed admin:', e);
  }

  // Seed invite codes for closed beta (15 одноразовых 6-значных кодов)
  try {
    const BETA_CODES = [
      '847291', '163058', '529473', '731649', '285016',
      '694382', '418597', '956234', '372861', '640715',
      '198453', '503927', '862140', '275689', '431076',
    ];
    let seeded = 0;
    for (const code of BETA_CODES) {
      const exists = await prisma.inviteCode.findUnique({ where: { code } });
      if (!exists) {
        await prisma.inviteCode.create({ data: { code } });
        seeded++;
      }
    }
    const totalCodes = await prisma.inviteCode.count();
    const usedCodes = await prisma.inviteCode.count({ where: { used: true } });
    console.log(`🎟️ Invite codes: ${totalCodes} total, ${usedCodes} used (${seeded} new seeded)`);
  } catch (e) {
    console.error('Failed to seed invite codes:', e);
  }

  // Start Telegram bot
  startBot(prisma).then((botInstance) => {
    // Store bot instance in app locals so routes can access it
    app.locals.bot = botInstance;
    // Start notifications after bot is ready
    startNotifications(prisma);
  });

  // Schedule auto-import from GUU every day at 7:00 MSK
  cron.schedule('0 7 * * *', async () => {
    console.log('📅 [CRON] Starting scheduled auto-import from GUU...');
    try {
      const result = await runAutoImport(prisma, 'auto');
      console.log(`📅 [CRON] Auto-import ${result.success ? 'completed' : 'failed'}: ${result.success ? `${result.stats?.imported} rows` : result.error}`);
    } catch (err) {
      console.error('📅 [CRON] Auto-import error:', err);
    }
  }, { timezone: 'Europe/Moscow' });
  console.log('📅 Auto-import cron scheduled: daily at 7:00 MSK');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
