import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { Lesson, ScheduleDay, ScheduleWeek } from '../types';
import { DAY_NAMES, LESSON_TYPE_COLORS } from '../types';
import { Calendar, Clock, MapPin, User, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';

type Tab = 'today' | 'tomorrow' | 'week';

export default function SchedulePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('today');
  const [todayData, setTodayData] = useState<ScheduleDay | null>(null);
  const [tomorrowData, setTomorrowData] = useState<ScheduleDay | null>(null);
  const [weekData, setWeekData] = useState<ScheduleWeek | null>(null);
  const [loading, setLoading] = useState(true);

  const groupId = user?.groupId;

  useEffect(() => {
    if (!groupId) { setLoading(false); return; }
    setLoading(true);

    if (tab === 'today') {
      api.get<ScheduleDay>(`/schedule/${groupId}/today`).then(setTodayData).finally(() => setLoading(false));
    } else if (tab === 'tomorrow') {
      api.get<ScheduleDay>(`/schedule/${groupId}/tomorrow`).then(setTomorrowData).finally(() => setLoading(false));
    } else {
      api.get<ScheduleWeek>(`/schedule/${groupId}/week`).then(setWeekData).finally(() => setLoading(false));
    }
  }, [groupId, tab]);

  const now = new Date();
  const todayFormatted = now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Расписание</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 capitalize">{todayFormatted}</p>
        {user?.group && (
          <p className="text-xs text-indigo-500 mt-1">
            {user.group.program?.direction?.institute?.name} &bull; {user.group.name} &bull; {user.group.course} курс
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl mb-6">
        {([
          { key: 'today', label: 'Сегодня' },
          { key: 'tomorrow', label: 'Завтра' },
          { key: 'week', label: 'Неделя' },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {!groupId ? (
        <div className="text-center py-16">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
          <p className="text-lg font-medium text-gray-500 dark:text-gray-400">Группа не выбрана</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Выберите группу в профиле, чтобы видеть расписание</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {tab === 'today' && todayData && (
            <DaySchedule data={todayData} emptyMessage="Сегодня нет занятий" />
          )}
          {tab === 'tomorrow' && tomorrowData && (
            <DaySchedule data={tomorrowData} emptyMessage="Завтра нет занятий" />
          )}
          {tab === 'week' && weekData && (
            <WeekSchedule data={weekData} />
          )}
        </>
      )}
    </div>
  );
}

function DaySchedule({ data, emptyMessage }: { data: ScheduleDay; emptyMessage: string }) {
  if (data.lessons.length === 0) {
    return (
      <div className="text-center py-16">
        <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
        <p className="text-lg font-medium text-gray-500 dark:text-gray-400">{emptyMessage}</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          {data.parity === 1 ? 'Нечётная неделя' : 'Чётная неделя'} (№{data.weekNumber})
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
          {DAY_NAMES[data.dayOfWeek]}
        </span>
        <span className="text-xs text-gray-400">
          {data.parity === 1 ? 'Нечётная' : 'Чётная'} неделя №{data.weekNumber}
        </span>
      </div>
      <div className="space-y-3">
        {data.lessons.map(lesson => (
          <LessonCard key={lesson.id} lesson={lesson} />
        ))}
      </div>
    </div>
  );
}

function WeekSchedule({ data }: { data: ScheduleWeek }) {
  const daysWithLessons = Object.entries(data.days)
    .map(([day, lessons]) => ({ day: parseInt(day), lessons }))
    .sort((a, b) => a.day - b.day);

  if (daysWithLessons.length === 0) {
    return (
      <div className="text-center py-16">
        <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
        <p className="text-lg font-medium text-gray-500 dark:text-gray-400">На этой неделе нет занятий</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-400">
          {data.parity === 1 ? 'Нечётная' : 'Чётная'} неделя №{data.weekNumber}
        </span>
      </div>
      {daysWithLessons.map(({ day, lessons }) => (
        <div key={day}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-500">
              {DAY_NAMES[day]}
            </span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
            <span className="text-xs text-gray-400">{lessons.length} {lessons.length === 1 ? 'пара' : lessons.length < 5 ? 'пары' : 'пар'}</span>
          </div>
          <div className="space-y-3">
            {lessons.map(lesson => (
              <LessonCard key={lesson.id} lesson={lesson} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LessonCard({ lesson }: { lesson: Lesson }) {
  const typeColor = LESSON_TYPE_COLORS[lesson.lessonType] || LESSON_TYPE_COLORS['Другое'];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all group">
      <div className="flex items-start gap-4">
        {/* Time */}
        <div className="flex-shrink-0 text-center min-w-[60px]">
          <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{lesson.timeStart}</div>
          <div className="text-[10px] text-gray-400 my-0.5">—</div>
          <div className="text-xs text-gray-500">{lesson.timeEnd}</div>
          <div className="mt-1.5 text-[10px] text-gray-400">Пара {lesson.pairNumber}</div>
        </div>

        {/* Divider */}
        <div className="w-px self-stretch bg-gradient-to-b from-indigo-400 to-purple-400 rounded-full opacity-40" />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug">
              {lesson.subject}
            </h3>
            <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeColor}`}>
              {lesson.lessonType}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {lesson.teacher && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <User className="w-3.5 h-3.5" />
                {lesson.teacher}
              </div>
            )}
            {lesson.room && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <MapPin className="w-3.5 h-3.5" />
                {lesson.room}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
