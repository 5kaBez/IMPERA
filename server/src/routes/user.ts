import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// PUT /api/user/group — update user's group
router.put('/group', authMiddleware, async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const { groupId } = req.body;

  const user = await prisma.user.update({
    where: { id: req.userId },
    data: { groupId },
    include: { group: { include: { program: { include: { direction: { include: { institute: true } } } } } } }
  });

  res.json({ user });
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
