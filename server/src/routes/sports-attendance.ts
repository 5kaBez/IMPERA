import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth';
import {
  generateCode,
  verifyCode,
  secondsUntilNextCode,
  generateSessionSecret,
  computeAttendanceHash,
  verifyAttendanceChain,
} from '../utils/sportCrypto';

const router = Router();
const REQUIRED_CLASSES = 25; // Количество занятий за семестр

// =============================================
//  ПРЕПОДАВАТЕЛЬ — управление сессиями
// =============================================

// POST /start-session — Преподаватель начинает занятие
router.post('/start-session', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const userId = req.userId!;
    const { sectionId, slotId } = req.body;

    if (!sectionId) {
      res.status(400).json({ error: 'Укажите секцию' });
      return;
    }

    // Проверяем: этот юзер — преподаватель этой секции (или админ)?
    const isAdmin = req.userRole === 'admin';
    if (!isAdmin) {
      const teaching = await prisma.sportTeacher.findUnique({
        where: { userId_sectionId: { userId, sectionId } },
      });
      if (!teaching) {
        res.status(403).json({ error: 'Вы не преподаватель этой секции' });
        return;
      }
    }

    // Проверяем: нет ли уже активной сессии у этого преподавателя?
    const activeSession = await prisma.sportSession.findFirst({
      where: { teacherId: userId, status: 'active' },
    });
    if (activeSession) {
      res.status(409).json({
        error: 'У вас уже есть активное занятие',
        sessionId: activeSession.id,
      });
      return;
    }

    // Создаём сессию с секретом для ротирующих кодов
    const session = await prisma.sportSession.create({
      data: {
        sectionId,
        slotId: slotId || null,
        teacherId: userId,
        secretSeed: generateSessionSecret(),
      },
      include: { section: true },
    });

    const code = generateCode(session.secretSeed);
    const ttl = secondsUntilNextCode();

    res.json({
      sessionId: session.id,
      section: session.section.name,
      code,
      ttl,
      startedAt: session.startedAt,
    });
  } catch (err) {
    console.error('Start session error:', err);
    res.status(500).json({ error: 'Ошибка создания сессии' });
  }
});

// GET /session/:id/code — Получить текущий код (для экрана преподавателя)
router.get('/session/:id/code', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const sessionId = parseInt(String(req.params.id));

    const session = await prisma.sportSession.findUnique({
      where: { id: sessionId },
      include: {
        section: true,
        attendances: {
          include: { student: { select: { id: true, firstName: true, lastName: true, username: true } } },
          orderBy: { checkedInAt: 'asc' },
        },
      },
    });

    if (!session) {
      res.status(404).json({ error: 'Сессия не найдена' });
      return;
    }

    // Только преподаватель сессии или админ
    if (session.teacherId !== req.userId && req.userRole !== 'admin') {
      res.status(403).json({ error: 'Доступ запрещён' });
      return;
    }

    if (session.status !== 'active') {
      res.status(400).json({ error: 'Сессия уже завершена', status: session.status });
      return;
    }

    const code = generateCode(session.secretSeed);
    const ttl = secondsUntilNextCode();

    res.json({
      sessionId: session.id,
      section: session.section.name,
      sectionEmoji: session.section.emoji,
      code,
      ttl,
      status: session.status,
      startedAt: session.startedAt,
      students: session.attendances.map(a => ({
        id: a.student.id,
        firstName: a.student.firstName,
        lastName: a.student.lastName,
        username: a.student.username,
        status: a.status,
        checkedInAt: a.checkedInAt,
      })),
      studentCount: session.attendances.length,
    });
  } catch (err) {
    console.error('Get code error:', err);
    res.status(500).json({ error: 'Ошибка' });
  }
});

// POST /session/:id/end — Завершить занятие + подтвердить список
router.post('/session/:id/end', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const sessionId = parseInt(String(req.params.id));
    const { confirmedStudentIds } = req.body; // массив ID студентов, которых подтверждаем

    const session = await prisma.sportSession.findUnique({
      where: { id: sessionId },
      include: { attendances: true },
    });

    if (!session) {
      res.status(404).json({ error: 'Сессия не найдена' });
      return;
    }
    if (session.teacherId !== req.userId && req.userRole !== 'admin') {
      res.status(403).json({ error: 'Доступ запрещён' });
      return;
    }
    if (session.status !== 'active') {
      res.status(400).json({ error: 'Сессия уже завершена' });
      return;
    }

    const now = new Date();
    const confirmed = Array.isArray(confirmedStudentIds) ? confirmedStudentIds : [];

    // Обновляем статусы: confirmed для подтверждённых, rejected для остальных
    for (const attendance of session.attendances) {
      const isConfirmed = confirmed.includes(attendance.studentId);
      await prisma.sportAttendance.update({
        where: { id: attendance.id },
        data: {
          status: isConfirmed ? 'confirmed' : 'rejected',
          confirmedAt: isConfirmed ? now : null,
        },
      });
    }

    // Закрываем сессию
    await prisma.sportSession.update({
      where: { id: sessionId },
      data: { status: 'completed', endedAt: now },
    });

    res.json({
      success: true,
      confirmed: confirmed.length,
      rejected: session.attendances.length - confirmed.length,
    });
  } catch (err) {
    console.error('End session error:', err);
    res.status(500).json({ error: 'Ошибка завершения сессии' });
  }
});

// POST /session/:id/cancel — Отменить занятие
router.post('/session/:id/cancel', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const sessionId = parseInt(String(req.params.id));

    const session = await prisma.sportSession.findUnique({ where: { id: sessionId } });
    if (!session || (session.teacherId !== req.userId && req.userRole !== 'admin')) {
      res.status(403).json({ error: 'Доступ запрещён' });
      return;
    }

    await prisma.sportAttendance.updateMany({
      where: { sessionId },
      data: { status: 'rejected' },
    });

    await prisma.sportSession.update({
      where: { id: sessionId },
      data: { status: 'cancelled', endedAt: new Date() },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Cancel session error:', err);
    res.status(500).json({ error: 'Ошибка' });
  }
});

// GET /my-sessions — Список сессий преподавателя (текущие и прошлые)
router.get('/my-sessions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const sessions = await prisma.sportSession.findMany({
      where: { teacherId: req.userId! },
      include: {
        section: true,
        _count: { select: { attendances: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });

    res.json(sessions.map(s => ({
      id: s.id,
      section: s.section.name,
      sectionEmoji: s.section.emoji,
      status: s.status,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      studentCount: s._count.attendances,
    })));
  } catch (err) {
    console.error('My sessions error:', err);
    res.status(500).json({ error: 'Ошибка' });
  }
});

// =============================================
//  СТУДЕНТ — отметка и прогресс
// =============================================

// POST /checkin — Студент вводит код и отмечается
router.post('/checkin', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const studentId = req.userId!;
    const { code } = req.body;

    if (!code || typeof code !== 'string' || code.length !== 6) {
      res.status(400).json({ error: 'Введите 6-значный код' });
      return;
    }

    // Ищем активную сессию, чей код совпадает
    const activeSessions = await prisma.sportSession.findMany({
      where: { status: 'active' },
    });

    let matchedSession = null;
    for (const session of activeSessions) {
      if (verifyCode(session.secretSeed, code)) {
        matchedSession = session;
        break;
      }
    }

    if (!matchedSession) {
      res.status(400).json({ error: 'Неверный или просроченный код' });
      return;
    }

    // Проверяем: студент уже не отмечен?
    const existing = await prisma.sportAttendance.findUnique({
      where: {
        sessionId_studentId: {
          sessionId: matchedSession.id,
          studentId,
        },
      },
    });

    if (existing) {
      res.status(409).json({ error: 'Вы уже отметились на этом занятии' });
      return;
    }

    // Нельзя отмечаться преподавателю на своём занятии
    if (matchedSession.teacherId === studentId) {
      res.status(400).json({ error: 'Преподаватель не может отметиться на своём занятии' });
      return;
    }

    // Получаем предыдущий хеш для цепочки
    const lastAttendance = await prisma.sportAttendance.findFirst({
      where: { studentId },
      orderBy: { checkedInAt: 'desc' },
    });

    const now = new Date();
    const prevHash = lastAttendance?.hash || null;
    const hash = computeAttendanceHash(studentId, matchedSession.id, now.toISOString(), prevHash);

    // Записываем посещение
    const attendance = await prisma.sportAttendance.create({
      data: {
        sessionId: matchedSession.id,
        studentId,
        hash,
        prevHash,
        checkedInAt: now,
      },
      include: { session: { include: { section: true } } },
    });

    // Считаем прогресс
    const confirmedCount = await prisma.sportAttendance.count({
      where: { studentId, status: 'confirmed' },
    });
    // pending тоже считаем (пока не отклонены)
    const pendingCount = await prisma.sportAttendance.count({
      where: { studentId, status: 'pending' },
    });

    res.json({
      success: true,
      section: attendance.session.section.name,
      sectionEmoji: attendance.session.section.emoji,
      checkedInAt: attendance.checkedInAt,
      progress: {
        confirmed: confirmedCount,
        pending: pendingCount,
        total: confirmedCount + pendingCount,
        required: REQUIRED_CLASSES,
      },
    });
  } catch (err) {
    console.error('Checkin error:', err);
    res.status(500).json({ error: 'Ошибка отметки' });
  }
});

// GET /my-progress — Прогресс студента (X/25)
router.get('/my-progress', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const studentId = req.userId!;

    const [confirmed, pending, rejected] = await Promise.all([
      prisma.sportAttendance.count({ where: { studentId, status: 'confirmed' } }),
      prisma.sportAttendance.count({ where: { studentId, status: 'pending' } }),
      prisma.sportAttendance.count({ where: { studentId, status: 'rejected' } }),
    ]);

    res.json({
      confirmed,
      pending,
      rejected,
      total: confirmed + pending,
      required: REQUIRED_CLASSES,
      percentage: Math.round((confirmed / REQUIRED_CLASSES) * 100),
      completed: confirmed >= REQUIRED_CLASSES,
    });
  } catch (err) {
    console.error('Progress error:', err);
    res.status(500).json({ error: 'Ошибка' });
  }
});

// GET /my-attendance — История посещений студента
router.get('/my-attendance', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const studentId = req.userId!;

    const attendances = await prisma.sportAttendance.findMany({
      where: { studentId },
      include: {
        session: {
          include: {
            section: true,
            teacher: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { checkedInAt: 'desc' },
    });

    res.json(attendances.map(a => ({
      id: a.id,
      section: a.session.section.name,
      sectionEmoji: a.session.section.emoji,
      teacher: `${a.session.teacher.firstName} ${a.session.teacher.lastName || ''}`.trim(),
      status: a.status,
      checkedInAt: a.checkedInAt,
      confirmedAt: a.confirmedAt,
    })));
  } catch (err) {
    console.error('My attendance error:', err);
    res.status(500).json({ error: 'Ошибка' });
  }
});

// =============================================
//  АДМИН — аудит и управление
// =============================================

// GET /admin/student-search?q=Иванов — Поиск студента
router.get('/admin/student-search', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const q = (req.query.q as string) || '';

    if (q.length < 2) {
      res.status(400).json({ error: 'Минимум 2 символа для поиска' });
      return;
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { username: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: {
        group: { include: { program: { include: { direction: { include: { institute: true } } } } } },
        sportAttendances: {
          where: { status: 'confirmed' },
          include: {
            session: { include: { section: true } },
          },
          orderBy: { checkedInAt: 'desc' },
        },
        _count: {
          select: {
            sportAttendances: { where: { status: 'confirmed' } },
          },
        },
      },
      take: 20,
    });

    res.json(users.map(u => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      username: u.username,
      telegramId: u.telegramId,
      group: u.group?.name,
      course: u.group?.course,
      confirmedClasses: u._count.sportAttendances,
      required: REQUIRED_CLASSES,
      percentage: Math.round((u._count.sportAttendances / REQUIRED_CLASSES) * 100),
      recentAttendance: u.sportAttendances.slice(0, 5).map(a => ({
        section: a.session.section.name,
        date: a.checkedInAt,
      })),
    })));
  } catch (err) {
    console.error('Student search error:', err);
    res.status(500).json({ error: 'Ошибка поиска' });
  }
});

// GET /admin/integrity/:studentId — Проверить целостность хеш-цепочки
router.get('/admin/integrity/:studentId', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const studentId = parseInt(String(req.params.studentId));

    const records = await prisma.sportAttendance.findMany({
      where: { studentId },
      orderBy: { checkedInAt: 'asc' },
      select: {
        id: true,
        studentId: true,
        sessionId: true,
        checkedInAt: true,
        hash: true,
        prevHash: true,
      },
    });

    const result = verifyAttendanceChain(records);

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { firstName: true, lastName: true, username: true },
    });

    res.json({
      student: student ? `${student.firstName} ${student.lastName || ''}`.trim() : 'Unknown',
      username: student?.username,
      ...result,
    });
  } catch (err) {
    console.error('Integrity check error:', err);
    res.status(500).json({ error: 'Ошибка проверки' });
  }
});

// GET /admin/stats — Статистика по физкультуре
router.get('/admin/stats', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;

    const [
      totalSessions,
      activeSessions,
      totalAttendances,
      confirmedAttendances,
      teacherCount,
      studentsWithAttendance,
    ] = await Promise.all([
      prisma.sportSession.count(),
      prisma.sportSession.count({ where: { status: 'active' } }),
      prisma.sportAttendance.count(),
      prisma.sportAttendance.count({ where: { status: 'confirmed' } }),
      prisma.sportTeacher.count(),
      prisma.sportAttendance.groupBy({ by: ['studentId'], where: { status: 'confirmed' } }).then(g => g.length),
    ]);

    // Студенты, закрывшие физкультуру (>=25)
    const completedStudents = await prisma.sportAttendance.groupBy({
      by: ['studentId'],
      where: { status: 'confirmed' },
      _count: true,
    }).then(groups => groups.filter(g => g._count >= REQUIRED_CLASSES).length);

    res.json({
      totalSessions,
      activeSessions,
      totalAttendances,
      confirmedAttendances,
      teacherCount,
      studentsWithAttendance,
      completedStudents,
      requiredClasses: REQUIRED_CLASSES,
    });
  } catch (err) {
    console.error('Sports stats error:', err);
    res.status(500).json({ error: 'Ошибка' });
  }
});

// POST /admin/teachers — Назначить преподавателя секции
router.post('/admin/teachers', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const { telegramId, sectionId } = req.body;

    if (!telegramId || !sectionId) {
      res.status(400).json({ error: 'Укажите telegramId и sectionId' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { telegramId: String(telegramId) } });
    if (!user) {
      res.status(404).json({ error: 'Пользователь не найден. Он должен сначала зайти в бота.' });
      return;
    }

    const teacher = await prisma.sportTeacher.upsert({
      where: { userId_sectionId: { userId: user.id, sectionId } },
      update: {},
      create: { userId: user.id, sectionId },
      include: { section: true, user: { select: { firstName: true, lastName: true, username: true } } },
    });

    res.json({
      success: true,
      teacher: {
        userId: teacher.userId,
        name: `${teacher.user.firstName} ${teacher.user.lastName || ''}`.trim(),
        username: teacher.user.username,
        section: teacher.section.name,
      },
    });
  } catch (err) {
    console.error('Add teacher error:', err);
    res.status(500).json({ error: 'Ошибка' });
  }
});

// GET /admin/teachers — Список преподавателей физры
router.get('/admin/teachers', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;

    const teachers = await prisma.sportTeacher.findMany({
      include: {
        user: { select: { id: true, firstName: true, lastName: true, username: true, telegramId: true } },
        section: true,
      },
      orderBy: { section: { name: 'asc' } },
    });

    res.json(teachers.map(t => ({
      id: t.id,
      userId: t.user.id,
      firstName: t.user.firstName,
      lastName: t.user.lastName,
      username: t.user.username,
      telegramId: t.user.telegramId,
      section: t.section.name,
      sectionId: t.section.id,
      sectionEmoji: t.section.emoji,
    })));
  } catch (err) {
    console.error('List teachers error:', err);
    res.status(500).json({ error: 'Ошибка' });
  }
});

// DELETE /admin/teachers/:id — Убрать преподавателя
router.delete('/admin/teachers/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    await prisma.sportTeacher.delete({ where: { id: parseInt(String(req.params.id)) } });
    res.json({ success: true });
  } catch (err) {
    console.error('Remove teacher error:', err);
    res.status(500).json({ error: 'Ошибка' });
  }
});

// GET /admin/sessions — Все сессии (для аудита)
router.get('/admin/sessions', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const sessions = await prisma.sportSession.findMany({
      include: {
        section: true,
        teacher: { select: { firstName: true, lastName: true, username: true } },
        _count: { select: { attendances: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });

    res.json(sessions.map(s => ({
      id: s.id,
      section: s.section.name,
      sectionEmoji: s.section.emoji,
      teacher: `${s.teacher.firstName} ${s.teacher.lastName || ''}`.trim(),
      teacherUsername: s.teacher.username,
      status: s.status,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      studentCount: s._count.attendances,
    })));
  } catch (err) {
    console.error('Admin sessions error:', err);
    res.status(500).json({ error: 'Ошибка' });
  }
});

export default router;
