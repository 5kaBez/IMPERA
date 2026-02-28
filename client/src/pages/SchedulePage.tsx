import { useEffect, useState, lazy, Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { Lesson, ScheduleDay, ScheduleWeek } from '../types';
import { DAY_NAMES, LESSON_TYPE_COLORS } from '../types';
import { Calendar, MapPin, User, ChevronRight } from 'lucide-react';

const LessonDetailModal = lazy(() => import('../components/LessonDetailModal'));

type Tab = 'today' | 'tomorrow' | 'week';

export default function SchedulePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('today');
  const [todayData, setTodayData] = useState<ScheduleDay | null>(null);
  const [tomorrowData, setTomorrowData] = useState<ScheduleDay | null>(null);
  const [weekData, setWeekData] = useState<ScheduleWeek | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

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
      {/* Header — compact for mobile */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Расписание</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 capitalize">{todayFormatted}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl mb-4">
        {([
          { key: 'today', label: 'Сегодня' },
          { key: 'tomorrow', label: 'Завтра' },
          { key: 'week', label: 'Неделя' },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
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
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
          <p className="text-base font-medium text-gray-500 dark:text-gray-400">Группа не выбрана</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Выберите группу в профиле</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {tab === 'today' && todayData && (
            <DaySchedule data={todayData} emptyMessage="Сегодня нет занятий" onLessonClick={setSelectedLesson} />
          )}
          {tab === 'tomorrow' && tomorrowData && (
            <DaySchedule data={tomorrowData} emptyMessage="Завтра нет занятий" onLessonClick={setSelectedLesson} />
          )}
          {tab === 'week' && weekData && (
            <WeekSchedule data={weekData} onLessonClick={setSelectedLesson} />
          )}
        </>
      )}

      {/* Lesson Detail Modal */}
      {selectedLesson && (
        <Suspense fallback={null}>
          <LessonDetailModal lesson={selectedLesson} onClose={() => setSelectedLesson(null)} />
        </Suspense>
      )}
    </div>
  );
}

function DaySchedule({ data, emptyMessage, onLessonClick }: { data: ScheduleDay; emptyMessage: string; onLessonClick: (l: Lesson) => void }) {
  if (data.lessons.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
        <p className="text-base font-medium text-gray-500 dark:text-gray-400">{emptyMessage}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {data.parity === 1 ? 'Нечётная' : 'Чётная'} неделя №{data.weekNumber}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
          {DAY_NAMES[data.dayOfWeek]}
        </span>
        <span className="text-[11px] text-gray-400">
          {data.parity === 1 ? 'нечёт' : 'чёт'} №{data.weekNumber}
        </span>
        <span className="text-[11px] text-gray-400 ml-auto">{data.lessons.length} {data.lessons.length === 1 ? 'пара' : data.lessons.length < 5 ? 'пары' : 'пар'}</span>
      </div>
      <div className="space-y-2">
        {data.lessons.map(lesson => (
          <CompactLessonCard key={lesson.id} lesson={lesson} onClick={() => onLessonClick(lesson)} />
        ))}
      </div>
    </div>
  );
}

function WeekSchedule({ data, onLessonClick }: { data: ScheduleWeek; onLessonClick: (l: Lesson) => void }) {
  const daysWithLessons = Object.entries(data.days)
    .map(([day, lessons]) => ({ day: parseInt(day), lessons }))
    .sort((a, b) => a.day - b.day);

  if (daysWithLessons.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
        <p className="text-base font-medium text-gray-500 dark:text-gray-400">На этой неделе нет занятий</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-gray-400">
          {data.parity === 1 ? 'Нечётная' : 'Чётная'} неделя №{data.weekNumber}
        </span>
      </div>
      {daysWithLessons.map(({ day, lessons }) => (
        <div key={day}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">
              {DAY_NAMES[day]}
            </span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
            <span className="text-[11px] text-gray-400">{lessons.length}</span>
          </div>
          <div className="space-y-2">
            {lessons.map(lesson => (
              <CompactLessonCard key={lesson.id} lesson={lesson} onClick={() => onLessonClick(lesson)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* Compact lesson card — fits 4-5 on screen on mobile */
function CompactLessonCard({ lesson, onClick }: { lesson: Lesson; onClick: () => void }) {
  const typeColor = LESSON_TYPE_COLORS[lesson.lessonType] || LESSON_TYPE_COLORS['Другое'];
  const typeShort: Record<string, string> = {
    'Лекция': 'Лек',
    'Практика': 'Пр',
    'Лабораторная': 'Лаб',
    'Другое': 'Др',
  };

  return (
    <button
      onClick={onClick}
      className="w-full bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 hover:border-indigo-200 dark:hover:border-indigo-500/30 active:scale-[0.99] transition-all text-left group"
    >
      <div className="flex items-center gap-3">
        {/* Time block - compact */}
        <div className="flex-shrink-0 text-center w-[44px]">
          <div className="text-xs font-bold text-gray-900 dark:text-gray-100 leading-tight">{lesson.timeStart}</div>
          <div className="text-[9px] text-gray-400 leading-tight">{lesson.timeEnd}</div>
        </div>

        {/* Color indicator */}
        <div className="w-0.5 self-stretch rounded-full bg-gradient-to-b from-indigo-400 to-purple-400 opacity-50" />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h3 className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">
              {lesson.subject}
            </h3>
            <span className={`flex-shrink-0 text-[9px] font-bold px-1.5 py-px rounded ${typeColor}`}>
              {typeShort[lesson.lessonType] || lesson.lessonType}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
            {lesson.teacher && (
              <span className="flex items-center gap-1 truncate">
                <User className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{lesson.teacher}</span>
              </span>
            )}
            {lesson.room && (
              <span className="flex items-center gap-1 flex-shrink-0">
                <MapPin className="w-3 h-3" />
                {lesson.room}
              </span>
            )}
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-700 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
      </div>
    </button>
  );
}
