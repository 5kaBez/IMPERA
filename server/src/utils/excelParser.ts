import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import { normalizeInstitute, normalizeDirection, normalizeTime, normalizeLessonType, parseWeeks } from './normalize';

interface RawRow {
  studyForm: string;
  educationLevel: string;
  course: number;
  institute: string;
  direction: string;
  program: string;
  group: string;
  groupNumber: number;
  dayOfWeek: string;
  pairNumber: number;
  time: string;
  parity: string;
  subject: string;
  lessonType: string;
  teacher: string;
  room: string;
  weeks: string;
}

const DAY_MAP: Record<string, number> = {
  'ПОНЕДЕЛЬНИК': 1, 'ВТОРНИК': 2, 'СРЕДА': 3,
  'ЧЕТВЕРГ': 4, 'ПЯТНИЦА': 5, 'СУББОТА': 6, 'ВОСКРЕСЕНЬЕ': 7
};

export async function parseExcelSchedule(buffer: Buffer, prisma: PrismaClient) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Skip header
  const dataRows = rows.slice(1).filter(row => row.length >= 17 && row[0]);

  let imported = 0;
  let skipped = 0;

  // Cache for lookups
  const instituteCache = new Map<string, number>();
  const directionCache = new Map<string, number>();
  const programCache = new Map<string, number>();
  const groupCache = new Map<string, number>();

  for (const row of dataRows) {
    try {
      const raw: RawRow = {
        studyForm: String(row[0] || '').trim(),
        educationLevel: String(row[1] || '').trim(),
        course: parseInt(row[2]) || 1,
        institute: String(row[3] || '').trim(),
        direction: String(row[4] || '').trim(),
        program: String(row[5] || '').trim(),
        group: String(row[6] || '').trim(),
        groupNumber: parseInt(row[7]) || 1,
        dayOfWeek: String(row[8] || '').trim().toUpperCase(),
        pairNumber: parseInt(row[9]) || 1,
        time: String(row[10] || '').trim(),
        parity: String(row[11] || '').trim(),
        subject: String(row[12] || '').trim(),
        lessonType: String(row[13] || '').trim(),
        teacher: String(row[14] || '').trim(),
        room: String(row[15] || '').trim(),
        weeks: String(row[16] || '').trim(),
      };

      if (!raw.subject || raw.subject === '-') { skipped++; continue; }

      // Normalize
      const instituteName = normalizeInstitute(raw.institute);
      const directionName = normalizeDirection(raw.direction);
      const programName = raw.program || directionName;

      // Institute
      let instituteId = instituteCache.get(instituteName);
      if (!instituteId) {
        const inst = await prisma.institute.upsert({
          where: { name: instituteName },
          update: {},
          create: { name: instituteName }
        });
        instituteId = inst.id;
        instituteCache.set(instituteName, instituteId);
      }

      // Direction
      const dirKey = `${directionName}|${instituteId}`;
      let directionId = directionCache.get(dirKey);
      if (!directionId) {
        const dir = await prisma.direction.upsert({
          where: { name_instituteId: { name: directionName, instituteId } },
          update: {},
          create: { name: directionName, instituteId }
        });
        directionId = dir.id;
        directionCache.set(dirKey, directionId);
      }

      // Program
      const progKey = `${programName}|${directionId}`;
      let programId = programCache.get(progKey);
      if (!programId) {
        const prog = await prisma.program.upsert({
          where: { name_directionId: { name: programName, directionId } },
          update: {},
          create: { name: programName, directionId }
        });
        programId = prog.id;
        programCache.set(progKey, programId);
      }

      // Group
      const groupKey = `${raw.groupNumber}|${programId}|${raw.course}|${raw.studyForm}`;
      let groupId = groupCache.get(groupKey);
      if (!groupId) {
        const grp = await prisma.group.upsert({
          where: { number_programId_course_studyForm: { number: raw.groupNumber, programId, course: raw.course, studyForm: raw.studyForm } },
          update: {},
          create: { name: raw.group, number: raw.groupNumber, programId, course: raw.course, studyForm: raw.studyForm, educationLevel: raw.educationLevel }
        });
        groupId = grp.id;
        groupCache.set(groupKey, groupId);
      }

      // Time
      const { start, end } = normalizeTime(raw.time);
      const dayNum = DAY_MAP[raw.dayOfWeek] || 1;
      const parityNum = raw.parity === '1' ? 1 : raw.parity === '0' ? 0 : 2;
      const { weekStart, weekEnd } = parseWeeks(raw.weeks);

      // Lesson
      await prisma.lesson.create({
        data: {
          groupId,
          dayOfWeek: dayNum,
          pairNumber: raw.pairNumber,
          timeStart: start,
          timeEnd: end,
          parity: parityNum,
          subject: raw.subject,
          lessonType: normalizeLessonType(raw.lessonType),
          teacher: raw.teacher === '-' ? '' : raw.teacher,
          room: raw.room === '-' ? '' : raw.room,
          weekStart,
          weekEnd,
        }
      });
      imported++;
    } catch (err) {
      skipped++;
    }
  }

  return { imported, skipped, total: dataRows.length };
}
