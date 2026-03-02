import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth';
import {
  computeAttendanceHash,
  verifyAttendanceChain,
  checkGeo,
} from '../utils/sportCrypto';

const router = Router();
const REQUIRED_CLASSES = 25;

// =============================================
//  ЗАПИСЬ НА СЕКЦИЮ (enrollment)
// =============================================

// POST /enroll — Записаться на секцию
router.post('/enroll', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const userId = req.userId!;
    const { sectionId } = req.body;

    if (!sectionId) {
      res.status(400).json({ error: 'Укажите секцию' });
      return;
    }

    // Убираем старую запись (можно быть только в одной секции)
    await prisma.sportEnrollment.deleteMany({ where: { userId } });

    const enrollment = await prisma.sportEnrollment.create({
      data: { userId, sectionId },
      include: { section: true },
    });

    res.json({
      ok: true,
      section: {
        id: enrollment.section.id,
        name: enrollment.section.name,
        emoji: enrollment.section.emoji,
      },
    });
  } catch (err) {
    console.error('Enroll error:', err);
    res.status(500).json({ error: 'Ошибка записи' });
  }
});

// DELETE /enroll — Отписаться от секции
router.delete('/enroll', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    await prisma.sportEnrollment.deleteMany({ where: { userId: req.userId! } });
    res.json({ ok: true });
  } catch (err) {
    console.error('Unenroll error:', err);
    res.status(500).json({ error: 'Ошибка' });
  }
});

// GET /my-enrollment — Текущая запись студента
router.get('/my-enrollment', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const enrollment = await prisma.sportEnrollment.findFirst({
      where: { userId: req.userId! },
      include: { section: true },
    });
    res.json(enrollment);
  } catch (err) {
    console.error('My enrollment error:', err);
    res.status(500).json({ error: 'Ошибка' });
  }
});

// =============================================
//  СТУДЕНТ — "Я на месте" + активная сессия
// =============================================

// GET /my-active-session — Есть ли активная сессия по моей секции?
router.get('/my-active-session', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const userId = req.userId!;

    const enrollment = await prisma.sportEnrollment.findFirst({ where: { userId } });
    if (!enrollment) {
      res.json(null);
      return;
    }

    const session = await prisma.sportSession.findFirst({
      where: { sectionId: enrollment.sectionId, status: 'active' },
      include: { section: true, slot: true, teacher: { select: { firstName: true, lastName: true } } },
    });
    if (!session) {
      res.json(null);
      return;
    }

    // Уже отмечен?
    const att = await prisma.sportAttendance.findUnique({
      where: { sessionId_studentId: { sessionId: session.id, studentId: userId } },
    });

    res.json({
      sessionId: session.id,
      section: session.section.name,
      emoji: session.section.emoji,
      location: session.slot?.location || undefined,
      teacher: `${session.teacher.firstName} ${session.teacher.lastName || ''}`.trim(),
      done: !!att,
      status: att?.status || null,
      geoOk: att?.geoOk ?? null,
    });
  } catch (err) {
    console.error('My active session error:', err);
    res.status(500).json({ error: 'Ошибка' });
  }
});

// POST /checkin — "Я на месте" (гео + device fingerprint + хеш-цепочка)
router.post('/checkin', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const studentId = req.userId!;
    const { sessionId, geoLat, geoLon, deviceHash } = req.body;

    if (!sessionId) {
      res.status(400).json({ error: 'Укажите сессию' });
      return;
    }

    const session = await prisma.sportSession.findUnique({
      where: { id: sessionId },
      include: { section: true },
    });

    if (!session) {
      res.status(404).json({ error: 'Сессия не найдена' });
      return;
    }
    if (session.status !== 'active') {
      res.status(400).json({ error: 'Сессия завершена' });
      return;
    }

    // Слой 1: Проверка enrollment — студент записан на эту секцию?
    const enrollment = await prisma.sportEnrollment.findFirst({
      where: { userId: studentId, sectionId: session.sectionId },
    });
    if (!enrollment) {
      res.status(403).json({ error: 'Вы не записаны на эту секцию' });
      return;
    }

    // Не дубликат?
    const existing = await prisma.sportAttendance.findUnique({
      where: { sessionId_studentId: { sessionId: session.id, studentId } },
    });
    if (existing) {
      res.status(409).json({ error: 'Вы уже отметились на этом занятии' });
      return;
    }

    // Нельзя преподу
    if (session.teacherId === studentId) {
      res.status(400).json({ error: 'Преподаватель не может отметиться на своём занятии' });
      return;
    }

    // Слой 3: Device fingerprint — 1 телефон = 1 студент
    if (deviceHash) {
      const sameDevice = await prisma.sportAttendance.findFirst({
        where: { sessionId: session.id, deviceHash, NOT: { studentId } },
      });
      if (sameDevice) {
        res.status(403).json({ error: 'Это устройство уже использовано другим студентом!' });
        return;
      }
    }

    // Слой 2: Геолокация 1км (мягкая проверка)
    const { dist, geoOk } = checkGeo(
      geoLat ?? null, geoLon ?? null,
      session.section.geoLat, session.section.geoLon
    );

    // Слой 5: Хеш-цепочка
    const lastAtt = await prisma.sportAttendance.findFirst({
      where: { studentId },
      orderBy: { checkedInAt: 'desc' },
    });

    const now = new Date();
    const prevHash = lastAtt?.hash || null;
    const hash = computeAttendanceHash(studentId, session.id, now.toISOString(), prevHash);

    // Записываем
    await prisma.sportAttendance.create({
      data: {
        sessionId: session.id,
        studentId,
        geoLat: geoLat ?? null,
        geoLon: geoLon ?? null,
        geoDistM: dist >= 0 ? dist : null,
        geoOk,
        deviceHash: deviceHash || null,
        hash,
        prevHash,
        checkedInAt: now,
      },
    });

    // Считаем прогресс
    const [confirmed, pending] = await Promise.all([
      prisma.sportAttendance.count({ where: { studentId, status: 'confirmed' } }),
      prisma.sportAttendance.count({ where: { studentId, status: 'pending' } }),
    ]);

    res.json({
      success: true,
      section: session.section.name,
      sectionEmoji: session.section.emoji,
      geoOk,
      dist: dist >= 0 ? dist : null,
      progress: { confirmed, pending, total: confirmed + pending, required: REQUIRED_CLASSES },
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

// GET /my-attendance — История посещений студента (с гео)
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
      geoOk: a.geoOk,
      geoDistM: a.geoDistM,
      checkedInAt: a.checkedInAt,
      confirmedAt: a.confirmedAt,
    })));
  } catch (err) {
    console.error('My attendance error:', err);
    res.status(500).json({ error: 'Ошибка' });
  }
});

// =============================================
//  ПРЕПОДАВАТЕЛЬ — управление сессиями
// =============================================

// GET /my-teacher-session — Есть ли активная сессия (для resume после перезахода)
router.get('/my-teacher-session', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const session = await prisma.sportSession.findFirst({
      where: { teacherId: req.userId!, status: 'active' },
      include: { section: true },
    });
    if (!session) {
      res.json(null);
      return;
    }
    res.json({
      sessionId: session.id,
      section: session.section.name,
      sectionEmoji: session.section.emoji,
    });
  } catch (err) {
    console.error('My teacher session error:', err);
    res.status(500).json({ error: 'Ошибка' });
  }
});

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

    // Проверяем: преподаватель этой секции (или админ)?
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

    // Нет ли уже активной?
    const active = await prisma.sportSession.findFirst({
      where: { teacherId: userId, status: 'active' },
    });
    if (active) {
      res.status(409).json({ error: 'У вас уже есть активное занятие', sessionId: active.id });
      return;
    }

    const session = await prisma.sportSession.create({
      data: { sectionId, slotId: slotId || null, teacherId: userId },
      include: { section: true },
    });

    res.json({
      sessionId: session.id,
      section: session.section.name,
      sectionEmoji: session.section.emoji,
      startedAt: session.startedAt,
    });
  } catch (err) {
    console.error('Start session error:', err);
    res.status(500).json({ error: 'Ошибка создания сессии' });
  }
});

// GET /session/:id — Получить данные сессии (список студентов с гео)
router.get('/session/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
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

    if (session.teacherId !== req.userId && req.userRole !== 'admin') {
      res.status(403).json({ error: 'Доступ запрещён' });
      return;
    }

    res.json({
      sessionId: session.id,
      section: session.section.name,
      sectionEmoji: session.section.emoji,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      students: session.attendances.map(a => ({
        id: a.student.id,
        firstName: a.student.firstName,
        lastName: a.student.lastName,
        username: a.student.username,
        status: a.status,
        geoOk: a.geoOk,
        geoDistM: a.geoDistM,
        checkedInAt: a.checkedInAt,
      })),
      studentCount: session.attendances.length,
    });
  } catch (err) {
    console.error('Get session error:', err);
    res.status(500).json({ error: 'Ошибка' });
  }
});

// POST /session/:id/end — Завершить занятие + подтвердить список
router.post('/session/:id/end', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const sessionId = parseInt(String(req.params.id));
    const { confirmedStudentIds } = req.body;

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

    for (const att of session.attendances) {
      const isConfirmed = confirmed.includes(att.studentId);
      await prisma.sportAttendance.update({
        where: { id: att.id },
        data: {
          status: isConfirmed ? 'confirmed' : 'rejected',
          confirmedAt: isConfirmed ? now : null,
        },
      });
    }

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

// GET /my-sessions — Список сессий преподавателя
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
//  АДМИН — аудит и управление
// =============================================

// GET /admin/student-search?q=Иванов
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
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { username: { contains: q } },
        ],
      },
      include: {
        group: true,
        sportEnrollments: { include: { section: true } },
        _count: { select: { sportAttendances: { where: { status: 'confirmed' } } } },
      },
      take: 20,
    });

    // Добавляем гео-флаги
    const result = await Promise.all(users.map(async u => {
      const geoFlags = await prisma.sportAttendance.count({
        where: { studentId: u.id, geoOk: false },
      });
      return {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        username: u.username,
        telegramId: u.telegramId,
        group: u.group?.name,
        course: u.group?.course,
        section: u.sportEnrollments[0]?.section?.name || null,
        sectionEmoji: u.sportEnrollments[0]?.section?.emoji,
        confirmedClasses: u._count.sportAttendances,
        geoFlags,
        required: REQUIRED_CLASSES,
        percentage: Math.round((u._count.sportAttendances / REQUIRED_CLASSES) * 100),
      };
    }));

    res.json(result);
  } catch (err) {
    console.error('Student search error:', err);
    res.status(500).json({ error: 'Ошибка поиска' });
  }
});

// GET /admin/integrity/:studentId — Проверить хеш-цепочку
router.get('/admin/integrity/:studentId', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const studentId = parseInt(String(req.params.studentId));

    const records = await prisma.sportAttendance.findMany({
      where: { studentId },
      orderBy: { checkedInAt: 'asc' },
      select: { id: true, studentId: true, sessionId: true, checkedInAt: true, hash: true, prevHash: true },
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

// GET /admin/stats — Статистика
router.get('/admin/stats', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;

    const [totalSessions, activeSessions, totalAttendances, confirmedAttendances, teacherCount, studentsWithAttendance, enrollmentCount] = await Promise.all([
      prisma.sportSession.count(),
      prisma.sportSession.count({ where: { status: 'active' } }),
      prisma.sportAttendance.count(),
      prisma.sportAttendance.count({ where: { status: 'confirmed' } }),
      prisma.sportTeacher.count(),
      prisma.sportAttendance.groupBy({ by: ['studentId'], where: { status: 'confirmed' } }).then(g => g.length),
      prisma.sportEnrollment.count(),
    ]);

    const completedStudents = await prisma.sportAttendance.groupBy({
      by: ['studentId'],
      where: { status: 'confirmed' },
      _count: true,
    }).then(groups => groups.filter(g => g._count >= REQUIRED_CLASSES).length);

    res.json({
      totalSessions, activeSessions, totalAttendances, confirmedAttendances,
      teacherCount, studentsWithAttendance, completedStudents, enrollmentCount,
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

// GET /admin/teachers
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
      id: t.id, userId: t.user.id,
      firstName: t.user.firstName, lastName: t.user.lastName,
      username: t.user.username, telegramId: t.user.telegramId,
      section: t.section.name, sectionId: t.section.id, sectionEmoji: t.section.emoji,
    })));
  } catch (err) {
    console.error('List teachers error:', err);
    res.status(500).json({ error: 'Ошибка' });
  }
});

// DELETE /admin/teachers/:id
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

// GET /admin/sessions — Все сессии (с гео-флагами)
router.get('/admin/sessions', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const sessions = await prisma.sportSession.findMany({
      include: {
        section: true,
        teacher: { select: { firstName: true, lastName: true, username: true } },
        _count: { select: { attendances: true } },
        attendances: { where: { geoOk: false }, select: { id: true } },
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
      geoFlags: s.attendances.length,
    })));
  } catch (err) {
    console.error('Admin sessions error:', err);
    res.status(500).json({ error: 'Ошибка' });
  }
});

export default router;
