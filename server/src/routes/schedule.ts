import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();

// ---- Moscow timezone helpers ----
// VPS работает в UTC, ГУУ в Москве (UTC+3)
function getMoscowDate(date?: Date): Date {
  const d = date ? new Date(date) : new Date();
  // Convert UTC to Moscow time (UTC+3)
  // JavaScript Date stores time in UTC internally, so we just add 3 hours
  return new Date(d.getTime() + 3 * 60 * 60 * 1000);
}

// Начало семестра: 9 февраля 2026 (понедельник)
// Это 00:00:00 московского времени
const SEMESTER_START_MOSCOW = new Date(Date.UTC(2026, 1, 8, 21, 0, 0)); // 9 фев 00:00 МСК = 8 фев 21:00 UTC

function getSemesterWeekNumber(moscowDate?: Date): number {
  const now = moscowDate || getMoscowDate();
  const startMs = SEMESTER_START_MOSCOW.getTime();
  const nowMs = now.getTime();
  const diffMs = nowMs - startMs;
  if (diffMs < 0) return 1;
  const weekNum = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
  return weekNum > 18 ? ((weekNum - 1) % 18) + 1 : weekNum;
}

function getSemesterWeekParity(moscowDate?: Date): number {
  const weekNum = getSemesterWeekNumber(moscowDate);
  return weekNum % 2 === 1 ? 1 : 0;
}

function getDayOfWeek(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day; // 1=Пн ... 7=Вс
}

function parseTime(timeStr: string): { hours: number; minutes: number } | null {
  if (!timeStr) return null;
  const match = timeStr.match(/^(\d{1,2})[:\.](\d{2})/);
  if (!match) return null;
  return { hours: parseInt(match[1]), minutes: parseInt(match[2]) };
}

// GET /api/schedule/:groupId/today
router.get('/:groupId/today', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const groupId = parseInt(String(req.params.groupId));
  const now = getMoscowDate();
  const dayOfWeek = getDayOfWeek(now);
  const parity = getSemesterWeekParity(now);
  const weekNum = getSemesterWeekNumber(now);

  const lessons = await prisma.lesson.findMany({
    where: {
      groupId,
      dayOfWeek,
      OR: [{ parity }, { parity: 2 }],
      weekStart: { lte: weekNum },
      weekEnd: { gte: weekNum },
    },
    orderBy: { pairNumber: 'asc' }
  });

  res.json({ date: now.toISOString().split('T')[0], dayOfWeek, parity, weekNumber: weekNum, lessons });
});

// GET /api/schedule/:groupId/tomorrow
router.get('/:groupId/tomorrow', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const groupId = parseInt(String(req.params.groupId));
  const tomorrow = getMoscowDate();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayOfWeek = getDayOfWeek(tomorrow);
  // Use TOMORROW's parity (handles week transitions: Sun→Mon = new week!)
  const parity = getSemesterWeekParity(tomorrow);
  const weekNum = getSemesterWeekNumber(tomorrow);

  const lessons = await prisma.lesson.findMany({
    where: {
      groupId,
      dayOfWeek,
      OR: [{ parity }, { parity: 2 }],
      weekStart: { lte: weekNum },
      weekEnd: { gte: weekNum },
    },
    orderBy: { pairNumber: 'asc' }
  });

  res.json({ date: tomorrow.toISOString().split('T')[0], dayOfWeek, parity, weekNumber: weekNum, lessons });
});

// GET /api/schedule/:groupId/week
router.get('/:groupId/week', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const groupId = parseInt(String(req.params.groupId));
  const now = getMoscowDate();
  const parity = getSemesterWeekParity(now);
  const weekNum = getSemesterWeekNumber(now);

  const lessons = await prisma.lesson.findMany({
    where: {
      groupId,
      OR: [{ parity }, { parity: 2 }],
      weekStart: { lte: weekNum },
      weekEnd: { gte: weekNum },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { pairNumber: 'asc' }]
  });

  // Group by day
  const days: Record<number, typeof lessons> = {};
  for (const lesson of lessons) {
    if (!days[lesson.dayOfWeek]) days[lesson.dayOfWeek] = [];
    days[lesson.dayOfWeek].push(lesson);
  }

  res.json({ parity, weekNumber: weekNum, days });
});

// GET /api/schedule/:groupId/current — текущая пара (если идёт)
router.get('/:groupId/current', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const groupId = parseInt(String(req.params.groupId));
  const now = getMoscowDate();
  const dayOfWeek = getDayOfWeek(now);
  const parity = getSemesterWeekParity(now);
  const weekNum = getSemesterWeekNumber(now);

  // Dev-mode: override time for testing
  const testHour = req.query._testHour ? parseInt(String(req.query._testHour)) : null;
  const testMinute = req.query._testMinute ? parseInt(String(req.query._testMinute)) : null;

  const currentHours = testHour !== null ? testHour : now.getHours();
  const currentMinutes = testMinute !== null ? testMinute : now.getMinutes();
  const currentTotalMinutes = currentHours * 60 + currentMinutes;

  const lessons = await prisma.lesson.findMany({
    where: {
      groupId,
      dayOfWeek,
      OR: [{ parity }, { parity: 2 }],
      weekStart: { lte: weekNum },
      weekEnd: { gte: weekNum },
    },
    orderBy: { pairNumber: 'asc' }
  });

  let currentLesson = null;
  let nextLesson = null;

  for (const lesson of lessons) {
    const start = parseTime(lesson.timeStart);
    const end = parseTime(lesson.timeEnd);
    if (!start || !end) continue;

    const startMin = start.hours * 60 + start.minutes;
    const endMin = end.hours * 60 + end.minutes;

    if (currentTotalMinutes >= startMin && currentTotalMinutes < endMin) {
      currentLesson = {
        ...lesson,
        endsAtHours: end.hours,
        endsAtMinutes: end.minutes,
      };
      break;
    }

    if (currentTotalMinutes < startMin && !nextLesson) {
      nextLesson = {
        ...lesson,
        startsAtHours: start.hours,
        startsAtMinutes: start.minutes,
      };
    }
  }

  res.json({
    currentLesson,
    nextLesson,
    serverTime: now.toISOString(),
    weekNumber: weekNum,
    parity,
  });
});

// GET /api/schedule/:groupId/date/:date — specific date
router.get('/:groupId/date/:date', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const groupId = parseInt(String(req.params.groupId));
  const date = new Date(String(req.params.date));
  const moscowDate = getMoscowDate(date);
  const dayOfWeek = getDayOfWeek(moscowDate);
  const parity = getSemesterWeekParity(moscowDate);
  const weekNum = getSemesterWeekNumber(moscowDate);

  const lessons = await prisma.lesson.findMany({
    where: {
      groupId,
      dayOfWeek,
      OR: [{ parity }, { parity: 2 }],
      weekStart: { lte: weekNum },
      weekEnd: { gte: weekNum },
    },
    orderBy: { pairNumber: 'asc' }
  });

  res.json({ date: req.params.date, dayOfWeek, parity, weekNumber: weekNum, lessons });
});

// GET /api/schedule/:groupId/debug — diagnostic endpoint for admin
router.get('/:groupId/debug', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const groupId = parseInt(String(req.params.groupId));
  const now = getMoscowDate();
  const parity = getSemesterWeekParity(now);
  const weekNum = getSemesterWeekNumber(now);

  // Get ALL lessons for this group (no filtering)
  const allLessons = await prisma.lesson.findMany({
    where: { groupId },
    orderBy: [{ dayOfWeek: 'asc' }, { pairNumber: 'asc' }]
  });

  // Count by day
  const byDay: Record<number, number> = {};
  const byParity: Record<number, number> = { 0: 0, 1: 0, 2: 0 };
  for (const l of allLessons) {
    byDay[l.dayOfWeek] = (byDay[l.dayOfWeek] || 0) + 1;
    byParity[l.parity] = (byParity[l.parity] || 0) + 1;
  }

  // Get filtered lessons (what would show this week)
  const filteredLessons = allLessons.filter(l =>
    (l.parity === parity || l.parity === 2) &&
    l.weekStart <= weekNum &&
    l.weekEnd >= weekNum
  );

  res.json({
    moscowTime: now.toISOString(),
    dayOfWeek: getDayOfWeek(now),
    currentWeek: weekNum,
    currentParity: parity,
    totalLessons: allLessons.length,
    filteredLessons: filteredLessons.length,
    byDay,
    byParity,
    sampleLessons: allLessons.slice(0, 10),
  });
});

export default router;
