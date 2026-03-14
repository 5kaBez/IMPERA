import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'impera-secret-change-in-production';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

function verifyTelegramAuth(data: Record<string, string>): boolean {
  // SECURITY: Require valid bot token — never skip verification
  if (!BOT_TOKEN || BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
    console.error('SECURITY: BOT_TOKEN not configured, rejecting auth');
    return false;
  }

  if (!data.hash) {
    return false;
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

    if (user && !user.activated) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { activated: true },
        include: { group: { include: { program: { include: { direction: { include: { institute: true } } } } } } }
      });
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId: String(telegramData.id),
          firstName: telegramData.first_name || 'User',
          lastName: telegramData.last_name || null,
          username: telegramData.username || null,
          photoUrl: telegramData.photo_url || null,
          activated: true,
        },
        include: { group: { include: { program: { include: { direction: { include: { institute: true } } } } } } }
      });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    const enriched = await enrichUserWithSportInfo(prisma, user);

    res.json({
      token,
      user: {
        id: enriched.id,
        telegramId: enriched.telegramId,
        firstName: enriched.firstName,
        lastName: enriched.lastName,
        username: enriched.username,
        photoUrl: enriched.photoUrl,
        role: enriched.role,
        group: enriched.group,
        notifyBefore: enriched.notifyBefore,
        notifyChanges: enriched.notifyChanges,
        activated: enriched.activated,
        banned: enriched.banned,
        isSportTeacher: enriched.isSportTeacher,
        teachingSections: enriched.teachingSections,
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

    // SECURITY: Always verify initData signature — never skip
    if (!BOT_TOKEN || BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
      console.error('SECURITY: BOT_TOKEN not configured, rejecting webapp auth');
      res.status(500).json({ error: 'Сервер не настроен для авторизации' });
      return;
    }

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
          activated: true,
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
          activated: true,
        },
        include: { group: { include: { program: { include: { direction: { include: { institute: true } } } } } } }
      });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    const enriched = await enrichUserWithSportInfo(prisma, user);

    res.json({
      token,
      user: {
        id: enriched.id,
        telegramId: enriched.telegramId,
        firstName: enriched.firstName,
        lastName: enriched.lastName,
        username: enriched.username,
        photoUrl: enriched.photoUrl,
        role: enriched.role,
        groupId: enriched.groupId,
        group: enriched.group,
        notifyBefore: enriched.notifyBefore,
        notifyChanges: enriched.notifyChanges,
        activated: enriched.activated,
        banned: enriched.banned,
        isSportTeacher: enriched.isSportTeacher,
        teachingSections: enriched.teachingSections,
      }
    });
  } catch (err) {
    console.error('WebApp auth error:', err);
    res.status(500).json({ error: 'Ошибка авторизации' });
  }
});

// POST /api/auth/webapp-user — DISABLED (security vulnerability)
// This endpoint was exploited to gain admin access without Telegram verification.
// All auth MUST go through /webapp with proper initData signature verification.
router.post('/webapp-user', (_req: Request, res: Response) => {
  res.status(410).json({ error: 'Этот метод авторизации отключён по соображениям безопасности. Используйте авторизацию через Telegram Mini App.' });
});

// Helper: enrich user object with sport teacher info
// Auto-detects teachers by matching lastName to SportSlot.teacher field
async function enrichUserWithSportInfo(prisma: PrismaClient, user: any) {
  let teachingSections = await prisma.sportTeacher.findMany({
    where: { userId: user.id },
    include: { section: { select: { id: true, name: true, emoji: true } } },
  });

  // Auto-detect: if user's lastName matches a teacher name in sport slots, auto-assign
  // Teacher names in slots are formatted as "Фамилия И.О." (e.g. "Дзигуа Д.В.")
  if (teachingSections.length === 0) {
    const lastName = user.lastName || user.firstName;
    if (lastName && lastName.length >= 3) {
      const matchingSlots = await prisma.sportSlot.findMany({
        where: { teacher: { startsWith: lastName } },
        select: { sectionId: true },
        distinct: ['sectionId'],
      });

      if (matchingSlots.length > 0) {
        for (const slot of matchingSlots) {
          await prisma.sportTeacher.upsert({
            where: { userId_sectionId: { userId: user.id, sectionId: slot.sectionId } },
            update: {},
            create: { userId: user.id, sectionId: slot.sectionId },
          });
        }
        console.log(`🏋️ Auto-assigned teacher "${lastName}" (userId=${user.id}) to ${matchingSlots.length} sections`);
        // Re-fetch
        teachingSections = await prisma.sportTeacher.findMany({
          where: { userId: user.id },
          include: { section: { select: { id: true, name: true, emoji: true } } },
        });
      }
    }
  }

  return {
    ...user,
    isSportTeacher: teachingSections.length > 0,
    teachingSections: teachingSections.map(t => t.section),
  };
}

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
        activated: true,
      },
      include: { group: { include: { program: { include: { direction: { include: { institute: true } } } } } } }
    });
  }

  const enriched = await enrichUserWithSportInfo(prisma, user);
  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: enriched });
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

    const enriched = await enrichUserWithSportInfo(prisma, user);
    res.json({ user: { ...enriched, activated: enriched.activated, banned: enriched.banned } });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
