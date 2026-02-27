import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parseExcelSchedule } from '../src/utils/excelParser';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Try to find schedule file
  const possiblePaths = [
    path.resolve(__dirname, '../../schedule_full.xlsx'),
    'C:/Users/калькулятор/Desktop/project/guu_schedule_bot/scheduleparse/schedule_full.xlsx',
  ];

  let filePath = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      filePath = p;
      break;
    }
  }

  if (!filePath) {
    console.log('Schedule file not found. Creating demo data...');
    await createDemoData();
    return;
  }

  console.log(`Reading schedule from: ${filePath}`);
  const buffer = fs.readFileSync(filePath);
  const result = await parseExcelSchedule(buffer, prisma);
  console.log(`Import complete: ${result.imported} imported, ${result.skipped} skipped, ${result.total} total`);

  // Create default admin user
  await prisma.user.upsert({
    where: { telegramId: 'admin' },
    update: {},
    create: {
      telegramId: 'admin',
      firstName: 'Admin',
      role: 'admin',
    }
  });
  console.log('Admin user created (telegramId: admin)');
}

async function createDemoData() {
  const institute = await prisma.institute.create({
    data: { name: 'Институт информационных систем' }
  });

  const direction = await prisma.direction.create({
    data: { name: 'Прикладная информатика', instituteId: institute.id }
  });

  const program = await prisma.program.create({
    data: { name: 'Прикладная информатика', directionId: direction.id }
  });

  const group = await prisma.group.create({
    data: { name: 'Группа 1', number: 1, course: 1, programId: program.id }
  });

  // Demo schedule
  const demoLessons = [
    { dayOfWeek: 1, pairNumber: 1, timeStart: '09:00', timeEnd: '10:30', subject: 'Математический анализ', lessonType: 'Лекция', teacher: 'Иванов А.Б.', room: 'А-225' },
    { dayOfWeek: 1, pairNumber: 2, timeStart: '10:40', timeEnd: '12:10', subject: 'Программирование', lessonType: 'Практика', teacher: 'Петров В.Г.', room: 'Б-310' },
    { dayOfWeek: 2, pairNumber: 1, timeStart: '09:00', timeEnd: '10:30', subject: 'Физика', lessonType: 'Лекция', teacher: 'Сидоров Д.Е.', room: 'В-101' },
    { dayOfWeek: 3, pairNumber: 2, timeStart: '10:40', timeEnd: '12:10', subject: 'Английский язык', lessonType: 'Практика', teacher: 'Smith J.K.', room: 'Г-415' },
  ];

  for (const lesson of demoLessons) {
    await prisma.lesson.create({
      data: { groupId: group.id, parity: 2, weekStart: 1, weekEnd: 18, ...lesson }
    });
  }

  console.log('Demo data created');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
