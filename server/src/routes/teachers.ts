import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/teachers/by-name?name=... — get or create teacher by name, with reviews
router.get('/by-name', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const name = String(req.query.name || '').trim();

  if (!name) {
    res.status(400).json({ error: 'Имя преподавателя не указано' });
    return;
  }

  let teacher = await prisma.teacher.findUnique({
    where: { name },
    include: {
      reviews: {
        include: {
          user: { select: { firstName: true, lastName: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!teacher) {
    teacher = await prisma.teacher.create({
      data: { name },
      include: {
        reviews: {
          include: {
            user: { select: { firstName: true, lastName: true, username: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  // Calculate average rating
  const ratings = teacher.reviews.map(r => r.rating);
  const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  res.json({
    ...teacher,
    avgRating: Math.round(avgRating * 10) / 10,
    reviewCount: ratings.length,
  });
});

// POST /api/teachers/:teacherId/reviews — add review
router.post('/:teacherId/reviews', authMiddleware, async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const teacherId = parseInt(String(req.params.teacherId));
  const { rating, text, anonymous } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    res.status(400).json({ error: 'Оценка должна быть от 1 до 5' });
    return;
  }

  try {
    const review = await prisma.review.upsert({
      where: { teacherId_userId: { teacherId, userId: req.userId! } },
      update: { rating, text: text || null, anonymous: anonymous !== false },
      create: {
        teacherId,
        userId: req.userId!,
        rating,
        text: text || null,
        anonymous: anonymous !== false,
      },
      include: {
        user: { select: { firstName: true, lastName: true, username: true } },
      },
    });
    res.json(review);
  } catch (err) {
    console.error('Review error:', err);
    res.status(500).json({ error: 'Ошибка при сохранении отзыва' });
  }
});

// GET /api/teachers/:teacherId — teacher details with reviews
router.get('/:teacherId', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const teacherId = parseInt(String(req.params.teacherId));

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    include: {
      reviews: {
        include: {
          user: { select: { firstName: true, lastName: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!teacher) {
    res.status(404).json({ error: 'Преподаватель не найден' });
    return;
  }

  const ratings = teacher.reviews.map(r => r.rating);
  const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  res.json({
    ...teacher,
    avgRating: Math.round(avgRating * 10) / 10,
    reviewCount: ratings.length,
  });
});

export default router;
