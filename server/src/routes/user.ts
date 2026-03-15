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

export default router;
