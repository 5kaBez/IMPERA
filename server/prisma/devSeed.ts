/**
 * Dev seed: создаёт тестовых пользователей для локальной разработки
 *  - Админ (telegramId 1038062816)
 *  - Студент «Иван Иванов» (telegramId 100001)
 *  - Преподаватель «Дзигуа Д.В.» (telegramId 200001) → секция Атлетизм
 *  - Преподаватель «Цыганкова В.О.» (telegramId 200002) → секция Аэробика
 *
 * Запуск: npx tsx prisma/devSeed.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function devSeed() {
  console.log('🌱 Dev seed: creating test users...');

  // 1) Админ
  const admin = await prisma.user.upsert({
    where: { telegramId: '1038062816' },
    update: { role: 'admin' },
    create: {
      telegramId: '1038062816',
      firstName: 'Admin',
      username: 'bogtradinga',
      role: 'admin',
    },
  });
  console.log(`  ✅ Admin: id=${admin.id} (${admin.firstName})`);

  // 2) Студент
  const student = await prisma.user.upsert({
    where: { telegramId: '100001' },
    update: {},
    create: {
      telegramId: '100001',
      firstName: 'Иван',
      lastName: 'Иванов',
      username: 'ivanov_test',
      role: 'student',
    },
  });
  console.log(`  ✅ Student: id=${student.id} (${student.firstName} ${student.lastName})`);

  // 3) Второй студент (для теста device fingerprint)
  const student2 = await prisma.user.upsert({
    where: { telegramId: '100002' },
    update: {},
    create: {
      telegramId: '100002',
      firstName: 'Мария',
      lastName: 'Петрова',
      username: 'petrova_test',
      role: 'student',
    },
  });
  console.log(`  ✅ Student 2: id=${student2.id} (${student2.firstName} ${student2.lastName})`);

  // 4) Преподаватель Атлетизма
  const section1 = await prisma.sportSection.findUnique({ where: { name: 'Атлетизм' } });
  if (section1) {
    const teacher1 = await prisma.user.upsert({
      where: { telegramId: '200001' },
      update: {},
      create: {
        telegramId: '200001',
        firstName: 'Дзигуа',
        lastName: 'Д.В.',
        username: 'dzigua_test',
        role: 'student', // роль student, но SportTeacher даёт права
      },
    });
    await prisma.sportTeacher.upsert({
      where: { userId_sectionId: { userId: teacher1.id, sectionId: section1.id } },
      update: {},
      create: { userId: teacher1.id, sectionId: section1.id },
    });
    console.log(`  ✅ Teacher: id=${teacher1.id} (${teacher1.firstName}) → ${section1.name}`);
  }

  // 5) Преподаватель Аэробики
  const section2 = await prisma.sportSection.findUnique({ where: { name: 'Аэробика' } });
  if (section2) {
    const teacher2 = await prisma.user.upsert({
      where: { telegramId: '200002' },
      update: {},
      create: {
        telegramId: '200002',
        firstName: 'Цыганкова',
        lastName: 'В.О.',
        username: 'tsygankova_test',
        role: 'student',
      },
    });
    await prisma.sportTeacher.upsert({
      where: { userId_sectionId: { userId: teacher2.id, sectionId: section2.id } },
      update: {},
      create: { userId: teacher2.id, sectionId: section2.id },
    });
    console.log(`  ✅ Teacher: id=${teacher2.id} (${teacher2.firstName}) → ${section2.name}`);
  }

  console.log('🌱 Dev seed complete!');
}

devSeed()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
