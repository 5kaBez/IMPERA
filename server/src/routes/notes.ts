import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

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

export default router;
