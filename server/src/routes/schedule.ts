import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();

// Начало семестра: 9 февраля 2026 (понедельник)
const SEMESTER_START = new Date(2026, 1, 9); // months 0-indexed: 1 = February

function getSemesterWeekNumber(): number {
  const now = new Date();
  const diffMs = now.getTime() - SEMESTER_START.getTime();
  if (diffMs < 0) return 1; // до начала семестра — считаем 1-ю неделю
  const weekNum = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
  // Если неделя выходит за рамки семестра (>18), циклически возвращаемся
  return weekNum > 18 ? ((weekNum - 1) % 18) + 1 : weekNum;
}

function getSemesterWeekParity(): number {
  // Неделя 1 — нечётная (parity=1), неделя 2 — чётная (parity=0)
  const weekNum = getSemesterWeekNumber();
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
  const now = new Date();
  const dayOfWeek = getDayOfWeek(now);
  const parity = getSemesterWeekParity();
  const weekNum = getSemesterWeekNumber();

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
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayOfWeek = getDayOfWeek(tomorrow);
  const parity = getSemesterWeekParity();
  const weekNum = getSemesterWeekNumber();

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
  const parity = getSemesterWeekParity();
  const weekNum = getSemesterWeekNumber();

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
// В dev-режиме можно передать ?_testHour=9&_testMinute=15 для тестирования
router.get('/:groupId/current', async (req: Request, res: Response) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const groupId = parseInt(String(req.params.groupId));
  const now = new Date();
  const dayOfWeek = getDayOfWeek(now);
  const parity = getSemesterWeekParity();
  const weekNum = getSemesterWeekNumber();

  // Dev-mode: override time for testing
  const testHour = req.query._testHour ? parseInt(String(req.query._testHour)) : null;
  const testMinute = req.query._testMinute ? parseInt(String(req.query._testMinute)) : null;

  const currentHours = testHour !== null ? testHour : now.getHours();
  const currentMinutes = testMinute !== null ? testMinute : now.getMinutes();
  const currentTotalMinutes = currentHours * 60 + currentMinutes;

  // Получаем все пары на сегодня
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

  // Ищем пару, которая сейчас идёт
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
  const dayOfWeek = getDayOfWeek(date);
  const parity = getSemesterWeekParity();
  const weekNum = getSemesterWeekNumber();

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

export default router;
