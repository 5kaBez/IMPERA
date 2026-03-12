/**
 * Интеграция улучшенного парсера GUU с безопасной миграцией расписания
 */

import { PrismaClient } from '@prisma/client';
import { parseGUUScheduleFiles, type FileInput, type ParsedRecord, recordsToXlsxBuffer } from './guuParser';
import { migrateSchedule } from './scheduleMigration';

export interface SafeImportResult {
  success: boolean;
  message: string;
  stats?: {
    usersPreserved: number;
    groupsPreserved: number;
    lessonsDeleted: number;
    lessonsCreated: number;
    newGroupsCreated: number;
    newDirectionsCreated: number;
    orphanedUsers: number;
  };
  error?: string;
  recordsParsed?: number;
}

/**
 * Безопасное импортирование расписания из Excel файлов
 * 
 * Процесс:
 * 1. Парсит файлы Excel (1.xlsx, 2.xlsx, 3.xlsx, 4.xlsx, z.xlsx, m.xlsx)
 * 2. Преобразует в стандартный формат
 * 3. Выполняет безопасную миграцию (сохраняет пользователей, обновляет уроки)
 */
export async function safeImportScheduleFromExcel(
  files: FileInput[],
  prisma: PrismaClient
): Promise<SafeImportResult> {
  try {
    console.log('\n🔄 БЕЗОПАСНЫЙ ИМПОРТ РАСПИСАНИЯ\n');

    // ===== ЭТАП 1: Парсим файлы =====
    console.log('📖 Этап 1: Парсирование Excel файлов...');
    const parsedRecords = parseGUUScheduleFiles(files);

    if (parsedRecords.length === 0) {
      return {
        success: false,
        message: 'Ошибка: не найдено ни одной записи расписания в файлах',
        error: 'NO_RECORDS_PARSED',
      };
    }

    console.log(`✅ Распарсено ${parsedRecords.length} записей\n`);

    // ===== ЭТАП 2: Подготовка данных для миграции =====
    console.log('📋 Этап 2: Подготовка данных к миграции...');

    // Собираем уникальные группы
    const groupsMap = new Map<string, {
      number: number;
      name: string;
      course: number;
      studyForm: string;
      educationLevel: string;
      directionName: string;
      instituteName: string;
      programName: string;
    }>();

    const lessonsData: Array<{
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
    }> = [];

    // Процесс агрегации
    for (const record of parsedRecords) {
      // Ключ для уникальности группы
      const groupKey = `${record.institute}|${record.direction}|${record.program}|${record.groupNumber}`;

      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          number: record.groupNumber,
          name: record.groupName,
          course: record.course,
          studyForm: record.studyForm,
          educationLevel: record.educationLevel,
          directionName: record.direction,
          instituteName: record.institute,
          programName: record.program,
        });
      }

      // Добавляем урок
      lessonsData.push({
        groupNumber: record.groupNumber,
        dayOfWeek: record.dayOfWeek,
        pairNumber: record.pairNumber,
        time: record.time,
        parity: record.parity,
        subject: record.subject,
        lessonType: record.lessonType,
        teacher: record.teacher,
        room: record.room,
        weeks: record.weeks,
      });
    }

    const groupsData = Array.from(groupsMap.values());
    console.log(`✅ Подготовлено ${groupsData.length} групп и ${lessonsData.length} уроков\n`);

    // ===== ЭТАП 3: Выполняем безопасную миграцию =====
    console.log('🔒 Этап 3: Выполнение безопасной миграции...\n');
    const migrationStats = await migrateSchedule(groupsData, lessonsData);

    return {
      success: true,
      message: 'Расписание успешно импортировано с сохранением пользователей',
      stats: migrationStats,
      recordsParsed: parsedRecords.length,
    };
  } catch (error: any) {
    console.error('❌ Ошибка при безопасном импорте:', error);
    return {
      success: false,
      message: `Ошибка при импорте: ${error.message}`,
      error: error.code || 'IMPORT_ERROR',
    };
  }
}

/**
 * Альтернативный способ: импорт уже готового файла schedule_full.xlsx
 * Этот файл можно создать вручную или скачать с GUU
 */
export async function importPreformedSchedule(
  xlsxBuffer: Buffer,
  prisma: PrismaClient
): Promise<SafeImportResult> {
  try {
    // Конвертируем XLSX в FileInput для парсера
    const fileInput: FileInput = {
      filename: 'schedule_full.xlsx',
      buffer: xlsxBuffer,
    };

    return await safeImportScheduleFromExcel([fileInput], prisma);
  } catch (error: any) {
    return {
      success: false,
      message: `Ошибка при импорте файла: ${error.message}`,
      error: error.code || 'IMPORT_ERROR',
    };
  }
}
