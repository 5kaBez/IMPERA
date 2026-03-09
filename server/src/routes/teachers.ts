import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'impera-secret-change-in-production';

// Helper: check if request is from admin (optional auth)
function isAdminRequest(req: Request): boolean {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return false;
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; role: string };
    return decoded.role === 'admin';
  } catch { return false; }
}

// Helper: strip user info from reviews for non-admin (all reviews appear anonymous)
function anonymizeReviews(reviews: any[], isAdmin: boolean) {
  if (isAdmin) return reviews;
  return reviews.map(r => ({
    ...r,
    anonymous: true,
    user: undefined,
  }));
}

// GET /api/teachers/by-name?name=... — lookup teacher by name (NO auto-create!)
router.get('/by-name', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const name = String(req.query.name || '').trim();
  const admin = isAdminRequest(req);

  if (!name) {
    res.status(400).json({ error: 'Имя преподавателя не указано' });
    return;
  }

  const teacher = await prisma.teacher.findUnique({
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
    res.json({
      id: null,
      name,
      reviews: [],
      avgRating: 0,
      reviewCount: 0,
    });
    return;
  }

  const ratings = teacher.reviews.map(r => r.rating);
  const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  res.json({
    ...teacher,
    reviews: anonymizeReviews(teacher.reviews, admin),
    avgRating: Math.round(avgRating * 10) / 10,
    reviewCount: ratings.length,
  });
});

// POST /api/teachers/reviews — submit review (creates teacher if needed)
router.post('/reviews', authMiddleware, async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const { teacherName, teacherId, rating, text, anonymous } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    res.status(400).json({ error: 'Оценка должна быть от 1 до 5' });
    return;
  }

  try {
    // Resolve or create teacher
    let resolvedTeacherId = teacherId;
    if (!resolvedTeacherId && teacherName) {
      const teacher = await prisma.teacher.upsert({
        where: { name: teacherName.trim() },
        update: {},
        create: { name: teacherName.trim() },
      });
      resolvedTeacherId = teacher.id;
    }

    if (!resolvedTeacherId) {
      res.status(400).json({ error: 'Не указан преподаватель' });
      return;
    }

    const review = await prisma.review.upsert({
      where: { teacherId_userId: { teacherId: resolvedTeacherId, userId: req.userId! } },
      update: { rating, text: text || null, anonymous: anonymous !== false },
      create: {
        teacherId: resolvedTeacherId,
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

// POST /api/teachers/:teacherId/reviews — legacy endpoint (backward compatible)
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
  const admin = isAdminRequest(req);

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
    reviews: anonymizeReviews(teacher.reviews, admin),
    avgRating: Math.round(avgRating * 10) / 10,
    reviewCount: ratings.length,
  });
});

export default router;
