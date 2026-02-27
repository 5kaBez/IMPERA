// Начало семестра: 9 февраля 2026 (понедельник)
const SEMESTER_START = new Date(2026, 1, 9); // months 0-indexed: 1 = February

export function getSemesterWeekNumber(): number {
  const now = new Date();
  const diffMs = now.getTime() - SEMESTER_START.getTime();
  if (diffMs < 0) return 1;
  const weekNum = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
  return weekNum > 18 ? ((weekNum - 1) % 18) + 1 : weekNum;
}

export function getSemesterWeekParity(): number {
  const weekNum = getSemesterWeekNumber();
  return weekNum % 2 === 1 ? 1 : 0;
}

export function getDayOfWeek(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}
