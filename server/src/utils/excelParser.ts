import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import { normalizeInstitute, normalizeDirection, normalizeTime, normalizeLessonType, parseWeeks } from './normalize';

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

  // ---- Phase 1: Parse all rows into structured data ----
  interface ParsedRow {
    instituteName: string;
    directionName: string;
    programName: string;
    groupName: string;
    groupNumber: number;
    course: number;
    studyForm: string;
    educationLevel: string;
    dayOfWeek: number;
    pairNumber: number;
    timeStart: string;
    timeEnd: string;
    parity: number;
    subject: string;
    lessonType: string;
    teacher: string;
    room: string;
    weekStart: number;
    weekEnd: number;
  }

  const parsed: ParsedRow[] = [];

  for (const row of dataRows) {
    try {
      const studyForm = String(row[0] || '').trim();
      const educationLevel = String(row[1] || '').trim();
      const course = parseInt(row[2]) || 1;
      const institute = String(row[3] || '').trim();
      const direction = String(row[4] || '').trim();
      const program = String(row[5] || '').trim();
      const group = String(row[6] || '').trim();
      const groupNumber = parseInt(row[7]) || 1;
      const dayOfWeek = String(row[8] || '').trim().toUpperCase();
      const pairNumber = parseInt(row[9]) || 1;
      const time = String(row[10] || '').trim();
      const parity = String(row[11] || '').trim();
      const subject = String(row[12] || '').trim();
      const lessonType = String(row[13] || '').trim();
      const teacher = String(row[14] || '').trim();
      const room = String(row[15] || '').trim();
      const weeks = String(row[16] || '').trim();

      if (!subject || subject === '-') { skipped++; continue; }

      const instituteName = normalizeInstitute(institute);
      const directionName = normalizeDirection(direction);
      const programName = program || directionName;
      const { start, end } = normalizeTime(time);
      const dayNum = DAY_MAP[dayOfWeek] || 1;
      const parityNum = parity === '1' ? 1 : parity === '0' ? 0 : 2;
      const { weekStart, weekEnd } = parseWeeks(weeks);

      parsed.push({
        instituteName, directionName, programName,
        groupName: group, groupNumber, course, studyForm, educationLevel,
        dayOfWeek: dayNum, pairNumber, timeStart: start, timeEnd: end,
        parity: parityNum, subject, lessonType: normalizeLessonType(lessonType),
        teacher: teacher === '-' ? '' : teacher,
        room: room === '-' ? '' : room,
        weekStart, weekEnd,
      });
    } catch {
      skipped++;
    }
  }

  // ---- Phase 2: Batch upsert structural data ----
  // Collect unique values
  const uniqueInstitutes = [...new Set(parsed.map(r => r.instituteName))];
  const instituteMap = new Map<string, number>();

  for (const name of uniqueInstitutes) {
    const inst = await prisma.institute.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    instituteMap.set(name, inst.id);
  }

  // Directions
  const uniqueDirections = new Map<string, { name: string; instituteId: number }>();
  for (const r of parsed) {
    const key = `${r.directionName}|${instituteMap.get(r.instituteName)}`;
    if (!uniqueDirections.has(key)) {
      uniqueDirections.set(key, { name: r.directionName, instituteId: instituteMap.get(r.instituteName)! });
    }
  }
  const directionMap = new Map<string, number>();
  for (const [key, val] of uniqueDirections) {
    const dir = await prisma.direction.upsert({
      where: { name_instituteId: { name: val.name, instituteId: val.instituteId } },
      update: {},
      create: { name: val.name, instituteId: val.instituteId },
    });
    directionMap.set(key, dir.id);
  }

  // Programs
  const uniquePrograms = new Map<string, { name: string; directionId: number }>();
  for (const r of parsed) {
    const dirKey = `${r.directionName}|${instituteMap.get(r.instituteName)}`;
    const progKey = `${r.programName}|${directionMap.get(dirKey)}`;
    if (!uniquePrograms.has(progKey)) {
      uniquePrograms.set(progKey, { name: r.programName, directionId: directionMap.get(dirKey)! });
    }
  }
  const programMap = new Map<string, number>();
  for (const [key, val] of uniquePrograms) {
    const prog = await prisma.program.upsert({
      where: { name_directionId: { name: val.name, directionId: val.directionId } },
      update: {},
      create: { name: val.name, directionId: val.directionId },
    });
    programMap.set(key, prog.id);
  }

  // Groups
  const uniqueGroups = new Map<string, { name: string; number: number; programId: number; course: number; studyForm: string; educationLevel: string }>();
  for (const r of parsed) {
    const dirKey = `${r.directionName}|${instituteMap.get(r.instituteName)}`;
    const progKey = `${r.programName}|${directionMap.get(dirKey)}`;
    const programId = programMap.get(progKey)!;
    const grpKey = `${r.groupNumber}|${programId}|${r.course}|${r.studyForm}`;
    if (!uniqueGroups.has(grpKey)) {
      uniqueGroups.set(grpKey, {
        name: r.groupName, number: r.groupNumber,
        programId, course: r.course,
        studyForm: r.studyForm, educationLevel: r.educationLevel,
      });
    }
  }
  const groupMap = new Map<string, number>();
  for (const [key, val] of uniqueGroups) {
    const grp = await prisma.group.upsert({
      where: { number_programId_course_studyForm: { number: val.number, programId: val.programId, course: val.course, studyForm: val.studyForm } },
      update: {},
      create: val,
    });
    groupMap.set(key, grp.id);
  }

  // ---- Phase 3: Batch create lessons using createMany ----
  const lessonData: Array<{
    groupId: number; dayOfWeek: number; pairNumber: number;
    timeStart: string; timeEnd: string; parity: number;
    subject: string; lessonType: string; teacher: string;
    room: string; weekStart: number; weekEnd: number;
  }> = [];

  for (const r of parsed) {
    const dirKey = `${r.directionName}|${instituteMap.get(r.instituteName)}`;
    const progKey = `${r.programName}|${directionMap.get(dirKey)}`;
    const programId = programMap.get(progKey)!;
    const grpKey = `${r.groupNumber}|${programId}|${r.course}|${r.studyForm}`;
    const groupId = groupMap.get(grpKey);

    if (!groupId) { skipped++; continue; }

    lessonData.push({
      groupId,
      dayOfWeek: r.dayOfWeek,
      pairNumber: r.pairNumber,
      timeStart: r.timeStart,
      timeEnd: r.timeEnd,
      parity: r.parity,
      subject: r.subject,
      lessonType: r.lessonType,
      teacher: r.teacher,
      room: r.room,
      weekStart: r.weekStart,
      weekEnd: r.weekEnd,
    });
  }

  // Insert in batches of 500 for performance
  const BATCH_SIZE = 500;
  for (let i = 0; i < lessonData.length; i += BATCH_SIZE) {
    const batch = lessonData.slice(i, i + BATCH_SIZE);
    await prisma.lesson.createMany({ data: batch });
    imported += batch.length;
  }

  return { imported, skipped, total: dataRows.length };
}
