/**
 * Local Import Script
 * Reads CSV from parse_all_sheets.py and imports into local PostgreSQL.
 * Usage: npx ts-node src/scripts/localImport.ts [path-to-csv]
 */

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { migrateSchedule } from '../utils/scheduleMigration';

const prisma = new PrismaClient();

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsvFile(csvPath: string) {
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(l => l.trim());

  if (lines.length < 2) {
    throw new Error('CSV file is empty or has only a header');
  }

  const header = parseCSVLine(lines[0]);
  const colIndex = (name: string) => {
    const idx = header.findIndex(h => h.trim() === name);
    if (idx === -1) console.warn(`[CSV] Column not found: ${name}`);
    return idx;
  };

  const iForm = colIndex('Форма обучения');
  const iLevel = colIndex('Уровень образования');
  const iCourse = colIndex('Курс');
  const iInstitute = colIndex('Институт');
  const iDirection = colIndex('Направление');
  const iProgram = colIndex('Программа');
  const iGroupName = colIndex('Группа');
  const iGroupNum = colIndex('Номер группы');
  const iDay = colIndex('День недели');
  const iPairNum = colIndex('Номер пары');
  const iTime = colIndex('Время пары');
  const iParity = colIndex('Чётность');
  const iSubject = colIndex('Предмет');
  const iType = colIndex('Вид пары');
  const iTeacher = colIndex('Преподаватель');
  const iRoom = colIndex('Номер аудитории');
  const iWeeks = colIndex('Недели');

  const groupsMap = new Map<string, any>();
  const lessons: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 10) continue;

    const groupNumber = parseInt(cols[iGroupNum]) || 0;
    if (groupNumber === 0) continue;

    const course = parseInt(cols[iCourse]) || 1;
    const studyForm = cols[iForm] || 'Очная';
    const instituteName = cols[iInstitute] || '-';
    const directionName = cols[iDirection] || '-';
    const programName = cols[iProgram] || '-';

    const groupKey = `${instituteName}|${directionName}|${programName}|${groupNumber}|${course}|${studyForm}`;

    if (!groupsMap.has(groupKey)) {
      groupsMap.set(groupKey, {
        number: groupNumber,
        name: cols[iGroupName] || `Группа ${groupNumber}`,
        course,
        studyForm,
        educationLevel: cols[iLevel] || 'Бакалавриат',
        directionName,
        instituteName,
        programName,
      });
    }

    lessons.push({
      groupNumber,
      instituteName,
      directionName,
      programName,
      course,
      studyForm,
      educationLevel: cols[iLevel] || 'Бакалавриат',
      dayOfWeek: (cols[iDay] || '').toUpperCase(),
      pairNumber: parseInt(cols[iPairNum]) || cols[iPairNum] || 1,
      time: cols[iTime] || '',
      parity: cols[iParity] || '-',
      subject: cols[iSubject] || '-',
      lessonType: cols[iType] || '-',
      teacher: cols[iTeacher] || '-',
      room: cols[iRoom] || '-',
      weeks: cols[iWeeks] || '-',
    });
  }

  return {
    groups: Array.from(groupsMap.values()),
    lessons,
  };
}

async function main() {
  const csvPath = process.argv[2] || path.join(process.cwd(), 'imports', 'raw', 'schedule_full.csv');

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`);
    console.error('Usage: npx ts-node src/scripts/localImport.ts [path-to-csv]');
    process.exit(1);
  }

  console.log(`\n📂 Reading CSV: ${csvPath}`);
  const { groups, lessons } = parseCsvFile(csvPath);
  console.log(`   Groups: ${groups.length}, Lessons: ${lessons.length}`);

  if (lessons.length === 0) {
    console.error('No lessons found in CSV!');
    process.exit(1);
  }

  console.log('\n🚀 Starting migration...\n');
  const stats = await migrateSchedule(groups, lessons);

  // Get final counts
  const [institutes, directions, programs, groupCount, lessonCount] = await Promise.all([
    prisma.institute.count(),
    prisma.direction.count(),
    prisma.program.count(),
    prisma.group.count(),
    prisma.lesson.count(),
  ]);

  console.log('\n📊 DATABASE STATS:');
  console.log(`   Institutes: ${institutes}`);
  console.log(`   Directions: ${directions}`);
  console.log(`   Programs:   ${programs}`);
  console.log(`   Groups:     ${groupCount}`);
  console.log(`   Lessons:    ${lessonCount}`);
  console.log('\n✅ Import complete!\n');

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Fatal error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
