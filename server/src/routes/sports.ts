import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/sports/sections — All sport sections with slots
router.get('/sections', async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const sections = await prisma.sportSection.findMany({
      include: {
        slots: {
          orderBy: [{ dayOfWeek: 'asc' }, { timeStart: 'asc' }],
        },
        _count: { select: { favorites: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(sections);
  } catch (err) {
    console.error('Sports sections error:', err);
    res.status(500).json({ error: 'Ошибка загрузки секций' });
  }
});

// GET /api/sports/sections/:id — Single section with full details
router.get('/sections/:id', async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const section = await prisma.sportSection.findUnique({
      where: { id: parseInt(String(req.params.id)) },
      include: {
        slots: {
          orderBy: [{ dayOfWeek: 'asc' }, { timeStart: 'asc' }],
        },
        _count: { select: { favorites: true } },
      },
    });
    if (!section) {
      res.status(404).json({ error: 'Секция не найдена' });
      return;
    }
    res.json(section);
  } catch (err) {
    console.error('Sport section error:', err);
    res.status(500).json({ error: 'Ошибка загрузки секции' });
  }
});

// GET /api/sports/schedule — Full schedule grid (day × time → slots)
router.get('/schedule', async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const { day, section } = req.query;

    const where: any = {};
    if (day) where.dayOfWeek = parseInt(day as string);
    if (section) where.sectionId = parseInt(section as string);

    const slots = await prisma.sportSlot.findMany({
      where,
      include: {
        section: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { timeStart: 'asc' }, { section: { name: 'asc' } }],
    });
    res.json(slots);
  } catch (err) {
    console.error('Sports schedule error:', err);
    res.status(500).json({ error: 'Ошибка загрузки расписания' });
  }
});

// POST /api/sports/favorites/:sectionId — Toggle favorite
router.post('/favorites/:sectionId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const sectionId = parseInt(String(req.params.sectionId));
    const userId = req.userId!;

    const existing = await prisma.sportFavorite.findUnique({
      where: { userId_sectionId: { userId, sectionId } },
    });

    if (existing) {
      await prisma.sportFavorite.delete({ where: { id: existing.id } });
      res.json({ favorited: false });
    } else {
      await prisma.sportFavorite.create({ data: { userId, sectionId } });
      res.json({ favorited: true });
    }
  } catch (err) {
    console.error('Favorite toggle error:', err);
    res.status(500).json({ error: 'Ошибка' });
  }
});

// GET /api/sports/favorites — User's favorite sections
router.get('/favorites', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const userId = req.userId!;

    const favorites = await prisma.sportFavorite.findMany({
      where: { userId },
      include: {
        section: {
          include: {
            slots: {
              orderBy: [{ dayOfWeek: 'asc' }, { timeStart: 'asc' }],
            },
          },
        },
      },
    });
    res.json(favorites.map(f => f.section));
  } catch (err) {
    console.error('Favorites error:', err);
    res.status(500).json({ error: 'Ошибка загрузки избранного' });
  }
});

// ===== Admin endpoints =====

// POST /api/sports/admin/sections — Create/update section
router.post('/admin/sections', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (user?.role !== 'admin') {
      res.status(403).json({ error: 'Доступ запрещён' });
      return;
    }

    const { name, emoji } = req.body;
    const section = await prisma.sportSection.upsert({
      where: { name },
      update: { emoji },
      create: { name, emoji },
    });
    res.json(section);
  } catch (err) {
    console.error('Create section error:', err);
    res.status(500).json({ error: 'Ошибка создания секции' });
  }
});

// POST /api/sports/admin/import — Bulk import sports schedule
router.post('/admin/import', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (user?.role !== 'admin') {
      res.status(403).json({ error: 'Доступ запрещён' });
      return;
    }

    const { sections } = req.body;
    // Expected format:
    // sections: [{ name, emoji?, slots: [{ dayOfWeek, timeStart, timeEnd, teacher, location? }] }]

    if (!Array.isArray(sections)) {
      res.status(400).json({ error: 'Неверный формат данных' });
      return;
    }

    let sectionCount = 0;
    let slotCount = 0;

    for (const s of sections) {
      const section = await prisma.sportSection.upsert({
        where: { name: s.name },
        update: { emoji: s.emoji || undefined },
        create: { name: s.name, emoji: s.emoji || null },
      });
      sectionCount++;

      if (Array.isArray(s.slots)) {
        for (const slot of s.slots) {
          await prisma.sportSlot.upsert({
            where: {
              sectionId_dayOfWeek_timeStart: {
                sectionId: section.id,
                dayOfWeek: slot.dayOfWeek,
                timeStart: slot.timeStart,
              },
            },
            update: {
              timeEnd: slot.timeEnd,
              teacher: slot.teacher,
              location: slot.location || null,
              capacity: slot.capacity || null,
            },
            create: {
              sectionId: section.id,
              dayOfWeek: slot.dayOfWeek,
              timeStart: slot.timeStart,
              timeEnd: slot.timeEnd,
              teacher: slot.teacher,
              location: slot.location || null,
              capacity: slot.capacity || null,
            },
          });
          slotCount++;
        }
      }
    }

    res.json({ success: true, sections: sectionCount, slots: slotCount });
  } catch (err) {
    console.error('Sports import error:', err);
    res.status(500).json({ error: 'Ошибка импорта' });
  }
});

// DELETE /api/sports/admin/all — Clear all sports data
router.delete('/admin/all', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (user?.role !== 'admin') {
      res.status(403).json({ error: 'Доступ запрещён' });
      return;
    }

    await prisma.sportFavorite.deleteMany();
    await prisma.sportSlot.deleteMany();
    await prisma.sportSection.deleteMany();

    res.json({ success: true });
  } catch (err) {
    console.error('Sports clear error:', err);
    res.status(500).json({ error: 'Ошибка очистки' });
  }
});

export default router;
