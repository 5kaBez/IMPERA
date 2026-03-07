import { useEffect, useState, lazy, Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { Lesson, ScheduleDay, ScheduleWeek } from '../types';
import { DAY_NAMES } from '../types';
import { Calendar, MapPin, User, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiLoader from '../components/EmojiLoader';

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

    const mockLessons: Lesson[] = [
      {
        id: 1,
        subject: "Проектирование интерфейсов",
        teacher: "Артемьев А.В.",
        room: "Л-402",
        timeStart: "09:00",
        timeEnd: "10:30",
        lessonType: "Лекция",
        parity: 2,
        dayOfWeek: new Date().getDay() || 7,
        pairNumber: 1,
        groupId: 1,
        weekStart: 1,
        weekEnd: 18
      },
      {
        id: 2,
        subject: "Мобильная разработка",
        teacher: "Иванов И.И.",
        room: "У-312",
        timeStart: "10:45",
        timeEnd: "12:15",
        lessonType: "Практика",
        parity: 2,
        dayOfWeek: new Date().getDay() || 7,
        pairNumber: 2,
        groupId: 1,
        weekStart: 1,
        weekEnd: 18
      }
    ];

    const fetchTask = tab === 'today'
      ? api.get<ScheduleDay>(`/schedule/${groupId}/today`).then(setTodayData)
      : tab === 'tomorrow'
        ? api.get<ScheduleDay>(`/schedule/${groupId}/tomorrow`).then(setTomorrowData)
        : api.get<ScheduleWeek>(`/schedule/${groupId}/week`).then(weekData => {
          // If no lessons, show mock data
          if (!weekData || Object.keys(weekData.days || {}).length === 0) {
            setWeekData({ days: { [new Date().getDay() || 7]: mockLessons }, parity: 2, weekNumber: 1 });
          } else {
            setWeekData(weekData);
          }
        });

    fetchTask.catch((err) => {
      console.warn('API fetch failed, showing mock data:', err);
      if (tab === 'today') {
        setTodayData({ lessons: mockLessons, dayOfWeek: new Date().getDay() || 7, parity: 2, weekNumber: 1, date: new Date().toISOString() });
      } else if (tab === 'tomorrow') {
        setTomorrowData({ lessons: [mockLessons[0]], dayOfWeek: (new Date().getDay() % 7) + 1, parity: 2, weekNumber: 1, date: new Date().toISOString() });
      } else {
        setWeekData({ days: { [new Date().getDay() || 7]: mockLessons }, parity: 2, weekNumber: 1 });
      }
    }).finally(() => setLoading(false));
  }, [groupId, tab]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  return (
    <div>
      {/* Header - Responsive */}
      <div className="mb-2 md:mb-6 pt-0">
        <h1 className="text-2xl md:text-5xl lg:text-6xl font-black metallic-text tracking-[-0.08em] mb-1 lowercase">
          расписание.
        </h1>
        <div className="flex items-center gap-2 md:gap-4 text-[var(--color-text-muted)] font-black uppercase tracking-widest text-[8px] md:text-[10px]">
          <Calendar className="w-3 md:w-4 h-3 md:h-4 text-[var(--color-primary-apple)]" />
          <p className="opacity-60">
            {formatDate(new Date())}
          </p>
        </div>
      </div>

      {/* Tabs - Compact on mobile */}
      <div className="mb-3 md:mb-8 liquid-glass-tab p-1 rounded-[20px] md:rounded-[32px] flex items-center shadow-lg md:shadow-2xl relative overflow-hidden">
        {/* Bubble indicator */}
        <div className="absolute inset-0 pointer-events-none hidden md:block" style={{ filter: "url(#liquid-goo)" }}>
          {(['today', 'tomorrow', 'week'] as Tab[]).map((t) => (
            tab === t && (
              <motion.div
                key={`bubble-${t}`}
                layoutId="liquid-bubble"
                className="absolute inset-y-2 iron-metal-bg rounded-[24px] shadow-gold-glow"
                initial={false}
                transition={{ type: "spring", stiffness: 400, damping: 30, mass: 0.8 }}
                style={{
                  left: t === 'today' ? '4px' : t === 'tomorrow' ? 'calc(33.33% + 4px)' : 'calc(66.66% + 4px)',
                  width: 'calc(33.33% - 8px)'
                }}
              >
                <div className="absolute top-1 left-2 right-2 h-1/2 bg-white/10 blur-[2px] rounded-full" />
              </motion.div>
            )
          ))}
        </div>

        {/* Mobile-only simple indicator (no SVG filter) */}
        <div className="absolute inset-0 pointer-events-none md:hidden">
          {(['today', 'tomorrow', 'week'] as Tab[]).map((t) => (
            tab === t && (
              <motion.div
                key={`mbubble-${t}`}
                layoutId="mobile-bubble"
                className="absolute inset-y-1 iron-metal-bg rounded-[16px]"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                style={{
                  left: t === 'today' ? '4px' : t === 'tomorrow' ? 'calc(33.33% + 2px)' : 'calc(66.66% + 2px)',
                  width: 'calc(33.33% - 6px)'
                }}
              />
            )
          ))}
        </div>

        {/* Text Layer */}
        <div className="flex w-full relative z-10">
          {(['today', 'tomorrow', 'week'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 md:py-4.5 px-3 md:px-6 rounded-[16px] md:rounded-[28px] text-[10px] md:text-[11px] font-black uppercase tracking-[0.1em] md:tracking-[0.3em] transition-colors duration-300 relative ${tab === t
                ? 'text-white'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                }`}
            >
              {t === 'today' ? 'Сегодня' : t === 'tomorrow' ? 'Завтра' : 'Неделя'}
            </button>
          ))}
        </div>

        <svg className="absolute w-0 h-0 invisible">
          <defs>
            <filter id="liquid-goo">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
              <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
              <feComposite in="SourceGraphic" in2="goo" operator="atop" />
            </filter>
          </defs>
        </svg>
      </div>

      {/* Content */}
      {!groupId ? (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
          <p className="text-base font-medium text-gray-500 dark:text-gray-400">Группа не выбрана</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Выберите группу в профиле</p>
        </div>
      ) : loading ? (
        <EmojiLoader />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {tab === 'today' && todayData && (
              <DaySchedule data={todayData} emptyMessage="Сегодня нет занятий" onLessonClick={setSelectedLesson} />
            )}
            {tab === 'tomorrow' && tomorrowData && (
              <DaySchedule data={tomorrowData} emptyMessage="Завтра нет занятий" onLessonClick={setSelectedLesson} />
            )}
            {tab === 'week' && weekData && (
              <WeekSchedule data={weekData} onLessonClick={setSelectedLesson} />
            )}
          </motion.div>
        </AnimatePresence>
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
      <div className="text-center py-12 md:py-24 apple-card border-dashed border-[var(--apple-border)] bg-black/5 dark:bg-white/5 squircle overflow-hidden">
        <div className="w-16 md:w-24 h-16 md:h-24 squircle bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto mb-4 md:mb-8 overflow-hidden">
          <Calendar className="w-8 md:w-12 h-8 md:h-12 text-[var(--color-text-muted)] opacity-30" />
        </div>
        <p className="text-lg md:text-2xl font-black text-[var(--color-text-main)] tracking-tight mb-2 lowercase">{emptyMessage}.</p>
        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] metallic-text">
          {data.parity === 1 ? 'Нечётная' : 'Чётная'} &bull; №{data.weekNumber}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2 md:mb-8 px-1 md:px-2">
        <div className="flex items-center gap-2 md:gap-4">
          <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.15em] md:tracking-[0.3em] metallic-text">
            {DAY_NAMES[data.dayOfWeek]}
          </span>
          <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full iron-metal-bg" />
        </div>
        <span className="text-[8px] md:text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-40">
          {data.parity === 1 ? 'нечёт' : 'чёт'} &bull; №{data.weekNumber}
        </span>
      </div>
      <div className="grid gap-2 md:gap-4">
        {data.lessons.map((lesson, idx) => (
          <motion.div
            key={lesson.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03, duration: 0.3 }}
          >
            <CompactLessonCard lesson={lesson} onClick={() => onLessonClick(lesson)} />
          </motion.div>
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
      <div className="text-center py-12 md:py-24 apple-card border-dashed border-[var(--apple-border)] bg-black/5 dark:bg-white/5 squircle overflow-hidden">
        <div className="w-16 md:w-24 h-16 md:h-24 squircle bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto mb-4 md:mb-8 overflow-hidden">
          <Calendar className="w-8 md:w-12 h-8 md:h-12 text-[var(--color-text-muted)] opacity-30" />
        </div>
        <p className="text-lg md:text-2xl font-black text-[var(--color-text-main)] tracking-tight mb-2 lowercase">На этой неделе нет занятий.</p>
        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] metallic-text">
          {data.parity === 1 ? 'Нечётная' : 'Чётная'} &bull; №{data.weekNumber}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-12">
      <div className="flex items-center gap-2 md:gap-4 px-1 md:px-2">
        <span className="text-[9px] md:text-[11px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.1em] md:tracking-[0.2em] opacity-80">
          {data.parity === 1 ? 'Нечёт' : 'Чёт'} неделя №{data.weekNumber}
        </span>
        <div className="flex-1 h-px bg-[var(--apple-border)] opacity-50" />
      </div>
      {daysWithLessons.map(({ day, lessons }) => (
        <div key={day}>
          <div className="flex items-center justify-between mb-2 md:mb-6 px-1 md:px-2">
            <span className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] metallic-text">
              {DAY_NAMES[day]}
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500/30" />
          </div>
          <div className="grid gap-2 md:gap-4">
            {lessons.map(lesson => (
              <CompactLessonCard key={lesson.id} lesson={lesson} onClick={() => onLessonClick(lesson)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CompactLessonCard({ lesson, onClick }: { lesson: Lesson; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer active:scale-[0.98] transition-transform duration-200"
    >
      {/* Mobile card — ultra compact */}
      <div className="md:hidden flex items-start gap-3 p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--apple-border)] active:bg-black/[0.06] dark:active:bg-white/[0.08]">
        {/* Time column */}
        <div className="flex flex-col items-center pt-0.5 w-11 flex-shrink-0">
          <span className="text-xs font-black tracking-tight text-[var(--color-text-main)]">{lesson.timeStart}</span>
          <div className="w-px h-2.5 bg-[var(--color-text-muted)] opacity-20 my-0.5" />
          <span className="text-[9px] font-bold text-[var(--color-text-muted)] opacity-50">{lesson.timeEnd}</span>
        </div>
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`px-2 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-wider border ${lesson.lessonType === 'Лекция'
              ? 'iron-metal-bg text-white border-transparent'
              : 'bg-zinc-500/10 text-[var(--color-text-muted)] border-zinc-500/10'
              }`}>
              {lesson.lessonType}
            </span>
            {lesson.room && <span className="text-[8px] font-bold text-[var(--color-text-muted)] opacity-50">{lesson.room}</span>}
          </div>
          <h3 className="text-[13px] font-black text-[var(--color-text-main)] leading-snug mb-0.5 tracking-tight lowercase truncate">
            {lesson.subject}
          </h3>
          <div className="flex items-center gap-1.5">
            <User className="w-3 h-3 text-[var(--color-text-muted)] opacity-40 flex-shrink-0" />
            <span className="text-[10px] font-bold text-[var(--color-text-muted)] opacity-60 truncate">{lesson.teacher}</span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] opacity-20 flex-shrink-0 mt-3" />
      </div>

      {/* Desktop card — full design */}
      <div className="hidden md:flex apple-card flex-row items-center shadow-xl hover:shadow-gold-glow transition-all duration-700 group border-[var(--apple-border)] bg-black/[0.03] dark:bg-white/5 p-1 relative squircle overflow-hidden">
        <div className="flex flex-row items-center gap-6 w-full p-5">
          {/* Time Pillar */}
          <div className="flex flex-col items-center justify-center w-24 h-24 squircle bg-black/5 dark:bg-white/5 border border-[var(--apple-border)] transition-all duration-700 group-hover:iron-metal-bg group-hover:text-white group-hover:scale-110 shadow-inner group-hover:-rotate-3 group-hover:translate-x-1 overflow-hidden">
            <span className="text-xl font-black tracking-tighter">{lesson.timeStart}</span>
            <div className="w-8 h-0.5 bg-current opacity-20 my-1 rounded-full group-hover:opacity-40"></div>
            <span className="text-[10px] font-black opacity-50 uppercase tracking-widest group-hover:opacity-70">{lesson.timeEnd}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <span className={`px-4 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] border ${lesson.lessonType === 'Лекция'
                ? 'iron-metal-bg text-white shadow-lg shadow-gold-glow/20'
                : 'bg-zinc-500/10 text-[var(--color-text-muted)] border-zinc-500/10'
                }`}>
                {lesson.lessonType}
              </span>
              <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] opacity-40">
                AUD. {lesson.room}
              </span>
            </div>

            <h3 className="text-3xl font-black text-[var(--color-text-main)] leading-none mb-3 tracking-tighter lowercase">
              {lesson.subject}.
            </h3>

            <div className="flex items-center gap-8 text-[11px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 squircle bg-black/5 dark:bg-white/5 flex items-center justify-center shadow-inner group-hover:iron-metal-bg group-hover:text-white transition-all duration-500 overflow-hidden flex-shrink-0">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span className="truncate">{lesson.teacher}</span>
              </div>
            </div>
          </div>
          <div className="flex p-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-8 transition-all duration-700">
            <ChevronRight className="w-8 h-8 metallic-text" />
          </div>
        </div>
      </div>
    </div>
  );
}
