/**
 * RECOVERY SCRIPT — Восстановление после взлома
 *
 * Действия:
 * 1. Разбанивает ВСЕХ пользователей
 * 2. Запускает полный автоимпорт расписания с guu.ru
 * 3. Показывает итоговую статистику
 *
 * Запуск: PYTHONIOENCODING=utf-8 npx ts-node src/scripts/recoverProduction.ts
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function recover() {
  console.log('🔧 ВОССТАНОВЛЕНИЕ ПОСЛЕ ВЗЛОМА\n');

  // 1. Разбанить всех
  console.log('📋 Шаг 1: Разбан пользователей...');
  const bannedUsers = await prisma.user.findMany({ where: { banned: true }, select: { id: true, firstName: true, username: true } });
  console.log(`   Забанено пользователей: ${bannedUsers.length}`);

  if (bannedUsers.length > 0) {
    const result = await prisma.user.updateMany({
      where: { banned: true },
      data: { banned: false },
    });
    console.log(`   ✅ Разбанено: ${result.count} пользователей`);
  } else {
    console.log('   ✅ Забаненных нет');
  }

  // 2. Показать текущее состояние данных
  console.log('\n📊 Шаг 2: Текущее состояние БД...');
  const stats = {
    users: await prisma.user.count(),
    institutes: await prisma.institute.count(),
    groups: await prisma.group.count(),
    lessons: await prisma.lesson.count(),
    imports: await prisma.scheduleImport.count(),
  };
  console.log(`   Пользователей: ${stats.users}`);
  console.log(`   Институтов: ${stats.institutes}`);
  console.log(`   Групп: ${stats.groups}`);
  console.log(`   Уроков: ${stats.lessons}`);
  console.log(`   Импортов: ${stats.imports}`);

  // 3. Запустить автоимпорт если данных нет
  if (stats.lessons === 0 || stats.groups === 0) {
    console.log('\n📥 Шаг 3: Расписание пустое — запускаю автоимпорт с guu.ru...');

    // Dynamic import to avoid circular dependencies
    const { runAutoImport } = await import('../utils/guuScheduleImporter');

    try {
      const importResult = await runAutoImport(prisma, 'manual');
      console.log(`\n   ✅ Импорт завершён!`);
      if (importResult.stats) {
        console.log(`   Уроков: ${importResult.stats.imported}`);
        console.log(`   Групп: ${importResult.stats.groups}`);
        console.log(`   Институтов: ${importResult.stats.institutes}`);
      }
    } catch (err: any) {
      console.error(`\n   ❌ Ошибка импорта: ${err.message}`);
      console.log('   Попробуйте запустить импорт отдельно');
    }
  } else {
    console.log('\n✅ Шаг 3: Расписание на месте, импорт не нужен');
  }

  // 4. Финальная статистика
  console.log('\n📊 ИТОГОВОЕ СОСТОЯНИЕ:');
  const finalStats = {
    users: await prisma.user.count(),
    bannedUsers: await prisma.user.count({ where: { banned: true } }),
    institutes: await prisma.institute.count(),
    groups: await prisma.group.count(),
    lessons: await prisma.lesson.count(),
  };
  console.log(`   Пользователей: ${finalStats.users} (забанено: ${finalStats.bannedUsers})`);
  console.log(`   Институтов: ${finalStats.institutes}`);
  console.log(`   Групп: ${finalStats.groups}`);
  console.log(`   Уроков: ${finalStats.lessons}`);

  // 5. Проверить JWT_SECRET
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret === 'impera-secret-change-in-production') {
    console.log('\n⚠️  ВНИМАНИЕ: JWT_SECRET не установлен или дефолтный!');
    console.log('   Смени JWT_SECRET в .env на длинную случайную строку:');
    console.log('   JWT_SECRET="' + require('crypto').randomBytes(32).toString('hex') + '"');
    console.log('   Это инвалидирует все текущие токены (в т.ч. украденный admin-токен)');
  }

  await prisma.$disconnect();
  console.log('\n✅ Восстановление завершено!');
}

recover().catch(err => {
  console.error('❌ Fatal error:', err);
  prisma.$disconnect();
  process.exit(1);
});
