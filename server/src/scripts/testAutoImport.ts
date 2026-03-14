/**
 * Test Auto Import - Full Pipeline
 * Downloads from guu.ru -> Python parser -> Import to DB
 * Same as server cron job, but standalone for testing.
 */

import { PrismaClient } from '@prisma/client';
import { runAutoImport } from '../utils/guuScheduleImporter';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🧪 ТЕСТ ПОЛНОГО ПАЙПЛАЙНА АВТОИМПОРТА\n');
  console.log('Этот скрипт делает то же самое, что крон-задача на сервере:');
  console.log('1. Скачивает xlsx файлы с guu.ru/student/schedule/');
  console.log('2. Запускает Python парсер parse_all_sheets.py');
  console.log('3. Читает CSV выход');
  console.log('4. Импортирует в PostgreSQL через migrateSchedule');
  console.log('---\n');

  const result = await runAutoImport(prisma, 'manual');

  if (result.success) {
    console.log('\n✅ ТЕСТ ПРОЙДЕН УСПЕШНО!');
    console.log(`   Import ID: ${result.importId}`);
    console.log(`   Stats:`, JSON.stringify(result.stats, null, 2));
  } else {
    console.log('\n❌ ТЕСТ ПРОВАЛЕН!');
    console.log(`   Import ID: ${result.importId}`);
    console.log(`   Error: ${result.error}`);
  }

  // Show final DB state
  const [institutes, directions, programs, groups, lessons] = await Promise.all([
    prisma.institute.count(),
    prisma.direction.count(),
    prisma.program.count(),
    prisma.group.count(),
    prisma.lesson.count(),
  ]);

  console.log('\n📊 ИТОГОВОЕ СОСТОЯНИЕ БД:');
  console.log(`   Институтов: ${institutes}`);
  console.log(`   Направлений: ${directions}`);
  console.log(`   Программ: ${programs}`);
  console.log(`   Групп: ${groups}`);
  console.log(`   Пар: ${lessons}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Fatal:', err);
  await prisma.$disconnect();
  process.exit(1);
});
