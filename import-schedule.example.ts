#!/usr/bin/env node
/**
 * Пример: Безопасный импорт расписания через API
 * 
 * Использование:
 * ts-node import-schedule.example.ts
 * 
 * ИЛИ через curl:
 * curl -X POST http://localhost:3001/api/admin/import-safe \
 *   -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
 *   -F "files=@1.xlsx" \
 *   -F "files=@2.xlsx" \
 *   -F "files=@3.xlsx" \
 *   -F "files=@4.xlsx"
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

interface ImportResult {
  success: boolean;
  message: string;
  recordsParsed?: number;
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
}

/**
 * Загружает расписание из Excel файлов
 */
async function importSchedule(
  serverUrl: string = 'http://localhost:3001',
  adminToken: string = process.env.ADMIN_TOKEN || '',
  scheduleDir: string = './schedule'
) {
  console.log('\n🚀 БЕЗОПАСНЫЙ ИМПОРТ РАСПИСАНИЯ\n');

  try {
    // ===== Шаг 1: Проверяем файлы =====
    console.log('📂 Ищем файлы Excel...\n');

    const supportedFiles = ['1.xlsx', '2.xlsx', '3.xlsx', '4.xlsx', 'z.xlsx', 'm.xlsx', 'schedule_full.xlsx'];
    const filesToupload: string[] = [];

    for (const filename of supportedFiles) {
      const filepath = path.join(scheduleDir, filename);
      if (fs.existsSync(filepath)) {
        filesToupload.push(filepath);
        console.log(`   ✅ Найден: ${filename}`);
      }
    }

    if (filesToupload.length === 0) {
      console.error('\n❌ Ошибка: Не найдены файлы Excel в директории:', scheduleDir);
      console.error('   Ожидаемые файлы: 1.xlsx, 2.xlsx, 3.xlsx, 4.xlsx, z.xlsx, m.xlsx, schedule_full.xlsx');
      process.exit(1);
    }

    console.log(`\n✅ К загрузке ${filesToupload.length} файлов\n`);

    // ===== Шаг 2: Подготавливаем FormData =====
    console.log('📝 Подготавливаю запрос...\n');

    const form = new FormData();
    for (const filepath of filesToupload) {
      form.append('files', fs.createReadStream(filepath));
    }

    // ===== Шаг 3: Отправляем запрос =====
    console.log('🔄 Отправляю на сервер...\n');

    const response = await axios.post(`${serverUrl}/api/admin/import-safe`, form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${adminToken}`,
      },
      timeout: 60000, // 60 секунд (может быть долгое парсирование)
    });

    const result: ImportResult = response.data;

    // ===== Шаг 4: Выводим результаты =====
    console.log('\n' + '='.repeat(60));
    console.log('📊 РЕЗУЛЬТАТЫ ИМПОРТА');
    console.log('='.repeat(60) + '\n');

    if (result.success) {
      console.log('✅ ИМПОРТ УСПЕШНО ЗАВЕРШЕН!\n');
      console.log(`📖 Распарсено записей: ${result.recordsParsed}`);

      if (result.stats) {
        const s = result.stats;
        console.log('\n👥 ПОЛЬЗОВАТЕЛИ:');
        console.log(`   ✅ Сохранено: ${s.usersPreserved}`);
        if (s.orphanedUsers > 0) {
          console.log(`   ⚠️  Исторических версий: ${s.orphanedUsers} (видят старое расписание)`);
        }

        console.log('\n📚 СТРУКТУРА:');
        console.log(`   ✅ Сохранено групп: ${s.groupsPreserved}`);
        console.log(`   ➕ Создано новых групп: ${s.newGroupsCreated}`);
        console.log(`   ➕ Создано новых направлений: ${s.newDirectionsCreated}`);

        console.log('\n📅 РАСПИСАНИЕ:');
        console.log(`   🗑️  Удалено уроков: ${s.lessonsDeleted}`);
        console.log(`   ✅ Создано новых уроков: ${s.lessonsCreated}`);

        console.log('\n' + '='.repeat(60));
        console.log('✨ СТАТУС: ВСЕ ПОЛЬЗОВАТЕЛИ ВИДЯТ СВОЁ НОВОЕ РАСПИСАНИЕ!');
        console.log('='.repeat(60) + '\n');
      }
    } else {
      console.error('❌ ОШИБКА ПРИ ИМПОРТЕ:\n');
      console.error(result.message);
      if (result.error) console.error('Код ошибки:', result.error);
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ ОШИБКА СЕТИ:\n');

    if (error.response) {
      console.error('Статус:', error.response.status);
      console.error('Ответ сервера:', error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Не удалось подключиться к серверу:', error.message);
      console.error('Проверьте:');
      console.error('  - Сервер запущен?');
      console.error('  - URL правильный?');
      console.error('  - Портовое рассоединение?');
    } else {
      console.error(error.message);
    }

    process.exit(1);
  }
}

/**
 * Основная функция
 */
async function main() {
  // Параметры из переменных окружения или дефолты
  const serverUrl = process.env.IMPERA_SERVER_URL || 'http://localhost:3001';
  const adminToken = process.env.ADMIN_TOKEN || process.env.IMPERA_ADMIN_TOKEN || '';
  const scheduleDir = process.argv[2] || './schedule';

  if (!adminToken) {
    console.warn('⚠️ ВНИМАНИЕ: Переменная ADMIN_TOKEN не установлена!');
    console.warn('   Установите её перед запуском:');
    console.warn('   export ADMIN_TOKEN="your_token_here"');
    console.warn('   (или IMPERA_ADMIN_TOKEN для переменной по-умолчанию)\n');
  }

  await importSchedule(serverUrl, adminToken, scheduleDir);
}

main();
