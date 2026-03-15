import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// PUT /api/user/group — update user's group
router.put('/group', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const { groupId } = req.body;

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { groupId: groupId ?? null },
      include: { group: { include: { program: { include: { direction: { include: { institute: true } } } } } } }
    });

    res.json({ user });
  } catch (err) {
    console.error('Error updating user group:', err);
    res.status(500).json({ error: 'Ошибка при обновлении группы' });
  }
});

// PUT /api/user/notifications — update notification settings
router.put('/notifications', authMiddleware, async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const { notifyBefore, notifyChanges } = req.body;

  const user = await prisma.user.update({
    where: { id: req.userId },
    data: { notifyBefore, notifyChanges }
  });

  res.json({ user });
});

// PUT /api/user/avatar — update user's avatar
router.put('/avatar', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const { avatarId } = req.body;

    if (typeof avatarId !== 'number' || avatarId < 0 || avatarId > 8) {
      return res.status(400).json({ error: 'avatarId must be 0-8' });
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { avatarId },
      include: { group: { include: { program: { include: { direction: { include: { institute: true } } } } } } }
    });

    res.json({ user });
  } catch (err) {
    console.error('Error updating avatar:', err);
    res.status(500).json({ error: 'Ошибка при обновлении аватарки' });
  }
});

// GET /api/user/profile — get full profile
router.get('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: { group: { include: { program: { include: { direction: { include: { institute: true } } } } } } }
  });
  res.json({ user });
});

// ===== Блокировка пользователей =====

// GET /api/user/blocked — список заблокированных
router.get('/blocked', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const blocks = await prisma.blockedUser.findMany({
      where: { userId: req.userId! },
    });

    // Подгрузим инфо о заблокированных юзерах
    const blockedUserIds = blocks.map(b => b.blockedUserId);
    const users = blockedUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: blockedUserIds } },
          select: { id: true, firstName: true, lastName: true, avatarId: true },
        })
      : [];

    res.json({ blocked: users });
  } catch (err) {
    console.error('Error fetching blocked users:', err);
    res.status(500).json({ error: 'Ошибка' });
  }
});

// POST /api/user/block/:userId — заблокировать пользователя
router.post('/block/:userId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const blockedUserId = parseInt(String(req.params.userId));

    if (isNaN(blockedUserId) || blockedUserId === req.userId) {
      res.status(400).json({ error: 'Невалидный ID' });
      return;
    }

    await prisma.blockedUser.upsert({
      where: { userId_blockedUserId: { userId: req.userId!, blockedUserId } },
      create: { userId: req.userId!, blockedUserId },
      update: {},
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error blocking user:', err);
    res.status(500).json({ error: 'Ошибка при блокировке' });
  }
});

// DELETE /api/user/block/:userId — разблокировать пользователя
router.delete('/block/:userId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const blockedUserId = parseInt(String(req.params.userId));

    await prisma.blockedUser.deleteMany({
      where: { userId: req.userId!, blockedUserId },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error unblocking user:', err);
    res.status(500).json({ error: 'Ошибка при разблокировке' });
  }
});

export default router;
