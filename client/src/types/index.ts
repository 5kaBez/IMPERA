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
  'Лекция': 'bg-blue-500/20 text-blue-400 dark:bg-blue-500/20 dark:text-blue-300',
  'Практика': 'bg-green-500/20 text-green-600 dark:bg-green-500/20 dark:text-green-300',
  'Лабораторная': 'bg-orange-500/20 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300',
  'Другое': 'bg-gray-500/20 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300',
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
