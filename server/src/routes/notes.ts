import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// File upload config — max 10MB, stored in /uploads/notes/
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads/notes');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
      const ext = path.extname(file.originalname);
      cb(null, unique + ext);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

const router = Router();

// Хелпер: получить список заблокированных юзеров
async function getBlockedIds(prisma: PrismaClient, userId: number): Promise<number[]> {
  const blocks = await prisma.blockedUser.findMany({
    where: { userId },
    select: { blockedUserId: true },
  });
  return blocks.map(b => b.blockedUserId);
}

// Общий include для заметок — с автором для shared
const noteInclude = {
  lesson: { select: { id: true, subject: true, timeStart: true, pairNumber: true } },
  user: { select: { id: true, firstName: true, lastName: true, avatarId: true, username: true } },
  attachments: { select: { id: true, fileName: true, fileSize: true, mimeType: true, createdAt: true } },
};

// GET /api/notes/date/:date — заметки на конкретную дату (личные + shared группы)
router.get('/date/:date', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const dateStr = String(req.params.date); // "2026-03-14"
    const dateStart = new Date(dateStr + 'T00:00:00.000Z');
    const dateEnd = new Date(dateStr + 'T23:59:59.999Z');

    if (isNaN(dateStart.getTime())) {
      res.status(400).json({ error: 'Невалидная дата' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { groupId: true },
    });

    const blockedIds = await getBlockedIds(prisma, req.userId!);

    const notes = await prisma.note.findMany({
      where: {
        date: { gte: dateStart, lte: dateEnd },
        OR: [
          // Мои заметки (любые)
          { userId: req.userId },
          // Публичные заметки одногруппников
          ...(user?.groupId ? [{
            groupId: user.groupId,
            isPublic: true,
            userId: { not: req.userId!, ...(blockedIds.length ? { notIn: blockedIds } : {}) },
          }] : []),
          // Заметки от преподавателя (teacher role)
          ...(user?.groupId ? [{ groupId: user.groupId, authorRole: 'teacher' as const }] : []),
        ],
      },
      include: noteInclude,
      orderBy: { createdAt: 'asc' },
    });

    res.json({ notes });
  } catch (err) {
    console.error('Error fetching notes by date:', err);
    res.status(500).json({ error: 'Ошибка при получении заметок' });
  }
});

// GET /api/notes/lesson/:lessonId — заметки на конкретную пару
router.get('/lesson/:lessonId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const lessonId = parseInt(String(req.params.lessonId));

    if (isNaN(lessonId)) {
      res.status(400).json({ error: 'Невалидный ID урока' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { groupId: true },
    });

    const blockedIds = await getBlockedIds(prisma, req.userId!);

    const notes = await prisma.note.findMany({
      where: {
        lessonId,
        OR: [
          { userId: req.userId },
          ...(user?.groupId ? [{
            groupId: user.groupId,
            isPublic: true,
            userId: { not: req.userId!, ...(blockedIds.length ? { notIn: blockedIds } : {}) },
          }] : []),
          ...(user?.groupId ? [{ groupId: user.groupId, authorRole: 'teacher' as const }] : []),
        ],
      },
      include: noteInclude,
      orderBy: { createdAt: 'asc' },
    });

    res.json({ notes });
  } catch (err) {
    console.error('Error fetching notes by lesson:', err);
    res.status(500).json({ error: 'Ошибка при получении заметок' });
  }
});

// POST /api/notes — создать заметку
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const { lessonId, date, title, text, notifyAt, isPublic } = req.body;

    if (!title || !date) {
      res.status(400).json({ error: 'Заголовок и дата обязательны' });
      return;
    }

    const parsedDate = new Date(date.split('T')[0] + 'T00:00:00.000Z');
    if (isNaN(parsedDate.getTime())) {
      res.status(400).json({ error: 'Невалидная дата' });
      return;
    }

    // Если привязано к уроку — проверяем что урок существует
    if (lessonId) {
      const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
      if (!lesson) {
        res.status(404).json({ error: 'Урок не найден' });
        return;
      }
    }

    // Если public — автоматически привязываем к группе
    let groupId: number | null = null;
    if (isPublic) {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { groupId: true },
      });
      groupId = user?.groupId || null;
    }

    const note = await prisma.note.create({
      data: {
        userId: req.userId!,
        lessonId: lessonId || null,
        date: parsedDate,
        title: String(title).slice(0, 100),
        text: text ? String(text).slice(0, 2000) : null,
        notifyAt: notifyAt ? new Date(notifyAt) : null,
        isPublic: !!isPublic,
        groupId,
        authorRole: 'student',
      },
      include: noteInclude,
    });

    res.json({ note });
  } catch (err) {
    console.error('Error creating note:', err);
    res.status(500).json({ error: 'Ошибка при создании заметки' });
  }
});

// PUT /api/notes/:id — обновить заметку
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const noteId = parseInt(String(req.params.id));
    const { title, text, notifyAt, isPublic } = req.body;

    // Проверяем владельца
    const existing = await prisma.note.findUnique({ where: { id: noteId } });
    if (!existing) {
      res.status(404).json({ error: 'Заметка не найдена' });
      return;
    }
    if (existing.userId !== req.userId) {
      res.status(403).json({ error: 'Нет доступа к этой заметке' });
      return;
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = String(title).slice(0, 100);
    if (text !== undefined) updateData.text = text ? String(text).slice(0, 2000) : null;
    if (notifyAt !== undefined) {
      updateData.notifyAt = notifyAt ? new Date(notifyAt) : null;
      updateData.notified = false; // Сброс при смене времени напоминания
    }

    // Toggle public/private
    if (isPublic !== undefined) {
      updateData.isPublic = !!isPublic;
      if (isPublic) {
        // Привязываем к группе при публикации
        const user = await prisma.user.findUnique({
          where: { id: req.userId },
          select: { groupId: true },
        });
        updateData.groupId = user?.groupId || null;
      } else {
        // Убираем из группы при скрытии
        updateData.groupId = null;
      }
    }

    const note = await prisma.note.update({
      where: { id: noteId },
      data: updateData,
      include: noteInclude,
    });

    res.json({ note });
  } catch (err) {
    console.error('Error updating note:', err);
    res.status(500).json({ error: 'Ошибка при обновлении заметки' });
  }
});

// DELETE /api/notes/:id — удалить заметку
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const noteId = parseInt(String(req.params.id));

    const existing = await prisma.note.findUnique({ where: { id: noteId } });
    if (!existing) {
      res.status(404).json({ error: 'Заметка не найдена' });
      return;
    }
    if (existing.userId !== req.userId) {
      res.status(403).json({ error: 'Нет доступа к этой заметке' });
      return;
    }

    await prisma.note.delete({ where: { id: noteId } });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting note:', err);
    res.status(500).json({ error: 'Ошибка при удалении заметки' });
  }
});

// ── File Attachments ──

// POST /api/notes/:id/attachments — upload file(s)
router.post('/:id/attachments', authMiddleware, upload.array('files', 5), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const noteId = parseInt(String(req.params.id));
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({ error: 'Файл не загружен' });
      return;
    }

    // Verify note ownership
    const note = await prisma.note.findUnique({ where: { id: noteId } });
    if (!note) { res.status(404).json({ error: 'Заметка не найдена' }); return; }
    if (note.userId !== req.userId) { res.status(403).json({ error: 'Нет доступа' }); return; }

    // Check total attachments (max 5 per note)
    const existingCount = await prisma.noteAttachment.count({ where: { noteId } });
    if (existingCount + files.length > 5) {
      // Clean up uploaded files
      files.forEach(f => fs.unlinkSync(f.path));
      res.status(400).json({ error: `Максимум 5 файлов. Уже прикреплено: ${existingCount}` });
      return;
    }

    const attachments = await Promise.all(files.map(f => {
      // multer decodes originalname as latin1; convert to proper UTF-8
      const fileName = Buffer.from(f.originalname, 'latin1').toString('utf8');
      return prisma.noteAttachment.create({
        data: {
          noteId,
          fileName,
          fileSize: f.size,
          mimeType: f.mimetype,
          filePath: f.filename, // stored relative name
        },
        select: { id: true, fileName: true, fileSize: true, mimeType: true, createdAt: true },
      });
    }));

    res.json({ attachments });
  } catch (err) {
    console.error('Error uploading attachment:', err);
    res.status(500).json({ error: 'Ошибка загрузки файла' });
  }
});

// Auth middleware that also accepts ?token= query param (for direct download links in Telegram WebView)
function downloadAuth(req: AuthRequest, res: Response, next: Function) {
  if (!req.headers.authorization && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  return authMiddleware(req, res, next as any);
}

// GET /api/notes/attachments/:attachmentId — download file
router.get('/attachments/:attachmentId', downloadAuth, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const attachmentId = parseInt(String(req.params.attachmentId));

    const attachment = await prisma.noteAttachment.findUnique({
      where: { id: attachmentId },
      include: { note: { select: { userId: true, isPublic: true, groupId: true, authorRole: true } } },
    });

    if (!attachment) { res.status(404).json({ error: 'Файл не найден' }); return; }

    // Access check: owner OR public/teacher note from same group
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { groupId: true } });
    const isOwner = attachment.note.userId === req.userId;
    const sameGroup = !!attachment.note.groupId && !!user?.groupId && user.groupId === attachment.note.groupId;
    const isGroupmate = sameGroup && (attachment.note.isPublic || attachment.note.authorRole === 'teacher');

    if (!isOwner && !isGroupmate) { res.status(403).json({ error: 'Нет доступа' }); return; }

    const filePath = path.join(UPLOADS_DIR, attachment.filePath);
    if (!fs.existsSync(filePath)) { res.status(404).json({ error: 'Файл не найден на диске' }); return; }

    // RFC 5987: proper non-ASCII filename encoding
    const encodedName = encodeURIComponent(attachment.fileName).replace(/['()]/g, escape);
    res.setHeader('Content-Disposition', `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`);
    // Add charset for text files to prevent encoding issues
    const contentType = attachment.mimeType.startsWith('text/')
      ? `${attachment.mimeType}; charset=utf-8`
      : attachment.mimeType;
    res.setHeader('Content-Type', contentType);
    res.sendFile(filePath);
  } catch (err) {
    console.error('Error downloading attachment:', err);
    res.status(500).json({ error: 'Ошибка скачивания файла' });
  }
});

// DELETE /api/notes/attachments/:attachmentId — delete file
router.delete('/attachments/:attachmentId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const attachmentId = parseInt(String(req.params.attachmentId));

    const attachment = await prisma.noteAttachment.findUnique({
      where: { id: attachmentId },
      include: { note: { select: { userId: true } } },
    });

    if (!attachment) { res.status(404).json({ error: 'Файл не найден' }); return; }
    if (attachment.note.userId !== req.userId) { res.status(403).json({ error: 'Нет доступа' }); return; }

    // Delete from disk
    const filePath = path.join(UPLOADS_DIR, attachment.filePath);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.noteAttachment.delete({ where: { id: attachmentId } });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting attachment:', err);
    res.status(500).json({ error: 'Ошибка удаления файла' });
  }
});

export default router;
