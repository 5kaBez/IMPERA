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
      // Пн
      { day: 1, pair: 1, teacher: 'Мамышев' },
      { day: 1, pair: 2, teacher: 'Мамышев' },
      { day: 1, pair: 3, teacher: 'Мамышев' },
      // Вт
      { day: 2, pair: 1, teacher: 'Кокорев' },
      { day: 2, pair: 2, teacher: 'Мамышев' },
      { day: 2, pair: 3, teacher: 'Мамышев' },
      // Ср
      { day: 3, pair: 1, teacher: 'Мамышев' },
      { day: 3, pair: 2, teacher: 'Мамышев' },
      { day: 3, pair: 3, teacher: 'Домашенко' },
      // Чт
      { day: 4, pair: 1, teacher: 'Мамышев' },
      { day: 4, pair: 2, teacher: 'Мамышев' },
      { day: 4, pair: 3, teacher: 'Домашенко' },
      // Пт
      { day: 5, pair: 1, teacher: 'Кокорев' },
      { day: 5, pair: 2, teacher: 'Мамышев' },
      { day: 5, pair: 3, teacher: 'Мамышев' },
      // Сб
      { day: 6, pair: 1, teacher: 'Кокорев' },
      { day: 6, pair: 2, teacher: 'Кокорев' },
      { day: 6, pair: 3, teacher: 'Мамышев' },
    ],
  },
  {
    name: 'Аэробика',
    emoji: '💃',
    slots: [
      // Пн
      { day: 1, pair: 1, teacher: 'Суверкина' },
      { day: 1, pair: 2, teacher: 'Суверкина' },
      { day: 1, pair: 3, teacher: 'Суверкина' },
      // Вт
      { day: 2, pair: 1, teacher: 'Суверкина' },
      { day: 2, pair: 2, teacher: 'Суверкина' },
      { day: 2, pair: 3, teacher: 'Суверкина' },
      // Ср
      { day: 3, pair: 1, teacher: 'Суверкина' },
      { day: 3, pair: 2, teacher: 'Суверкина' },
      { day: 3, pair: 3, teacher: 'Суверкина' },
      // Чт
      { day: 4, pair: 1, teacher: 'Суверкина' },
      { day: 4, pair: 2, teacher: 'Суверкина' },
      { day: 4, pair: 3, teacher: 'Суверкина' },
      // Пт
      { day: 5, pair: 1, teacher: 'Суверкина' },
      { day: 5, pair: 2, teacher: 'Суверкина' },
      { day: 5, pair: 3, teacher: 'Суверкина' },
      // Сб
      { day: 6, pair: 1, teacher: 'Суверкина' },
      { day: 6, pair: 3, teacher: 'Махотина' },
    ],
  },
  {
    name: 'Баскетбол',
    emoji: '🏀',
    slots: [
      // Пн
      { day: 1, pair: 2, teacher: 'Меркулова' },
      { day: 1, pair: 3, teacher: 'Меркулова' },
      // Вт
      { day: 2, pair: 2, teacher: 'Меркулова' },
      { day: 2, pair: 3, teacher: 'Меркулова' },
      // Ср
      { day: 3, pair: 2, teacher: 'Меркулова' },
      { day: 3, pair: 3, teacher: 'Меркулова' },
      // Чт
      { day: 4, pair: 2, teacher: 'Меркулова' },
      { day: 4, pair: 3, teacher: 'Меркулова' },
      // Пт
      { day: 5, pair: 2, teacher: 'Меркулова' },
      { day: 5, pair: 3, teacher: 'Меркулова' },
      // Сб
      { day: 6, pair: 2, teacher: 'Носач' },
      { day: 6, pair: 3, teacher: 'Носач' },
    ],
  },
  {
    name: 'Бокс',
    emoji: '🥊',
    slots: [
      // Пн
      { day: 1, pair: 1, teacher: 'Домашенко' },
      { day: 1, pair: 2, teacher: 'Домашенко' },
      // Вт
      { day: 2, pair: 1, teacher: 'Домашенко' },
      { day: 2, pair: 2, teacher: 'Домашенко' },
      // Ср
      { day: 3, pair: 1, teacher: 'Домашенко' },
      { day: 3, pair: 2, teacher: 'Домашенко' },
      // Чт
      { day: 4, pair: 1, teacher: 'Домашенко' },
      { day: 4, pair: 2, teacher: 'Домашенко' },
      // Пт
      { day: 5, pair: 1, teacher: 'Домашенко' },
      { day: 5, pair: 2, teacher: 'Домашенко' },
      // Сб
      { day: 6, pair: 1, teacher: 'Домашенко' },
      { day: 6, pair: 2, teacher: 'Домашенко' },
    ],
  },
  {
    name: 'Бадминтон',
    emoji: '🏸',
    slots: [
      // Пн
      { day: 1, pair: 1, teacher: 'Кабанова' },
      { day: 1, pair: 2, teacher: 'Кабанова' },
      // Вт
      { day: 2, pair: 1, teacher: 'Кабанова' },
      { day: 2, pair: 2, teacher: 'Кабанова' },
      // Ср
      { day: 3, pair: 1, teacher: 'Кабанова' },
      { day: 3, pair: 2, teacher: 'Кабанова' },
      // Чт
      { day: 4, pair: 1, teacher: 'Туржанидзе' },
      { day: 4, pair: 2, teacher: 'Туржанидзе' },
      // Пт
      { day: 5, pair: 1, teacher: 'Кокорев' },
      { day: 5, pair: 2, teacher: 'Кокорев' },
      // Сб
      { day: 6, pair: 1, teacher: 'Кокорев' },
    ],
  },
  {
    name: 'Волейбол',
    emoji: '🏐',
    slots: [
      // Пн
      { day: 1, pair: 3, teacher: 'Баранцев' },
      { day: 1, pair: 4, teacher: 'Баранцев' },
      // Вт
      { day: 2, pair: 3, teacher: 'Баранцев' },
      { day: 2, pair: 4, teacher: 'Баранцев' },
      // Ср
      { day: 3, pair: 3, teacher: 'Баранцев' },
      { day: 3, pair: 4, teacher: 'Баранцев' },
      // Чт
      { day: 4, pair: 3, teacher: 'Баранцев' },
      { day: 4, pair: 4, teacher: 'Баранцев' },
      // Пт
      { day: 5, pair: 3, teacher: 'Баранцев' },
      { day: 5, pair: 4, teacher: 'Баранцев' },
      // Сб
      { day: 6, pair: 3, teacher: 'Геракова' },
      { day: 6, pair: 4, teacher: 'Геракова' },
    ],
  },
  {
    name: 'Н. теннис',
    emoji: '🏓',
    slots: [
      // Пн
      { day: 1, pair: 1, teacher: 'Логачёв' },
      { day: 1, pair: 2, teacher: 'Логачёв' },
      // Вт
      { day: 2, pair: 3, teacher: 'Логачёв' },
      { day: 2, pair: 4, teacher: 'Логачёв' },
      // Ср
      { day: 3, pair: 5, teacher: 'Кривой' },
      { day: 3, pair: 6, teacher: 'Логачёв' },
      // Чт
      { day: 4, pair: 3, teacher: 'Кривой' },
      { day: 4, pair: 4, teacher: 'Логачёв' },
      // Пт
      { day: 5, pair: 1, teacher: 'Логачёв' },
      { day: 5, pair: 2, teacher: 'Логачёв' },
      // Сб
      { day: 6, pair: 3, teacher: 'Логачёв' },
    ],
  },
  {
    name: 'Плавание',
    emoji: '🏊',
    slots: [
      // Пн
      { day: 1, pair: 1, teacher: 'Раевский' },
      { day: 1, pair: 2, teacher: 'Раевский' },
      // Вт
      { day: 2, pair: 1, teacher: 'Теренкова' },
      { day: 2, pair: 2, teacher: 'Теренкова' },
      // Ср
      { day: 3, pair: 1, teacher: 'Раевский' },
      { day: 3, pair: 2, teacher: 'Раевский' },
      // Чт
      { day: 4, pair: 1, teacher: 'Теренкова' },
      { day: 4, pair: 2, teacher: 'Теренкова' },
      // Пт
      { day: 5, pair: 1, teacher: 'Раевский' },
      { day: 5, pair: 2, teacher: 'Раевский' },
      // Сб
      { day: 6, pair: 1, teacher: 'Раевский' },
      { day: 6, pair: 2, teacher: 'Раевский' },
    ],
  },
  {
    name: 'Самооборона',
    emoji: '🥸',
    slots: [
      // Пн
      { day: 1, pair: 4, teacher: 'Пронцус' },
      // Вт
      { day: 2, pair: 4, teacher: 'Пронцус' },
      // Ср
      { day: 3, pair: 4, teacher: 'Пронцус' },
      // Чт
      { day: 4, pair: 4, teacher: 'Земелин' },
      // Пт
      { day: 5, pair: 4, teacher: 'Земелин' },
    ],
  },
  {
    name: 'СМГ',
    emoji: '✅',
    slots: [
      // Пн
      { day: 1, pair: 1, teacher: 'Серегина' },
      { day: 1, pair: 2, teacher: 'Серегина' },
      { day: 1, pair: 3, teacher: 'Серегина' },
      // Вт
      { day: 2, pair: 1, teacher: 'Серегина' },
      { day: 2, pair: 2, teacher: 'Серегина' },
      { day: 2, pair: 3, teacher: 'Серегина' },
      // Ср
      { day: 3, pair: 1, teacher: 'Серегина' },
      { day: 3, pair: 2, teacher: 'Серегина' },
      { day: 3, pair: 3, teacher: 'Серегина' },
      // Чт
      { day: 4, pair: 1, teacher: 'Серегина' },
      { day: 4, pair: 2, teacher: 'Серегина' },
      // Пт
      { day: 5, pair: 1, teacher: 'Серегина' },
      { day: 5, pair: 2, teacher: 'Серегина' },
      { day: 5, pair: 3, teacher: 'Серегина' },
      // Сб
      { day: 6, pair: 2, teacher: 'Кабанова' },
      { day: 6, pair: 3, teacher: 'Кабанова' },
    ],
  },
  {
    name: 'Фитнес',
    emoji: '💪',
    slots: [
      // Пн
      { day: 1, pair: 1, teacher: 'Вещшева' },
      { day: 1, pair: 2, teacher: 'Вещшева' },
      // Вт
      { day: 2, pair: 1, teacher: 'Вещшева' },
      { day: 2, pair: 2, teacher: 'Вещшева' },
      // Ср
      { day: 3, pair: 1, teacher: 'Вещшева' },
      { day: 3, pair: 2, teacher: 'Вещшева' },
      // Чт
      { day: 4, pair: 1, teacher: 'Чернова' },
      { day: 4, pair: 2, teacher: 'Чернова' },
      // Пт
      { day: 5, pair: 1, teacher: 'Чернова' },
      { day: 5, pair: 2, teacher: 'Чернова' },
      // Сб
      { day: 6, pair: 3, teacher: 'Кокорев' },
      { day: 6, pair: 4, teacher: 'Кокорев' },
    ],
  },
  {
    name: 'Футбол',
    emoji: '⚽',
    slots: [
      // Пн
      { day: 1, pair: 5, teacher: 'Чичерин' },
      { day: 1, pair: 6, teacher: 'Чичерин' },
      // Вт
      { day: 2, pair: 5, teacher: 'Хромов' },
      { day: 2, pair: 6, teacher: 'Хромов' },
      // Ср
      { day: 3, pair: 5, teacher: 'Хромов' },
      { day: 3, pair: 6, teacher: 'Хромов' },
      // Чт
      { day: 4, pair: 5, teacher: 'Чичерин' },
      { day: 4, pair: 6, teacher: 'Чичерин' },
      // Пт - нет
      // Сб
      { day: 6, pair: 5, teacher: 'Чичерин' },
      { day: 6, pair: 6, teacher: 'Чичерин' },
    ],
  },
  {
    name: 'Шахматы',
    emoji: '♟️',
    slots: [
      // Пн - нет
      // Вт - нет
      // Ср
      { day: 3, pair: 5, teacher: 'Баранцев' },
      { day: 3, pair: 6, teacher: 'Баранцев' },
      // Чт
      { day: 4, pair: 5, teacher: 'Чернова' },
      { day: 4, pair: 6, teacher: 'Чернова' },
      // Пт
      { day: 5, pair: 5, teacher: 'Логачёв' },
      { day: 5, pair: 6, teacher: 'Логачёв' },
      // Сб - нет
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
