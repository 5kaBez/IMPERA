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
import { errorHandler } from './middleware/errorHandler';
import { startBot } from './bot/index';
import { startNotifications } from './bot/notifications';

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
      update: { role: 'admin' },
      create: {
        telegramId: '1038062816',
        firstName: 'Admin',
        username: 'bogtradinga',
        role: 'admin',
      },
    });
    console.log('👤 Admin user ensured');
  } catch (e) {
    console.error('Failed to seed admin:', e);
  }

  // Start Telegram bot
  startBot(prisma).then(() => {
    // Start notifications after bot is ready
    startNotifications(prisma);
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
