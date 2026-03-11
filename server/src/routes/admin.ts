import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth';
import { parseExcelSchedule } from '../utils/excelParser';
import { runAutoImport } from '../utils/guuScheduleImporter';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authMiddleware, adminMiddleware);

// GET /api/admin/stats
router.get('/stats', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [users, groups, lessons, institutes, directions, programs, dau, mau, notifyEnabled, feedbackCount, feedbackNew] = await Promise.all([
    prisma.user.count(),
    prisma.group.count(),
    prisma.lesson.count(),
    prisma.institute.count(),
    prisma.direction.count(),
    prisma.program.count(),
    prisma.user.count({ where: { updatedAt: { gte: todayStart } } }),
    prisma.user.count({ where: { updatedAt: { gte: thirtyDaysAgo } } }),
    prisma.user.count({ where: { notifyBefore: true } }),
    prisma.feedback.count(),
    prisma.feedback.count({ where: { status: 'new' } }),
  ]);
  res.json({ users, groups, lessons, institutes, directions, programs, dau, mau, notifyEnabled, feedbackCount, feedbackNew });
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

// DELETE /api/admin/schedule/all — delete only lessons (keep structure & users intact!)
router.delete('/schedule/all', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  try {
    // Only delete lessons — users keep their groups, structure stays for re-import
    const lessons = await prisma.lesson.deleteMany({});

    res.json({
      success: true,
      deleted: lessons.count,
      details: {
        lessons: lessons.count,
      }
    });
  } catch (err: any) {
    console.error('Delete schedule error:', err);
    res.status(500).json({ error: 'Ошибка удаления расписания' });
  }
});

// DELETE /api/admin/schedule/reset — full reset: delete ALL data (lessons + structure), detach users from groups
router.delete('/schedule/reset', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  try {
    // 1. Delete lessons first
    const lessons = await prisma.lesson.deleteMany({});

    // 2. Delete sport attendances and sessions
    const sportAttendances = await prisma.sportAttendance.deleteMany({});
    const sportSessions = await prisma.sportSession.deleteMany({});

    // 3. Detach users from groups (KEEP users safe!)
    await prisma.user.updateMany({ where: { groupId: { not: null } }, data: { groupId: null } });

    // 4. Delete structure (groups, programs, directions, institutes)
    const groups = await prisma.group.deleteMany({});
    const programs = await prisma.program.deleteMany({});
    const directions = await prisma.direction.deleteMany({});
    const institutes = await prisma.institute.deleteMany({});

    res.json({
      success: true,
      deleted: lessons.count,
      details: {
        lessons: lessons.count,
        sportAttendances: sportAttendances.count,
        sportSessions: sportSessions.count,
        groups: groups.count,
        programs: programs.count,
        directions: directions.count,
        institutes: institutes.count,
      }
    });
  } catch (err: any) {
    console.error('Full reset error:', err);
    res.status(500).json({ error: 'Ошибка полного сброса' });
  }
});

// GET /api/admin/feedback — all feedback (admin)
router.get('/feedback', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const { page = '1', limit = '50', status } = req.query;
  const where: any = {};
  if (status && status !== 'all') where.status = status;

  const [items, total] = await Promise.all([
    prisma.feedback.findMany({
      where,
      include: {
        user: {
          select: { firstName: true, lastName: true, username: true, telegramId: true,
            group: { select: { name: true, course: true, number: true } }
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      take: parseInt(limit as string),
    }),
    prisma.feedback.count({ where }),
  ]);
  res.json({ items, total });
});

// PUT /api/admin/feedback/:id — update feedback status/reply
router.put('/feedback/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const id = parseInt(String(req.params.id));
  const { status, reply } = req.body;
  const feedback = await prisma.feedback.update({
    where: { id },
    data: { ...(status && { status }), ...(reply !== undefined && { reply }) },
  });
  res.json(feedback);
});

// Teachers list with reviews
router.get('/teachers', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const teachers = await prisma.teacher.findMany({
    include: {
      reviews: {
        include: {
          user: { select: { firstName: true, lastName: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  const result = teachers.map(t => ({
    ...t,
    avgRating: t.reviews.length > 0
      ? Math.round(t.reviews.reduce((s, r) => s + r.rating, 0) / t.reviews.length * 10) / 10
      : 0,
    reviewCount: t.reviews.length,
  }));

  res.json(result);
});

// DELETE /api/admin/teachers/ghost — delete teachers with 0 reviews (ghost records)
router.delete('/teachers/ghost', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  try {
    // Find teachers with no reviews
    const ghostTeachers = await prisma.teacher.findMany({
      where: { reviews: { none: {} } },
      select: { id: true },
    });

    if (ghostTeachers.length === 0) {
      res.json({ success: true, deleted: 0 });
      return;
    }

    const result = await prisma.teacher.deleteMany({
      where: { id: { in: ghostTeachers.map(t => t.id) } },
    });

    res.json({ success: true, deleted: result.count });
  } catch (err: any) {
    console.error('Ghost teacher cleanup error:', err);
    res.status(500).json({ error: 'Ошибка очистки преподавателей' });
  }
});

// ===== Invite Codes Management =====

// POST /api/admin/invite-codes — create new invite code(s)
// POST /api/admin/invite-codes — Generate beta invite codes (admin only)
// Note: These are for administrative distribution, typically one-time use
router.post('/invite-codes', authMiddleware, async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  
  // Check if user is admin
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Admin only' });
    return;
  }

  const { count = 1 } = req.body;
  const qty = Math.min(Math.max(1, Number(count) || 1), 50);

  const created: Array<{ code: string; id: number }> = [];
  for (let i = 0; i < qty; i++) {
    // Generate unique 6-digit numeric code
    let code: string;
    let exists = true;
    let attempts = 0;
    do {
      code = Math.floor(100000 + Math.random() * 900000).toString();
      const found = await prisma.inviteCode.findUnique({ where: { code } });
      exists = !!found;
      attempts++;
    } while (exists && attempts < 10);

    if (!exists) {
      const adminId = req.userId || 1;
      const newCode = await prisma.inviteCode.create({
        data: {
          code,
          creatorId: adminId,
        }
      });
      created.push({ code: newCode.code, id: newCode.id });
    }
  }

  res.json({ success: true, created, count: created.length });
});

// DELETE /api/admin/invite-codes/:id — delete unused invite code
router.delete('/invite-codes/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;

  // Check if user is admin
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Admin only' });
    return;
  }

  const id = parseInt(String(req.params.id));
  const code = await prisma.inviteCode.findUnique({ where: { id } });
  if (!code) {
    res.status(404).json({ error: 'Код не найден' });
    return;
  }
  if (code.usedAt) {
    res.status(400).json({ error: 'Нельзя удалить использованный код' });
    return;
  }
  await prisma.inviteCode.delete({ where: { id } });
  res.json({ success: true });
});

// POST /api/admin/invite-codes/clear — delete all invite codes and reset generation stats
router.post('/invite-codes/clear', authMiddleware, async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Admin only' });
    return;
  }

  const deleted = await prisma.inviteCode.deleteMany({});
  const resetUsers = await prisma.user.updateMany({
    data: {
      lastCodeGeneration: null,
      codesGeneratedTotal: 0,
    },
  });

  console.log(`🧹 Admin ${user.id} cleared ${deleted.count} invite codes`);

  res.json({
    success: true,
    cleared: deleted.count,
    usersReset: resetUsers.count,
  });
});

// GET /api/admin/invite-codes — List all invite codes with filters
router.get('/invite-codes', authMiddleware, async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;

  // Check if user is admin
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Admin only' });
    return;
  }

  const { filter = 'all', creatorId, limit = 100 } = req.query;

  const whereClause: any = {};
  if (filter === 'active') {
    whereClause.usedAt = null;
  } else if (filter === 'used') {
    whereClause.usedAt = { not: null };
  }
  if (creatorId) {
    whereClause.creatorId = parseInt(String(creatorId));
  }

  const codes = await prisma.inviteCode.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    take: Math.min(parseInt(String(limit)) || 100, 1000),
  });

  // Fetch creator/usedBy for each code
  const codesWithInfo = await Promise.all(
    codes.map(async (code) => {
      const creator = code.creatorId 
        ? await prisma.user.findUnique({ 
            where: { id: code.creatorId },
            select: { id: true, firstName: true, lastName: true }
          })
        : null;
      
      const usedBy = code.usedById
        ? await prisma.user.findUnique({
            where: { id: code.usedById },
            select: { id: true, firstName: true, lastName: true }
          })
        : null;

      return { ...code, creator, usedBy };
    })
  );

  // Calculate stats
  const totalCodes = await prisma.inviteCode.count();
  const usedCodes = await prisma.inviteCode.count({ where: { usedAt: { not: null } } });
  const activeCodes = totalCodes - usedCodes;

  res.json({
    codes: codesWithInfo,
    stats: {
      total: totalCodes,
      active: activeCodes,
      used: usedCodes,
      average_lifetime_hours: 
        usedCodes > 0 
          ? Math.round(
              codes
                .filter(c => c.usedAt)
                .reduce((sum, c) => {
                  const lifetime = (c.usedAt!.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60);
                  return sum + lifetime;
                }, 0) / usedCodes
            )
          : 0,
    }
  });
});

// POST /api/admin/invite-codes/reset-users — set all non-admin users to activated=false
router.post('/invite-codes/reset-users', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const result = await prisma.user.updateMany({
    where: { role: { not: 'admin' }, activated: true },
    data: { activated: false },
  });
  res.json({ success: true, updated: result.count });
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

// ===== Auto-Import from GUU =====

// POST /api/admin/auto-import — trigger auto-import from guu.ru
router.post('/auto-import', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  try {
    // Don't await — return immediately, import runs in background
    const result = await runAutoImport(prisma, 'manual');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/import-history — list past imports
router.get('/import-history', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const { limit = '20' } = req.query;
  const items = await prisma.scheduleImport.findMany({
    orderBy: { startedAt: 'desc' },
    take: parseInt(limit as string),
  });
  res.json(items);
});

// GET /api/admin/import-history/:id/download — download saved xlsx
router.get('/import-history/:id/download', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const id = parseInt(String(req.params.id));
  const record = await prisma.scheduleImport.findUnique({ where: { id } });

  if (!record?.filePath) {
    res.status(404).json({ error: 'Файл не найден' });
    return;
  }

  const filePath = path.join(process.cwd(), 'imports', record.filePath);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Файл не найден на диске' });
    return;
  }

  res.download(filePath, record.filePath);
});

// PUT /api/admin/users/:id/ban — ban or unban user
router.put('/users/:id/ban', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const id = parseInt(String(req.params.id));
  const { banned } = req.body;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    res.status(404).json({ error: 'Пользователь не найден' });
    return;
  }
  if (user.role === 'admin') {
    res.status(400).json({ error: 'Нельзя заблокировать админа' });
    return;
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { banned: !!banned },
  });

  res.json({ success: true, banned: updated.banned });
});

// ===== Invite Code Settings =====

// GET /api/admin/settings/invites — Get invite code settings
router.get('/settings/invites', authMiddleware, async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;

  // Check if user is admin
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Admin only' });
    return;
  }

  const settings = await prisma.adminSettings.findFirst();
  res.json(settings || { inviteCooldownHours: 24, maxActiveCodesPerUser: 5 });
});

// POST /api/admin/settings/invites — Update invite code settings
router.post('/settings/invites', authMiddleware, async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;

  // Check if user is admin
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Admin only' });
    return;
  }

  const { inviteCooldownHours, maxActiveCodesPerUser } = req.body;

  const settings = await prisma.adminSettings.upsert({
    where: { id: 1 },
    update: {
      inviteCooldownHours: inviteCooldownHours || undefined,
      maxActiveCodesPerUser: maxActiveCodesPerUser || undefined,
    },
    create: {
      id: 1,
      inviteCooldownHours: inviteCooldownHours || 24,
      maxActiveCodesPerUser: maxActiveCodesPerUser || 5,
    },
  });

  res.json({ success: true, settings });
});

// POST /api/admin/users/:id/reset-invite-cooldown — Force reset invite code cooldown for user
router.post('/users/:id/reset-invite-cooldown', authMiddleware, async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;

  // Check if user is admin
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Admin only' });
    return;
  }

  const targetUserId = parseInt(String(req.params.id));
  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });

  if (!targetUser) {
    res.status(404).json({ error: 'Пользователь не найден' });
    return;
  }

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: { lastCodeGeneration: null } as any,
  });

  console.log(`⏱️ Invite cooldown reset for user ${updated.firstName} (id: ${updated.id})`);

  res.json({
    success: true,
    message: `Cooldown сброшен для ${updated.firstName}`,
    user: {
      id: updated.id,
      firstName: updated.firstName,
      lastCodeGeneration: (updated as any).lastCodeGeneration,
    }
  });
});

export default router;
