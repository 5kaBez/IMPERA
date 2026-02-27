import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth';
import { parseExcelSchedule } from '../utils/excelParser';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authMiddleware, adminMiddleware);

// GET /api/admin/stats
router.get('/stats', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [users, groups, lessons, institutes, directions, programs, dau, mau] = await Promise.all([
    prisma.user.count(),
    prisma.group.count(),
    prisma.lesson.count(),
    prisma.institute.count(),
    prisma.direction.count(),
    prisma.program.count(),
    prisma.user.count({ where: { updatedAt: { gte: todayStart } } }),
    prisma.user.count({ where: { updatedAt: { gte: thirtyDaysAgo } } }),
  ]);
  res.json({ users, groups, lessons, institutes, directions, programs, dau, mau });
});

// POST /api/admin/import — import Excel/CSV
router.post('/import', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    if (!req.file) {
      res.status(400).json({ error: 'Файл не загружен' });
      return;
    }

    const result = await parseExcelSchedule(req.file.buffer, prisma);
    res.json(result);
  } catch (err: any) {
    console.error('Import error:', err);
    res.status(500).json({ error: `Ошибка импорта: ${err.message}` });
  }
});

// CRUD Institutes
router.get('/institutes', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const items = await prisma.institute.findMany({ include: { _count: { select: { directions: true } } }, orderBy: { name: 'asc' } });
  res.json(items);
});

router.post('/institutes', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const item = await prisma.institute.create({ data: req.body });
  res.json(item);
});

router.put('/institutes/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const item = await prisma.institute.update({ where: { id: parseInt(String(req.params.id)) }, data: req.body });
  res.json(item);
});

router.delete('/institutes/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  await prisma.institute.delete({ where: { id: parseInt(String(req.params.id)) } });
  res.json({ success: true });
});

// CRUD Lessons
router.get('/lessons', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const { groupId, page = '1', limit = '50' } = req.query;
  const where: any = {};
  if (groupId) where.groupId = parseInt(groupId as string);

  const [items, total] = await Promise.all([
    prisma.lesson.findMany({
      where,
      include: { group: true },
      orderBy: [{ dayOfWeek: 'asc' }, { pairNumber: 'asc' }],
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      take: parseInt(limit as string),
    }),
    prisma.lesson.count({ where })
  ]);
  res.json({ items, total, page: parseInt(page as string), totalPages: Math.ceil(total / parseInt(limit as string)) });
});

router.post('/lessons', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const item = await prisma.lesson.create({ data: req.body });
  res.json(item);
});

router.put('/lessons/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const item = await prisma.lesson.update({ where: { id: parseInt(String(req.params.id)) }, data: req.body });
  res.json(item);
});

router.delete('/lessons/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  await prisma.lesson.delete({ where: { id: parseInt(String(req.params.id)) } });
  res.json({ success: true });
});

// Users list
router.get('/users', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const { page = '1', limit = '50' } = req.query;
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      include: { group: { include: { program: { include: { direction: { include: { institute: true } } } } } } },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      take: parseInt(limit as string),
    }),
    prisma.user.count()
  ]);
  res.json({ items, total });
});

export default router;
