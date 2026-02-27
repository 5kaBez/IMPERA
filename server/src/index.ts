import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import scheduleRoutes from './routes/schedule';
import structureRoutes from './routes/structure';
import userRoutes from './routes/user';
import adminRoutes from './routes/admin';
import { errorHandler } from './middleware/errorHandler';
import { startBot } from './bot/index';
import { startNotifications } from './bot/notifications';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';

app.use(helmet({
  contentSecurityPolicy: false, // Allow Telegram Web App scripts
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

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

// Error handler
app.use(errorHandler);

app.listen(Number(PORT), HOST, () => {
  console.log(`🚀 IMPERA server running on http://${HOST}:${PORT}`);

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
