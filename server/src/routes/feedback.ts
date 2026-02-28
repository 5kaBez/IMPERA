import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/feedback — submit feedback (any authenticated user)
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const { type, message } = req.body;

  if (!message || !message.trim()) {
    res.status(400).json({ error: 'Сообщение не может быть пустым' });
    return;
  }

  const feedback = await prisma.feedback.create({
    data: {
      userId: req.userId!,
      type: type || 'suggestion',
      message: message.trim(),
    },
    include: { user: { select: { firstName: true, lastName: true, username: true } } },
  });

  res.json(feedback);
});

// GET /api/feedback — user's own feedback
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const feedbacks = await prisma.feedback.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(feedbacks);
});

export default router;
