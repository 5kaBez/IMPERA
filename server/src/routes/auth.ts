import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'impera-secret-change-in-production';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

function verifyTelegramAuth(data: Record<string, string>): boolean {
  // In dev mode without bot token, accept all
  if (!BOT_TOKEN || BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
    return true;
  }

  const checkString = Object.keys(data)
    .filter(key => key !== 'hash')
    .sort()
    .map(key => `${key}=${data[key]}`)
    .join('\n');

  const secretKey = crypto.createHash('sha256').update(BOT_TOKEN).digest();
  const hmac = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

  return hmac === data.hash;
}

// POST /api/auth/telegram — login/register via Telegram
router.post('/telegram', async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const telegramData = req.body;

    if (!telegramData.id) {
      res.status(400).json({ error: 'Не указан Telegram ID' });
      return;
    }

    // Verify Telegram auth
    if (!verifyTelegramAuth(telegramData)) {
      res.status(401).json({ error: 'Невалидные данные авторизации' });
      return;
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { telegramId: String(telegramData.id) },
      include: { group: { include: { program: { include: { direction: { include: { institute: true } } } } } } }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId: String(telegramData.id),
          firstName: telegramData.first_name || 'User',
          lastName: telegramData.last_name || null,
          username: telegramData.username || null,
          photoUrl: telegramData.photo_url || null,
        },
        include: { group: { include: { program: { include: { direction: { include: { institute: true } } } } } } }
      });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: {
        id: user.id,
        telegramId: user.telegramId,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        photoUrl: user.photoUrl,
        role: user.role,
        group: user.group,
        notifyBefore: user.notifyBefore,
        notifyChanges: user.notifyChanges,
      }
    });
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Ошибка авторизации' });
  }
});

// POST /api/auth/webapp — login via Telegram Mini App (initData)
router.post('/webapp', async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const { initData } = req.body;

    if (!initData) {
      res.status(400).json({ error: 'initData отсутствует' });
      return;
    }

    // Parse initData
    const params = new URLSearchParams(initData);
    const hash = params.get('hash') || '';
    params.delete('hash');

    // Verify initData
    if (BOT_TOKEN && BOT_TOKEN !== 'YOUR_BOT_TOKEN_HERE') {
      const dataCheckString = Array.from(params.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');

      const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
      const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

      if (hmac !== hash) {
        res.status(401).json({ error: 'Невалидные данные Web App' });
        return;
      }
    }

    // Extract user data
    const userDataStr = params.get('user');
    if (!userDataStr) {
      res.status(400).json({ error: 'Данные пользователя отсутствуют' });
      return;
    }

    const telegramUser = JSON.parse(userDataStr);

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { telegramId: String(telegramUser.id) },
      include: { group: { include: { program: { include: { direction: { include: { institute: true } } } } } } }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId: String(telegramUser.id),
          firstName: telegramUser.first_name || 'User',
          lastName: telegramUser.last_name || null,
          username: telegramUser.username || null,
          photoUrl: telegramUser.photo_url || null,
        },
        include: { group: { include: { program: { include: { direction: { include: { institute: true } } } } } } }
      });
    } else {
      // Update user info
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          firstName: telegramUser.first_name || user.firstName,
          lastName: telegramUser.last_name || user.lastName,
          username: telegramUser.username || user.username,
          photoUrl: telegramUser.photo_url || user.photoUrl,
        },
        include: { group: { include: { program: { include: { direction: { include: { institute: true } } } } } } }
      });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: {
        id: user.id,
        telegramId: user.telegramId,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        photoUrl: user.photoUrl,
        role: user.role,
        groupId: user.groupId,
        group: user.group,
        notifyBefore: user.notifyBefore,
        notifyChanges: user.notifyChanges,
      }
    });
  } catch (err) {
    console.error('WebApp auth error:', err);
    res.status(500).json({ error: 'Ошибка авторизации' });
  }
});

// Dev-only: login without Telegram
router.post('/dev-login', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const prisma: PrismaClient = req.app.locals.prisma;
  const { telegramId, firstName, role } = req.body;

  let user = await prisma.user.findUnique({
    where: { telegramId: String(telegramId || '123456') },
    include: { group: { include: { program: { include: { direction: { include: { institute: true } } } } } } }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        telegramId: String(telegramId || '123456'),
        firstName: firstName || 'Dev User',
        role: role || 'student',
      },
      include: { group: { include: { program: { include: { direction: { include: { institute: true } } } } } } }
    });
  }

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user });
});

// GET /api/auth/me — current user
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { group: { include: { program: { include: { direction: { include: { institute: true } } } } } } }
    });

    if (!user) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }

    res.json({ user });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
