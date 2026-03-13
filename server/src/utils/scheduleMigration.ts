/**
 * Безопасная миграция расписания
 * Сохраняет все назначенные пользователям группы и только обновляет само расписание
 */

import { PrismaClient } from '@prisma/client';
import { normalizeInstitute, normalizeDirection, normalizeTime, normalizeLessonType, getPairNumberByTime } from './normalize';

const prisma = new PrismaClient();

interface MigrationStats {
  usersPreserved: number;
  groupsPreserved: number;
  lessonsDeleted: number;
  lessonsCreated: number;
  newGroupsCreated: number;
  newDirectionsCreated: number;
  orphanedUsers: number;
}

/**
 * Выполняет безопасное обновление расписания
 * 
 * Стратегия:
 * 1. Импортируем новые группы (если их еще нет)
 * 2. Обновляем расписание (уроки) ТОЛЬКО для групп, которые существуют
 * 3. Сохраняем все User.groupId привязки (пользователи видят свое расписание)
 * 4. Пользователи со старыми группами продолжат видеть старое расписание
 */
export async function migrateSchedule(
  newGroupsData: Array<{
    number: number;
    name: string;
    course: number;
    studyForm: string;
    educationLevel: string;
    directionName: string;
    instituteName: string;
    programName: string;
  }>,
  newLessonsData: Array<{
    groupNumber: number;
    dayOfWeek: string;
    pairNumber: number | string;
    time: string;
    parity: string;
    subject: string;
    lessonType: string;
    teacher: string;
    room: string;
    weeks: string;
  }>
): Promise<MigrationStats> {
  const stats: MigrationStats = {
    usersPreserved: 0,
    groupsPreserved: 0,
    lessonsDeleted: 0,
    lessonsCreated: 0,
    newGroupsCreated: 0,
    newDirectionsCreated: 0,
    orphanedUsers: 0,
  };

  try {
    console.log('\n📋 НАЧАЛО МИГРАЦИИ РАСПИСАНИЯ\n');

    // ===== ЭТАП 1: Посчитать существующих пользователей =====
    const usersWithGroups = await prisma.user.findMany({
      where: { groupId: { not: null } },
      select: { id: true, groupId: true, telegramId: true },
    });
    stats.usersPreserved = usersWithGroups.length;
    console.log(`✅ Сохранены ${stats.usersPreserved} пользователей с привязанными группами`);

    // ===== ЭТАП 2: Создать/получить новые названия институтов и направлений =====
    const institutesMap = new Map<string, number>(); // name -> id
    const directionsMap = new Map<string, number>(); // "institute|direction" -> directionId

    for (const groupData of newGroupsData) {
      // Нормализуем названия
      const normalizedInstitute = normalizeInstitute(groupData.instituteName);
      const normalizedDirection = normalizeDirection(groupData.directionName);
      
      // Получить/создать институт
      let institute = await prisma.institute.findUnique({
        where: { name: normalizedInstitute },
      });
      if (!institute) {
        institute = await prisma.institute.create({
          data: { name: normalizedInstitute },
        });
        console.log(`   ➕ Создан институт: ${normalizedInstitute}`);
      }
      institutesMap.set(normalizedInstitute, institute.id);

      // Получить/создать направление
      const directionKey = `${normalizedInstitute}|${normalizedDirection}`;
      if (!directionsMap.has(directionKey)) {
        let direction = await prisma.direction.findUnique({
          where: {
            name_instituteId: {
              name: normalizedDirection,
              instituteId: institute.id,
            },
          },
        });
        if (!direction) {
          direction = await prisma.direction.create({
            data: {
              name: normalizedDirection,
              instituteId: institute.id,
            },
          });
          stats.newDirectionsCreated++;
          console.log(`   ➕ Создано направление: ${normalizedInstitute} → ${normalizedDirection}`);
        }
        directionsMap.set(directionKey, direction.id);
      }

      // Получить/создать программу
      const directionId = directionsMap.get(directionKey)!;
      let program = await prisma.program.findUnique({
        where: {
          name_directionId: {
            name: groupData.programName,
            directionId,
          },
        },
      });
      if (!program) {
        program = await prisma.program.create({
          data: {
            name: groupData.programName,
            directionId,
          },
        });
      }

      // Получить/создать группу
      let group = await prisma.group.findUnique({
        where: {
          number_programId_course_studyForm: {
            number: groupData.number,
            programId: program.id,
            course: groupData.course,
            studyForm: groupData.studyForm,
          },
        },
      });
      if (!group) {
        group = await prisma.group.create({
          data: {
            name: groupData.name,
            number: groupData.number,
            course: groupData.course,
            studyForm: groupData.studyForm,
            educationLevel: groupData.educationLevel,
            programId: program.id,
          },
        });
        stats.newGroupsCreated++;
        console.log(`   ➕ Создана группа: ${groupData.name} (${groupData.directionName})`);
      } else {
        stats.groupsPreserved++;
      }
    }

    console.log(
      `\n✅ Этап 1 завершён: создано ${stats.newGroupsCreated} новых групп, сохранено ${stats.groupsPreserved}`
    );

    // ===== ЭТАП 3: Удалить старые уроки для обновляемых групп =====
    const groupNumbersToUpdate = new Set(newGroupsData.map(g => g.number));
    const groupsToUpdate = await prisma.group.findMany({
      where: {
        number: { in: Array.from(groupNumbersToUpdate) },
      },
    });

    for (const group of groupsToUpdate) {
      const deleted = await prisma.lesson.deleteMany({
        where: { groupId: group.id },
      });
      stats.lessonsDeleted += deleted.count;
    }
    console.log(`\n🗑️  Удалено ${stats.lessonsDeleted} старых уроков`);

    // ===== ЭТАП 4: Создать новые уроки =====
    const dayNameToNumber: Record<string, number> = {
      ПОНЕДЕЛЬНИК: 1,
      ВТОРНИК: 2,
      СРЕДА: 3,
      ЧЕТВЕРГ: 4,
      ПЯТНИЦА: 5,
      СУББОТА: 6,
      ВОСКРЕСЕНЬЕ: 7,
    };

    for (const lessonData of newLessonsData) {
      // Ищем группу правильно - она должна быть в массиве созданных групп
      const groupInfo = newGroupsData.find(g => g.number === lessonData.groupNumber);
      
      if (!groupInfo) {
        console.warn(`   ⚠️  Информация о группе ${lessonData.groupNumber} не найдена в парсере`);
        continue;
      }

      // Нормализуем названия для поиска в БД
      const normalizedInstitute = normalizeInstitute(groupInfo.instituteName);
      const normalizedDirection = normalizeDirection(groupInfo.directionName);
      
      // Сначала найдём или создадим direction
      let direction = await prisma.direction.findFirst({
        where: {
          name: normalizedDirection,
          institute: { name: normalizedInstitute },
        },
      });

      if (!direction) {
        // Найти/создать institute если надо
        let institute = await prisma.institute.findUnique({
          where: { name: normalizedInstitute },
        });
        if (!institute) {
          institute = await prisma.institute.create({
            data: { name: normalizedInstitute },
          });
        }
        
        // Создать direction
        direction = await prisma.direction.create({
          data: {
            name: normalizedDirection,
            instituteId: institute.id,
          },
        });
      }

      // Затем найдём или создадим программу
      let program = await prisma.program.findFirst({
        where: {
          name: groupInfo.programName,
          directionId: direction.id,
        },
      });

      if (!program) {
        program = await prisma.program.create({
          data: {
            name: groupInfo.programName,
            directionId: direction.id,
          },
        });
      }

      // Наконец найдём или создадим группу
      let group = await prisma.group.findFirst({
        where: {
          number: groupInfo.number,
          course: groupInfo.course,
          studyForm: groupInfo.studyForm,
          programId: program.id,
        },
      });

      if (!group) {
        group = await prisma.group.create({
          data: {
            name: groupInfo.name,
            number: groupInfo.number,
            course: groupInfo.course,
            studyForm: groupInfo.studyForm,
            educationLevel: groupInfo.educationLevel,
            programId: program.id,
          },
        });
        console.log(`   ➕ Создана группа для урока: ${groupInfo.name} (ID: ${group.id})`);
      }

      // Проверяем что ID группы валидный
      if (!group || !group.id || isNaN(Number(group.id))) {
        console.warn(`   ⚠️  Невалидный ID группы для ${groupInfo.name}: ${group?.id}`);
        continue;
      }

      const dayNum = dayNameToNumber[lessonData.dayOfWeek] || 1;
      let pairNum = typeof lessonData.pairNumber === 'string'
        ? parseInt(lessonData.pairNumber)
        : lessonData.pairNumber;

      // Если pairNum не валидное число (NaN или ≤ 0) - пытаемся определить по времени
      if (!pairNum || isNaN(pairNum) || pairNum <= 0) {
        // Нормализуем время сначала
        const { start: timeStart } = normalizeTime(lessonData.time);
        // Определяем номер пары по времени
        pairNum = getPairNumberByTime(timeStart);
        if (!pairNum || pairNum <= 0) {
          console.warn(`   ⚠️  Не удалось определить номер пары для урока в ${groupInfo.name}: время="${lessonData.time}", pairNumber="${lessonData.pairNumber}"`);
          continue;
        }
      }

      // Определяем четность
      let parity = 2; // по-умолчанию обе недели
      if (lessonData.parity === '0') parity = 0; // четная
      else if (lessonData.parity === '1') parity = 1; // нечетная

      // Нормализуем время
      const { start: timeStart, end: timeEnd } = normalizeTime(lessonData.time);
      const lessonType = normalizeLessonType(lessonData.lessonType);

      await prisma.lesson.create({
        data: {
          groupId: group.id,
          dayOfWeek: dayNum,
          pairNumber: pairNum,
          timeStart,
          timeEnd,
          parity,
          subject: lessonData.subject.trim(),
          lessonType,
          teacher: lessonData.teacher.trim(),
          room: lessonData.room.trim(),
          weekStart: 1,
          weekEnd: 18,
        },
      });
      stats.lessonsCreated++;
    }

    console.log(`\n✅ Создано ${stats.lessonsCreated} новых уроков`);

    // ===== ЭТАП 5: Проверить orphaned users =====
    const orphanedUsers = await prisma.user.findMany({
      where: {
        groupId: { not: null },
      },
      select: { id: true, groupId: true },
    });

    stats.orphanedUsers = orphanedUsers.filter(u => u.groupId && !groupsToUpdate.find(g => g.id === u.groupId))
      .length;

    if (stats.orphanedUsers > 0) {
      console.log(
        `\n⚠️  ${stats.orphanedUsers} пользователей привязаны к старым группам (они видят старое расписание)`
      );
      console.log('   💡 Эти пользователи могут пересмотреть расписание и выбрать новый вариант\n');
    }

    console.log('\n📊 ИТОГИ МИГРАЦИИ:');
    console.log(`   ✅ Сохранено пользователей: ${stats.usersPreserved}`);
    console.log(`   ✅ Сохранено групп: ${stats.groupsPreserved}`);
    console.log(`   ➕ Создано новых групп: ${stats.newGroupsCreated}`);
    console.log(`   ➕ Создано новых направлений: ${stats.newDirectionsCreated}`);
    console.log(`   🗑️  Удалено уроков: ${stats.lessonsDeleted}`);
    console.log(`   ✅ Создано новых уроков: ${stats.lessonsCreated}`);
    console.log(`   ⚠️  Пользователей с историческими группами: ${stats.orphanedUsers}\n`);

    console.log('✅ МИГРАЦИЯ УСПЕШНО ЗАВЕРШЕНА!\n');
    return stats;
  } catch (error) {
    console.error('❌ Ошибка при миграции:', error);
    throw error;
  }
}

/**
 * ФУНКЦИЯ ДЛЯ АДМИНИСТРАТОРА: Оставить расписание, но полностью пересоздать структуру
 * (только если нужно менять много направлений)
 */
export async function resetScheduleComplete() {
  console.log('\n🚨 ВНИМАНИЕ! Это удалит ВСЕ группы, направления и уроки!');
  console.log('    Пользователи потеряют привязку к группам.\n');

  const ok = process.argv.includes('--force');
  if (!ok) {
    console.log('   Используйте --force флаг для подтверждения\n');
    return;
  }

  const deleted = await prisma.$transaction([
    prisma.lesson.deleteMany({}),
    prisma.group.deleteMany({}),
    prisma.program.deleteMany({}),
    prisma.direction.deleteMany({}),
    prisma.institute.deleteMany({}),
  ]);

  console.log('✅ Полная очистка завершена:');
  console.log(`   - Удалено ${deleted[0].count} уроков`);
  console.log(`   - Удалено ${deleted[1].count} групп`);
  console.log(`   - Удалено ${deleted[2].count} программ`);
  console.log(`   - Удалено ${deleted[3].count} направлений`);
  console.log(`   - Удалено ${deleted[4].count} институтов\n`);
}
