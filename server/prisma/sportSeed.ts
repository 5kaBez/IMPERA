/**
 * Seed: Расписание физкультуры ГУУ
 * 13 секций, 5 дней (Пн, Вт, Ср, Пт, Сб), 6 таймслотов
 * Координаты спорткомплекса ГУУ: 55.7390, 37.5353
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GUU_LAT = 55.7390;
const GUU_LON = 37.5353;

// Таймслоты пар
const PAIRS: Record<number, { start: string; end: string }> = {
  1: { start: '09:00', end: '10:30' },
  2: { start: '10:40', end: '12:10' },
  3: { start: '12:55', end: '14:25' },
  4: { start: '14:35', end: '16:05' },
  5: { start: '16:15', end: '17:45' },
  6: { start: '17:55', end: '19:25' },
};

interface SlotData {
  day: number;    // 1=Пн, 2=Вт, 3=Ср, 5=Пт, 6=Сб
  pair: number;   // 1-6
  teacher: string;
  location?: string;
}

interface SectionData {
  name: string;
  emoji: string;
  slots: SlotData[];
}

// === Данные расписания из документа ГУУ ===
const SECTIONS: SectionData[] = [
  {
    name: 'Атлетизм',
    emoji: '🏋️',
    slots: [
      { day: 1, pair: 1, teacher: 'Дзигуа Д.В.' },
      { day: 1, pair: 2, teacher: 'Дзигуа Д.В.' },
      { day: 1, pair: 3, teacher: 'Дзигуа Д.В.' },
      { day: 2, pair: 1, teacher: 'Дзигуа Д.В.' },
      { day: 2, pair: 2, teacher: 'Дзигуа Д.В.' },
      { day: 3, pair: 1, teacher: 'Дзигуа Д.В.' },
      { day: 3, pair: 2, teacher: 'Дзигуа Д.В.' },
      { day: 5, pair: 1, teacher: 'Дзигуа Д.В.' },
      { day: 5, pair: 2, teacher: 'Дзигуа Д.В.' },
      { day: 6, pair: 1, teacher: 'Дзигуа Д.В.' },
      { day: 6, pair: 2, teacher: 'Дзигуа Д.В.' },
    ],
  },
  {
    name: 'Аэробика',
    emoji: '💃',
    slots: [
      { day: 1, pair: 3, teacher: 'Цыганкова В.О.' },
      { day: 1, pair: 4, teacher: 'Цыганкова В.О.' },
      { day: 2, pair: 3, teacher: 'Цыганкова В.О.' },
      { day: 2, pair: 4, teacher: 'Цыганкова В.О.' },
      { day: 3, pair: 3, teacher: 'Цыганкова В.О.' },
      { day: 3, pair: 4, teacher: 'Цыганкова В.О.' },
      { day: 5, pair: 1, teacher: 'Цыганкова В.О.' },
      { day: 5, pair: 2, teacher: 'Цыганкова В.О.' },
      { day: 6, pair: 1, teacher: 'Цыганкова В.О.' },
      { day: 6, pair: 2, teacher: 'Цыганкова В.О.' },
    ],
  },
  {
    name: 'Баскетбол',
    emoji: '🏀',
    slots: [
      { day: 1, pair: 1, teacher: 'Кириллов В.Н.' },
      { day: 1, pair: 2, teacher: 'Кириллов В.Н.' },
      { day: 1, pair: 5, teacher: 'Кириллов В.Н.' },
      { day: 1, pair: 6, teacher: 'Кириллов В.Н.' },
      { day: 2, pair: 3, teacher: 'Кириллов В.Н.' },
      { day: 2, pair: 4, teacher: 'Кириллов В.Н.' },
      { day: 3, pair: 3, teacher: 'Кириллов В.Н.' },
      { day: 3, pair: 4, teacher: 'Кириллов В.Н.' },
      { day: 5, pair: 3, teacher: 'Кириллов В.Н.' },
      { day: 5, pair: 4, teacher: 'Кириллов В.Н.' },
      { day: 6, pair: 3, teacher: 'Кириллов В.Н.' },
    ],
  },
  {
    name: 'Бокс',
    emoji: '🥊',
    slots: [
      { day: 1, pair: 1, teacher: 'Козлов Р.С.' },
      { day: 1, pair: 2, teacher: 'Козлов Р.С.' },
      { day: 2, pair: 1, teacher: 'Козлов Р.С.' },
      { day: 2, pair: 2, teacher: 'Козлов Р.С.' },
      { day: 3, pair: 1, teacher: 'Козлов Р.С.' },
      { day: 3, pair: 2, teacher: 'Козлов Р.С.' },
      { day: 5, pair: 3, teacher: 'Козлов Р.С.' },
      { day: 5, pair: 4, teacher: 'Козлов Р.С.' },
    ],
  },
  {
    name: 'Бадминтон',
    emoji: '🏸',
    slots: [
      { day: 1, pair: 3, teacher: 'Пасечник Ж.В.' },
      { day: 1, pair: 4, teacher: 'Пасечник Ж.В.' },
      { day: 2, pair: 5, teacher: 'Пасечник Ж.В.' },
      { day: 2, pair: 6, teacher: 'Пасечник Ж.В.' },
      { day: 3, pair: 1, teacher: 'Пасечник Ж.В.' },
      { day: 3, pair: 2, teacher: 'Пасечник Ж.В.' },
      { day: 5, pair: 1, teacher: 'Пасечник Ж.В.' },
      { day: 5, pair: 2, teacher: 'Пасечник Ж.В.' },
      { day: 6, pair: 1, teacher: 'Пасечник Ж.В.' },
      { day: 6, pair: 2, teacher: 'Пасечник Ж.В.' },
    ],
  },
  {
    name: 'Волейбол',
    emoji: '🏐',
    slots: [
      { day: 1, pair: 3, teacher: 'Гераськин А.А.' },
      { day: 1, pair: 4, teacher: 'Гераськин А.А.' },
      { day: 1, pair: 5, teacher: 'Гераськин А.А.' },
      { day: 2, pair: 1, teacher: 'Гераськин А.А.' },
      { day: 2, pair: 2, teacher: 'Гераськин А.А.' },
      { day: 3, pair: 3, teacher: 'Гераськин А.А.' },
      { day: 3, pair: 4, teacher: 'Гераськин А.А.' },
      { day: 5, pair: 3, teacher: 'Гераськин А.А.' },
      { day: 5, pair: 4, teacher: 'Гераськин А.А.' },
      { day: 6, pair: 1, teacher: 'Гераськин А.А.' },
      { day: 6, pair: 2, teacher: 'Гераськин А.А.' },
    ],
  },
  {
    name: 'Н. теннис',
    emoji: '🏓',
    slots: [
      { day: 1, pair: 1, teacher: 'Афонина И.П.' },
      { day: 1, pair: 2, teacher: 'Афонина И.П.' },
      { day: 2, pair: 3, teacher: 'Афонина И.П.' },
      { day: 2, pair: 4, teacher: 'Афонина И.П.' },
      { day: 3, pair: 5, teacher: 'Афонина И.П.' },
      { day: 3, pair: 6, teacher: 'Афонина И.П.' },
      { day: 5, pair: 1, teacher: 'Афонина И.П.' },
      { day: 5, pair: 2, teacher: 'Афонина И.П.' },
      { day: 6, pair: 3, teacher: 'Афонина И.П.' },
    ],
  },
  {
    name: 'Плавание',
    emoji: '🏊',
    slots: [
      { day: 1, pair: 1, teacher: 'Головко Н.Г.', location: 'Бассейн' },
      { day: 1, pair: 2, teacher: 'Головко Н.Г.', location: 'Бассейн' },
      { day: 1, pair: 3, teacher: 'Головко Н.Г.', location: 'Бассейн' },
      { day: 2, pair: 1, teacher: 'Головко Н.Г.', location: 'Бассейн' },
      { day: 2, pair: 2, teacher: 'Головко Н.Г.', location: 'Бассейн' },
      { day: 3, pair: 1, teacher: 'Головко Н.Г.', location: 'Бассейн' },
      { day: 3, pair: 2, teacher: 'Головко Н.Г.', location: 'Бассейн' },
      { day: 5, pair: 1, teacher: 'Головко Н.Г.', location: 'Бассейн' },
      { day: 5, pair: 2, teacher: 'Головко Н.Г.', location: 'Бассейн' },
      { day: 6, pair: 1, teacher: 'Головко Н.Г.', location: 'Бассейн' },
      { day: 6, pair: 2, teacher: 'Головко Н.Г.', location: 'Бассейн' },
    ],
  },
  {
    name: 'Самооборона',
    emoji: '🥋',
    slots: [
      { day: 1, pair: 5, teacher: 'Мамаев А.В.' },
      { day: 1, pair: 6, teacher: 'Мамаев А.В.' },
      { day: 2, pair: 5, teacher: 'Мамаев А.В.' },
      { day: 2, pair: 6, teacher: 'Мамаев А.В.' },
      { day: 3, pair: 5, teacher: 'Мамаев А.В.' },
      { day: 3, pair: 6, teacher: 'Мамаев А.В.' },
      { day: 5, pair: 5, teacher: 'Мамаев А.В.' },
      { day: 5, pair: 6, teacher: 'Мамаев А.В.' },
    ],
  },
  {
    name: 'СМГ',
    emoji: '❤️‍🩹',
    slots: [
      { day: 1, pair: 3, teacher: 'Пасечник Ж.В.' },
      { day: 1, pair: 4, teacher: 'Пасечник Ж.В.' },
      { day: 2, pair: 1, teacher: 'Пасечник Ж.В.' },
      { day: 2, pair: 2, teacher: 'Пасечник Ж.В.' },
      { day: 3, pair: 3, teacher: 'Пасечник Ж.В.' },
      { day: 3, pair: 4, teacher: 'Пасечник Ж.В.' },
      { day: 5, pair: 3, teacher: 'Пасечник Ж.В.' },
      { day: 5, pair: 4, teacher: 'Пасечник Ж.В.' },
    ],
  },
  {
    name: 'Фитнес',
    emoji: '💪',
    slots: [
      { day: 1, pair: 1, teacher: 'Козина Г.Ю.' },
      { day: 1, pair: 2, teacher: 'Козина Г.Ю.' },
      { day: 2, pair: 3, teacher: 'Козина Г.Ю.' },
      { day: 2, pair: 4, teacher: 'Козина Г.Ю.' },
      { day: 3, pair: 1, teacher: 'Козина Г.Ю.' },
      { day: 3, pair: 2, teacher: 'Козина Г.Ю.' },
      { day: 5, pair: 5, teacher: 'Козина Г.Ю.' },
      { day: 5, pair: 6, teacher: 'Козина Г.Ю.' },
      { day: 6, pair: 3, teacher: 'Козина Г.Ю.' },
    ],
  },
  {
    name: 'Футбол',
    emoji: '⚽',
    slots: [
      { day: 1, pair: 5, teacher: 'Петухов А.В.' },
      { day: 1, pair: 6, teacher: 'Петухов А.В.' },
      { day: 2, pair: 5, teacher: 'Петухов А.В.' },
      { day: 2, pair: 6, teacher: 'Петухов А.В.' },
      { day: 3, pair: 5, teacher: 'Петухов А.В.' },
      { day: 3, pair: 6, teacher: 'Петухов А.В.' },
      { day: 5, pair: 5, teacher: 'Петухов А.В.' },
      { day: 5, pair: 6, teacher: 'Петухов А.В.' },
      { day: 6, pair: 3, teacher: 'Петухов А.В.' },
      { day: 6, pair: 4, teacher: 'Петухов А.В.' },
    ],
  },
  {
    name: 'Шахматы',
    emoji: '♟️',
    slots: [
      { day: 1, pair: 3, teacher: 'Рощин А.Б.' },
      { day: 1, pair: 4, teacher: 'Рощин А.Б.' },
      { day: 2, pair: 1, teacher: 'Рощин А.Б.' },
      { day: 2, pair: 2, teacher: 'Рощин А.Б.' },
      { day: 3, pair: 1, teacher: 'Рощин А.Б.' },
      { day: 3, pair: 2, teacher: 'Рощин А.Б.' },
      { day: 5, pair: 1, teacher: 'Рощин А.Б.' },
      { day: 5, pair: 2, teacher: 'Рощин А.Б.' },
      { day: 6, pair: 1, teacher: 'Рощин А.Б.' },
      { day: 6, pair: 2, teacher: 'Рощин А.Б.' },
    ],
  },
];

export async function seedSports() {
  // Проверяем, есть ли уже данные
  const count = await prisma.sportSection.count();
  if (count > 0) {
    console.log(`Sports: ${count} sections already exist, skipping seed.`);
    return;
  }

  console.log('Seeding sports schedule...');
  let sectionCount = 0;
  let slotCount = 0;

  for (const s of SECTIONS) {
    const section = await prisma.sportSection.create({
      data: {
        name: s.name,
        emoji: s.emoji,
        geoLat: GUU_LAT,
        geoLon: GUU_LON,
      },
    });
    sectionCount++;

    for (const slot of s.slots) {
      const pair = PAIRS[slot.pair];
      await prisma.sportSlot.create({
        data: {
          sectionId: section.id,
          dayOfWeek: slot.day,
          timeStart: pair.start,
          timeEnd: pair.end,
          teacher: slot.teacher,
          location: slot.location || 'Спорткомплекс ГУУ',
        },
      });
      slotCount++;
    }
  }

  console.log(`Sports seed complete: ${sectionCount} sections, ${slotCount} slots`);
}

// Можно запустить напрямую: npx tsx prisma/sportSeed.ts
if (require.main === module) {
  seedSports()
    .then(() => prisma.$disconnect())
    .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
}
