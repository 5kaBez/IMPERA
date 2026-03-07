import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import { normalizeInstitute, normalizeDirection, normalizeTime, normalizeLessonType, parseWeeks } from './normalize';

const DAY_MAP: Record<string, number> = {
  'ПОНЕДЕЛЬНИК': 1, 'ВТОРНИК': 2, 'СРЕДА': 3,
  'ЧЕТВЕРГ': 4, 'ПЯТНИЦА': 5, 'СУББОТА': 6, 'ВОСКРЕСЕНЬЕ': 7,
  // Abbreviated forms
  'ПН': 1, 'ВТ': 2, 'СР': 3, 'ЧТ': 4, 'ПТ': 5, 'СБ': 6, 'ВС': 7,
  'ПОН': 1, 'ВТО': 2, 'СРЕ': 3, 'ЧЕТ': 4, 'ПЯТ': 5, 'СУБ': 6, 'ВОС': 7,
};

function parseParity(value: string): number {
  const v = value.trim().toUpperCase();
  if (v === '1' || v === 'НЧ' || v === 'НЕЧЁТ' || v === 'НЕЧЕТ' || v === 'НЕЧЁТНАЯ' || v === 'НЕЧЕТНАЯ') return 1;
  if (v === '0' || v === 'Ч' || v === 'ЧЁТ' || v === 'ЧЕТ' || v === 'ЧЁТНАЯ' || v === 'ЧЕТНАЯ') return 0;
  return 2; // both weeks by default
}

export async function parseExcelSchedule(buffer: Buffer, prisma: PrismaClient) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const parsed: any[] = [];
  let skipped = 0;

  // Last seen values for forward-filling merged cells
  let lastStudyForm = 'Очная';
  let lastEducationLevel = 'Бакалавриат';
  let lastCourse = 1;
  let lastInstitute = '';
  let lastDirection = '';
  let lastProgram = '';
  let lastGroup = '';
  let lastGroupNumber = 1;
  let lastDayOfWeek = ''; // Forward-fill for merged day cells!

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    // Convert to JSON with header: 1 to get a 2D array
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (rows.length < 2) continue;

    // Process rows (skipping the first header row of each sheet)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 10) continue;

      try {
        const studyForm = String(row[0] || '').replace(/\r?\n/g, ' ').trim();
        const educationLevel = String(row[1] || '').replace(/\r?\n/g, ' ').trim();
        const course = parseInt(row[2]);
        const institute = String(row[3] || '').replace(/\r?\n/g, ' ').trim();
        const direction = String(row[4] || '').replace(/\r?\n/g, ' ').trim();
        const program = String(row[5] || '').replace(/\r?\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
        const group = String(row[6] || '').replace(/\r?\n/g, ' ').trim();
        const groupNumber = parseInt(row[7]);

        const dayOfWeekRaw = String(row[8] || '').trim().toUpperCase();
        const pairNumber = parseInt(row[9]);
        const time = String(row[10] || '').trim();
        const parity = String(row[11] || '').trim();
        const subject = String(row[12] || '').replace(/\r?\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
        const lessonType = String(row[13] || '').trim();
        const teacher = String(row[14] || '').replace(/\r?\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
        const room = String(row[15] || '').replace(/\r?\n/g, ' ').trim();
        const weeks = String(row[16] || '').trim();

        // Update last seen values if present (forward-fill mechanism)
        if (studyForm) lastStudyForm = studyForm;
        if (educationLevel) lastEducationLevel = educationLevel;
        if (!isNaN(course)) lastCourse = course;
        if (institute) lastInstitute = institute;
        if (direction) lastDirection = direction;
        if (program) lastProgram = program;
        if (group) lastGroup = group;
        if (!isNaN(groupNumber)) lastGroupNumber = groupNumber;
        // Forward-fill day of week (merged cells in Excel!)
        if (dayOfWeekRaw && DAY_MAP[dayOfWeekRaw]) lastDayOfWeek = dayOfWeekRaw;

        // Skip rows without subject (merged group cells for empty lessons)
        if (!subject || subject === '-' || subject === 'null' || subject === '—') continue;

        const instituteName = normalizeInstitute(lastInstitute);
        const directionName = normalizeDirection(lastDirection);
        const programName = lastProgram || directionName;
        const { start, end } = normalizeTime(time);
        const dayNum = DAY_MAP[lastDayOfWeek] || DAY_MAP[dayOfWeekRaw] || 1;
        const parityNum = parseParity(parity);
        const { weekStart, weekEnd } = parseWeeks(weeks);

        parsed.push({
          instituteName, directionName, programName,
          groupName: lastGroup, groupNumber: lastGroupNumber,
          course: lastCourse, studyForm: lastStudyForm, educationLevel: lastEducationLevel,
          dayOfWeek: dayNum, pairNumber: pairNumber || 1,
          timeStart: start, timeEnd: end,
          parity: parityNum, subject, lessonType: normalizeLessonType(lessonType),
          teacher: teacher === '-' ? '' : teacher,
          room: room === '-' ? '' : room,
          weekStart, weekEnd,
        });
      } catch (err) {
        skipped++;
      }
    }
  }

  // ---- Phase 2: Batch upsert structural data ----
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

  // ---- Phase 3: Batch create lessons ----
  const lessonData: any[] = [];
  for (const r of parsed) {
    const dirKey = `${r.directionName}|${instituteMap.get(r.instituteName)}`;
    const progKey = `${r.programName}|${directionMap.get(dirKey)}`;
    const programId = programMap.get(progKey)!;
    const grpKey = `${r.groupNumber}|${programId}|${r.course}|${r.studyForm}`;
    const groupId = groupMap.get(grpKey);

    if (groupId) {
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
  }

  const BATCH_SIZE = 500;
  let imported = 0;
  for (let i = 0; i < lessonData.length; i += BATCH_SIZE) {
    const batch = lessonData.slice(i, i + BATCH_SIZE);
    await prisma.lesson.createMany({ data: batch });
    imported += batch.length;
  }

  // ---- Build import statistics for debugging ----
  const DAY_NAMES: Record<number, string> = { 1: 'Пн', 2: 'Вт', 3: 'Ср', 4: 'Чт', 5: 'Пт', 6: 'Сб', 7: 'Вс' };
  const stats: Record<string, Record<string, number>> = {};
  for (const r of parsed) {
    const level = r.educationLevel || 'Неизвестно';
    if (!stats[level]) stats[level] = {};
    const dayName = DAY_NAMES[r.dayOfWeek] || `День ${r.dayOfWeek}`;
    stats[level][dayName] = (stats[level][dayName] || 0) + 1;
  }

  return { imported, skipped, total: parsed.length + skipped, stats };
}
