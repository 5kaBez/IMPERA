export interface Institute {
  id: number;
  name: string;
  shortName?: string;
}

export interface Direction {
  id: number;
  name: string;
  instituteId: number;
  institute?: Institute;
}

export interface Program {
  id: number;
  name: string;
  directionId: number;
  direction?: Direction;
}

export interface Group {
  id: number;
  name: string;
  number: number;
  course: number;
  studyForm: string;
  educationLevel: string;
  programId: number;
  program?: Program;
}

export interface Lesson {
  id: number;
  groupId: number;
  dayOfWeek: number;
  pairNumber: number;
  timeStart: string;
  timeEnd: string;
  parity: number;
  subject: string;
  lessonType: string;
  teacher: string;
  room: string;
  weekStart: number;
  weekEnd: number;
}

export interface User {
  id: number;
  telegramId: string;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  role: string;
  groupId?: number;
  group?: Group;
  notifyBefore: boolean;
  notifyChanges: boolean;
  isSportTeacher?: boolean;
  teachingSections?: Array<{ id: number; name: string; emoji?: string }>;
}

export interface ScheduleDay {
  date: string;
  dayOfWeek: number;
  parity: number;
  weekNumber: number;
  lessons: Lesson[];
}

export interface ScheduleWeek {
  parity: number;
  weekNumber: number;
  days: Record<number, Lesson[]>;
}

export const DAY_NAMES: Record<number, string> = {
  1: 'Понедельник',
  2: 'Вторник',
  3: 'Среда',
  4: 'Четверг',
  5: 'Пятница',
  6: 'Суббота',
  7: 'Воскресенье',
};

export const DAY_NAMES_SHORT: Record<number, string> = {
  1: 'Пн', 2: 'Вт', 3: 'Ср', 4: 'Чт', 5: 'Пт', 6: 'Сб', 7: 'Вс',
};

export const LESSON_TYPE_COLORS: Record<string, string> = {
  'Лекция': 'iron-metal-bg text-white',
  'Практика': 'bg-stone-500/12 text-stone-600 dark:text-stone-400',
  'Лабораторная': 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  'Другое': 'bg-zinc-500/15 text-zinc-500 dark:text-zinc-400',
};

export interface Feedback {
  id: number;
  userId: number;
  type: string;
  message: string;
  status: string;
  reply?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    firstName: string;
    lastName?: string;
    username?: string;
    telegramId?: string;
    group?: { name: string; course: number; number: number };
  };
}

export interface Teacher {
  id: number;
  name: string;
  department?: string;
  photoUrl?: string;
  reviews: Review[];
  avgRating: number;
  reviewCount: number;
}

export interface Review {
  id: number;
  teacherId: number;
  userId: number;
  rating: number;
  text?: string;
  anonymous: boolean;
  createdAt: string;
  user?: {
    firstName: string;
    lastName?: string;
    username?: string;
  };
}

// ===== Физкультура =====
export interface SportSection {
  id: number;
  name: string;
  emoji?: string;
  slots: SportSlot[];
  _count?: { favorites: number };
}

export interface SportSlot {
  id: number;
  sectionId: number;
  section?: SportSection;
  dayOfWeek: number;
  timeStart: string;
  timeEnd: string;
  teacher: string;
  location?: string;
  capacity?: number;
}

export interface SportEnrollment {
  id: number;
  userId: number;
  sectionId: number;
  section?: SportSection;
  createdAt: string;
}

export interface SportProgress {
  confirmed: number;
  pending: number;
  rejected: number;
  total: number;
  required: number;
  percentage: number;
  completed: boolean;
}

export interface SportAttendanceRecord {
  id: number;
  section: string;
  sectionEmoji?: string;
  teacher: string;
  status: 'pending' | 'confirmed' | 'rejected';
  geoOk?: boolean;
  geoDistM?: number;
  checkedInAt: string;
  confirmedAt?: string;
}

// Активная сессия по секции студента
export interface SportActiveSession {
  sessionId: number;
  section: string;
  emoji?: string;
  location?: string;
  teacher: string;
  done: boolean;        // уже отметился?
  status?: string;      // pending/confirmed/rejected
  geoOk?: boolean;
}

export interface SportSessionInfo {
  sessionId: number;
  section: string;
  sectionEmoji?: string;
  status: string;
  startedAt: string;
  students: Array<{
    id: number;
    firstName: string;
    lastName?: string;
    username?: string;
    status: string;
    geoOk?: boolean;
    geoDistM?: number;
    checkedInAt: string;
  }>;
  studentCount: number;
}

export const SPORT_EMOJIS: Record<string, string> = {
  'Атлетизм': '🏋️',
  'Аэробика': '💃',
  'Баскетбол': '🏀',
  'Бокс': '🥊',
  'Бадминтон': '🏸',
  'Волейбол': '🏐',
  'Н. теннис': '🏓',
  'Плавание': '🏊',
  'Самооборона': '🥋',
  'СМГ': '❤️‍🩹',
  'Фитнес': '💪',
  'Футбол': '⚽',
  'Шахматы': '♟️',
};
