import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { spawnSync, execSync } from 'child_process';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { parseExcelSchedule } from '../utils/excelParser';
import { runAutoImport } from '../utils/guuScheduleImporter';
import { safeImportScheduleFromExcel, importPreformedSchedule, type SafeImportResult } from '../utils/scheduleImporter';
import { readMaintenanceSettings, updateMaintenanceSettings } from '../utils/maintenance';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authMiddleware, adminMiddleware);

// Security audit logging — log all admin actions
router.use((req: Request, _res: Response, next) => {
  const authReq = req as any;
  const userId = authReq.userId || 'unknown';
  const method = req.method;
  const path = req.path;
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  console.log(`🔐 [ADMIN AUDIT] userId=${userId} ${method} ${path} IP=${ip} ${new Date().toISOString()}`);
  next();
});

// GET /api/admin/settings/maintenance — maintenance banner settings
router.get('/settings/maintenance', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(readMaintenanceSettings());
});

// POST /api/admin/settings/maintenance — update maintenance banner settings
router.post('/settings/maintenance', (req: Request, res: Response) => {
  const enabled = (req.body as any)?.enabled;
  const message = (req.body as any)?.message;

  if (enabled !== undefined && typeof enabled !== 'boolean') {
    res.status(400).json({ error: 'enabled must be boolean' });
    return;
  }
  if (message !== undefined && typeof message !== 'string') {
    res.status(400).json({ error: 'message must be string' });
    return;
  }

  const updated = updateMaintenanceSettings({
    enabled: typeof enabled === 'boolean' ? enabled : undefined,
    message: typeof message === 'string' ? message.trim().slice(0, 200) : undefined,
  });

  res.json(updated);
});

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

// POST /api/admin/import-safe — безопасный импорт с сохранением пользователей
// Поддерживает файлы: 1.xlsx, 2.xlsx, 3.xlsx, 4.xlsx, z.xlsx, m.xlsx
// Или один файл schedule_full.xlsx
router.post('/import-safe', upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const files = req.files as Express.Multer.File[] | undefined;
    
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'Файлы не загружены' });
      return;
    }

    // Конвертируем Multer файлы в FileInput для парсера
    const fileInputs = files.map((file: Express.Multer.File) => ({
      filename: file.originalname,
      buffer: file.buffer,
    }));

    // Выполняем безопасный импорт
    const result = await safeImportScheduleFromExcel(fileInputs, prisma);
    res.json(result);
  } catch (err: any) {
    console.error('Safe import error:', err);
    res.status(500).json({
      success: false,
      error: `Ошибка безопасного импорта: ${err.message}`,
    });
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

// DELETE /api/admin/structure/prune — delete unused structure only (keeps students' chosen groups intact)
// Query: ?dryRun=1 to preview counts without deleting
router.delete('/structure/prune', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const dryRun = String(req.query.dryRun || '') === '1' || String(req.query.dryRun || '').toLowerCase() === 'true';
  const confirm = String(req.query.confirm || '');

  try {
    if (dryRun) {
      const [groups, programs, directions, institutes] = await prisma.$transaction([
        prisma.group.count({ where: { users: { none: {} } } }),
        prisma.program.count({ where: { groups: { every: { users: { none: {} } } } } }),
        prisma.direction.count({ where: { programs: { every: { groups: { every: { users: { none: {} } } } } } } }),
        prisma.institute.count({ where: { directions: { every: { programs: { every: { groups: { every: { users: { none: {} } } } } } } } } }),
      ]);

      res.json({
        success: true,
        dryRun: true,
        wouldDelete: { groups, programs, directions, institutes },
      });
      return;
    }

    if (!(confirm === 'PRUNE' || confirm === '1' || confirm.toLowerCase() === 'true')) {
      res.status(400).json({
        success: false,
        error: 'Нужно подтверждение. Повторите запрос с ?confirm=PRUNE (или сначала сделайте ?dryRun=1).',
      });
      return;
    }

    const deleted = await prisma.$transaction(async (tx) => {
      const groups = await tx.group.deleteMany({ where: { users: { none: {} } } });
      const programs = await tx.program.deleteMany({ where: { groups: { none: {} } } });
      const directions = await tx.direction.deleteMany({ where: { programs: { none: {} } } });
      const institutes = await tx.institute.deleteMany({ where: { directions: { none: {} } } });

      return {
        groups: groups.count,
        programs: programs.count,
        directions: directions.count,
        institutes: institutes.count,
      };
    });

    res.json({ success: true, dryRun: false, deleted });
  } catch (err: any) {
    console.error('Prune structure error:', err);
    res.status(500).json({ success: false, error: 'Ошибка очистки структуры (prune)' });
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

// DELETE /api/admin/feedback/:id — delete feedback
router.delete('/feedback/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const id = parseInt(String(req.params.id));
  try {
    const feedback = await prisma.feedback.delete({
      where: { id },
    });
    res.json({ success: true, feedback });
  } catch (err: any) {
    res.status(400).json({ error: 'Не удалось удалить отзыв' });
  }
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

// DELETE /api/admin/reviews/:id — delete a review
router.delete('/reviews/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const id = parseInt(String(req.params.id));
  try {
    console.log(`Deleting review ${id}`);
    const review = await prisma.review.delete({
      where: { id },
    });
    console.log(`Review ${id} deleted successfully`);
    res.json({ success: true, review });
  } catch (err: any) {
    console.error(`Error deleting review ${id}:`, err.message);
    res.status(400).json({ error: `Не удалось удалить отзыв: ${err.message}` });
  }
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

// ===== Notes (admin view) =====

// GET /api/admin/notes — all notes grouped by group
router.get('/notes', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  try {
    const { groupId, page = '1', limit = '50' } = req.query;
    const where: any = {};
    if (groupId) where.groupId = parseInt(groupId as string);

    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, username: true, avatarId: true, telegramId: true } },
          lesson: { select: { id: true, subject: true, timeStart: true, pairNumber: true } },
          group: { select: { id: true, name: true, course: true, number: true } },
          attachments: { select: { id: true, fileName: true, fileSize: true, mimeType: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
      }),
      prisma.note.count({ where }),
    ]);

    // Get groups that have notes for sidebar filter
    const groupsWithNotes = await prisma.group.findMany({
      where: { notes: { some: {} } },
      select: { id: true, name: true, course: true, number: true, _count: { select: { notes: true } } },
      orderBy: { name: 'asc' },
    });

    res.json({ notes, total, groups: groupsWithNotes, page: parseInt(page as string) });
  } catch (err: any) {
    console.error('Admin notes error:', err);
    res.status(500).json({ error: 'Ошибка получения заметок' });
  }
});

// DELETE /api/admin/notes/:id — admin delete any note
router.delete('/notes/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const noteId = parseInt(String(req.params.id));
  try {
    // Delete attachments from disk first
    const attachments = await prisma.noteAttachment.findMany({
      where: { noteId },
      select: { filePath: true },
    });
    for (const att of attachments) {
      const fp = path.join(process.cwd(), 'uploads', 'notes', att.filePath);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }

    await prisma.note.delete({ where: { id: noteId } });
    res.json({ success: true });
  } catch (err: any) {
    console.error('Admin delete note error:', err);
    res.status(500).json({ error: 'Ошибка удаления заметки' });
  }
});

// ===== Backup Routes =====

// Helper: Get or create backups directory
function ensureBackupDir(): string {
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
}

// Helper: Generate backup filename
function generateBackupName(): string {
  const now = new Date();
  return `backup-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}.sql`;
}

// GET /api/admin/backup/list — list all backups
router.get('/backup/list', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  try {
    // Check if Backup table exists
    try {
      const backups = await prisma.backup.findMany({
        orderBy: { createdAt: 'desc' },
      });
      res.json({ backups });
    } catch (tableErr: any) {
      if (tableErr.code === 'P3019' || tableErr.message?.includes('does not exist')) {
        return res.status(503).json({
          error: 'Таблица бекапов не инициализирована. Запустите миграцию: npx prisma migrate deploy',
        });
      }
      throw tableErr;
    }
  } catch (err: any) {
    console.error('Backup list error:', err);
    res.status(500).json({ error: `Ошибка получения списка бекапов: ${err.message}` });
  }
});

// POST /api/admin/backup/create — create backup
router.post('/backup/create', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  try {
    // Check if Backup table exists
    try {
      await prisma.$queryRaw`SELECT 1 FROM "Backup" LIMIT 1`;
    } catch (tableErr: any) {
      return res.status(503).json({
        error: 'Таблица бекапов не инициализирована. Запустите миграцию: npx prisma migrate deploy',
      });
    }

    const backupDir = ensureBackupDir();
    const backupName = generateBackupName();
    const backupPath = path.join(backupDir, backupName);

    // Get database connection string from environment
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      res.status(500).json({ error: 'DATABASE_URL не установлена' });
      return;
    }

    // Try to find pg_dump in common locations
    let pgDumpCmd = 'pg_dump';
    const commonPaths = [
      '/usr/bin/pg_dump',
      '/usr/local/bin/pg_dump',
      'C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe',
    ];

    for (const cmdPath of commonPaths) {
      try {
        if (fs.existsSync(cmdPath)) {
          pgDumpCmd = cmdPath;
          break;
        }
      } catch (e) {
        // continue
      }
    }

    // Create backup using pg_dump
    let result;
    try {
      result = spawnSync(pgDumpCmd, [dbUrl, '-Fc', '-f', backupPath], {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (spawnErr: any) {
      console.error('spawnSync error:', spawnErr);
      return res.status(500).json({
        error: `pg_dump не найден. Убедитесь что PostgreSQL-клиенты установлены на сервере: ${spawnErr.message}`,
      });
    }

    if (result.error) {
      console.error('pg_dump error:', result.error);
      res.status(500).json({
        error: `pg_dump ошибка: ${result.error.message || result.error}`,
      });
      return;
    }

    if (result.status !== 0) {
      console.error('pg_dump stderr:', result.stderr);
      res.status(500).json({
        error: `Ошибка создания бекапа (код ${result.status}): ${result.stderr || 'Неизвестная ошибка'}`,
      });
      return;
    }

    // Check if file was created
    if (!fs.existsSync(backupPath) || fs.statSync(backupPath).size === 0) {
      res.status(500).json({ error: 'Файл бекапа не был создан' });
      return;
    }

    // Get file size
    const stats = fs.statSync(backupPath);
    const fileSize = stats.size;

    // Get current counts
    const [userCount, groupCount, lessonCount] = await Promise.all([
      prisma.user.count(),
      prisma.group.count(),
      prisma.lesson.count(),
    ]);

    // Record in database
    const backup = await prisma.backup.create({
      data: {
        name: backupName,
        fileSize,
        userCount,
        groupCount,
        lessonCount,
        source: 'manual',
        filePath: backupPath,
      },
    });

    res.json({ success: true, backup, message: 'Резервная копия создана' });
  } catch (err: any) {
    console.error('Backup create error:', err);
    res.status(500).json({
      error: `Ошибка создания бекапа: ${err.message || 'Неизвестная ошибка'}`,
    });
  }
});

// GET /api/admin/backup/download/:id — download backup file
router.get('/backup/download/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  try {
    const id = parseInt(String(req.params.id));
    const backup = await prisma.backup.findUnique({ where: { id } });

    if (!backup) {
      res.status(404).json({ error: 'Бекап не найден' });
      return;
    }

    if (!fs.existsSync(backup.filePath)) {
      res.status(404).json({ error: 'Файл бекапа не найден на диске' });
      return;
    }

    res.download(backup.filePath, backup.name);
  } catch (err: any) {
    console.error('Backup download error:', err);
    res.status(500).json({ error: 'Ошибка скачивания бекапа' });
  }
});

// POST /api/admin/backup/restore/:id — restore from backup
router.post('/backup/restore/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  try {
    const id = parseInt(String(req.params.id));
    const { confirm } = req.body;

    if (!confirm) {
      res.status(400).json({ error: 'Требуется подтверждение (confirm: true)' });
      return;
    }

    const backup = await prisma.backup.findUnique({ where: { id } });
    if (!backup) {
      res.status(404).json({ error: 'Бекап не найден' });
      return;
    }

    if (!fs.existsSync(backup.filePath)) {
      res.status(404).json({ error: 'Файл бекапа не найден на диске' });
      return;
    }

    // Get database connection string
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      res.status(500).json({ error: 'DATABASE_URL не установлена' });
      return;
    }

    // Restore database using pg_restore
    const result = spawnSync('pg_restore', ['-Fc', '-d', dbUrl, '--clean', backup.filePath], {
      encoding: 'utf-8',
    });

    if (result.error) {
      console.error('pg_restore error:', result.error);
      res.status(500).json({ error: 'Ошибка восстановления бекапа: pg_restore failed' });
      return;
    }

    if (result.status !== 0) {
      console.error('pg_restore stderr:', result.stderr);
      res.status(500).json({ error: `Ошибка восстановления бекапа: ${result.stderr}` });
      return;
    }

    // Increment restoreCount
    await prisma.backup.update({
      where: { id },
      data: { restoredCount: backup.restoredCount + 1 },
    });

    res.json({
      success: true,
      message: 'Бекап восстановлен. Перезагрузите приложение.',
      requiresRestart: true,
    });
  } catch (err: any) {
    console.error('Backup restore error:', err);
    res.status(500).json({ error: 'Ошибка восстановления бекапа' });
  }
});

// DELETE /api/admin/backup/:id — delete backup file and record
router.delete('/backup/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  try {
    const id = parseInt(String(req.params.id));
    const backup = await prisma.backup.findUnique({ where: { id } });

    if (!backup) {
      res.status(404).json({ error: 'Бекап не найден' });
      return;
    }

    // Delete file from disk
    if (fs.existsSync(backup.filePath)) {
      fs.unlinkSync(backup.filePath);
    }

    // Delete record from database
    await prisma.backup.delete({ where: { id } });

    res.json({ success: true, message: 'Бекап удалён' });
  } catch (err: any) {
    console.error('Backup delete error:', err);
    res.status(500).json({ error: 'Ошибка удаления бекапа' });
  }
});

export default router;
