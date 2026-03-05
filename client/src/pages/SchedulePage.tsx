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
      <div className="mb-4 md:mb-6 pt-0">
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-black metallic-text tracking-[-0.08em] mb-2 lowercase">
          расписание.
        </h1>
        <div className="flex items-center gap-3 md:gap-4 text-[var(--color-text-muted)] font-black uppercase tracking-widest text-[9px] md:text-[10px]">
          <Calendar className="w-3 md:w-4 h-3 md:h-4 text-[var(--color-primary-apple)]" />
          <p className="opacity-60">
            {formatDate(new Date())}
          </p>
        </div>
      </div>

      {/* Tabs - True Liquid Bubble System */}
      <div className="mb-6 md:mb-8 liquid-glass-tab p-1 rounded-[28px] md:rounded-[32px] flex items-center shadow-2xl relative border border-white/5 overflow-hidden group">
        {/* Isolated Gooey Layer for Highlights ONLY */}
        <div className="absolute inset-0 pointer-events-none" style={{ filter: "url(#liquid-goo)" }}>
          {(['today', 'tomorrow', 'week'] as Tab[]).map((t) => (
            tab === t && (
              <motion.div
                key={`bubble-${t}`}
                layoutId="liquid-bubble"
                className="absolute inset-y-2 iron-metal-bg rounded-[24px] shadow-gold-glow"
                initial={false}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30,
                  mass: 0.8
                }}
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

        {/* Text Layer - NOT FILTERED */}
        <div className="flex w-full relative z-10">
          {(['today', 'tomorrow', 'week'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 md:py-4.5 px-4 md:px-6 rounded-[24px] md:rounded-[28px] text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] transition-all duration-500 relative ${tab === t
                ? 'text-white'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                }`}
            >
              <span className={`relative z-20 inline-block ${tab === t ? 'scale-110' : 'scale-100'} transition-transform duration-500`}>
                {t === 'today' ? 'Твой день' : t === 'tomorrow' ? 'Завтра' : 'Неделя'}
              </span>
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
            initial={{ opacity: 0, x: 20, filter: 'blur(10px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
            transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
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
      <div className="flex items-center justify-between mb-4 md:mb-8 px-2">
        <div className="flex items-center gap-2 md:gap-4">
          <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] metallic-text">
            {DAY_NAMES[data.dayOfWeek]}
          </span>
          <div className="w-2 h-2 rounded-full iron-metal-bg shadow-gold-glow" />
        </div>
        <span className="text-[9px] md:text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-40">
          {data.parity === 1 ? 'нечётная' : 'чётная'} &bull; №{data.weekNumber}
        </span>
      </div>
      <div className="grid gap-3 md:gap-4">
        {data.lessons.map((lesson, idx) => (
          <motion.div
            key={lesson.id}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
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
    <div className="space-y-8 md:space-y-12">
      <div className="flex items-center gap-3 md:gap-4 px-2">
        <span className="text-[10px] md:text-[11px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.15em] md:tracking-[0.2em] opacity-80">
          {data.parity === 1 ? 'Нечётная' : 'Чётная'} неделя №{data.weekNumber}
        </span>
        <div className="flex-1 h-px bg-[var(--apple-border)] opacity-50" />
      </div>
      {daysWithLessons.map(({ day, lessons }) => (
        <div key={day}>
          <div className="flex items-center justify-between mb-3 md:mb-6 px-2">
            <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] metallic-text">
              {DAY_NAMES[day]}
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500/30" />
          </div>
          <div className="grid gap-3 md:gap-4">
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
      className="apple-card flex-col md:flex-row items-start md:items-center mb-0 shadow-xl hover:shadow-gold-glow transition-all duration-700 group border-[var(--apple-border)] cursor-pointer flex bg-white/5 dark:bg-white/5 p-3 md:p-1 relative squircle overflow-hidden"
    >
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-6 w-full md:p-5">
        {/* Time Pillar */}
        <div className="flex flex-row md:flex-col items-center justify-center w-16 h-14 md:w-24 md:h-24 squircle bg-black/5 dark:bg-white/5 border border-[var(--apple-border)] transition-all duration-700 group-hover:iron-metal-bg group-hover:text-white group-hover:scale-110 shadow-inner translate-x-0 group-hover:-rotate-3 group-hover:translate-x-1 overflow-hidden gap-2 md:gap-0">
          <span className="text-lg md:text-xl font-black tracking-tighter">{lesson.timeStart}</span>
          <div className="w-4 md:w-8 h-0.5 bg-current opacity-20 md:my-1 rounded-full group-hover:opacity-40"></div>
          <span className="text-[9px] md:text-[10px] font-black opacity-50 uppercase tracking-widest group-hover:opacity-70">{lesson.timeEnd}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-3 mb-2 md:mb-3">
            <span className={`px-3 md:px-4 py-1 md:py-1.5 rounded-xl md:rounded-2xl text-[8px] md:text-[9px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] border ${lesson.lessonType === 'Лекция'
              ? 'iron-metal-bg text-white shadow-lg shadow-gold-glow/20'
              : 'bg-zinc-500/10 text-[var(--color-text-muted)] border-zinc-500/10'
              }`}>
              {lesson.lessonType}
            </span>
            <span className="text-[9px] md:text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.15em] md:tracking-[0.2em] opacity-40">
              AUD. {lesson.room}
            </span>
          </div>

          <h3 className="text-lg md:text-3xl font-black text-[var(--color-text-main)] leading-tight md:leading-none mb-2 md:mb-3 tracking-tight md:tracking-tighter lowercase">
            {lesson.subject}.
          </h3>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-8 text-[9px] md:text-[11px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.15em] md:tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-5 h-5 md:w-6 md:h-6 squircle bg-black/5 dark:bg-white/5 flex items-center justify-center shadow-inner group-hover:iron-metal-bg group-hover:text-white transition-all duration-500 overflow-hidden flex-shrink-0">
                <User className="w-3 h-3 md:w-3.5 md:h-3.5" />
              </div>
              <span className="truncate">{lesson.teacher}</span>
            </div>
          </div>
        </div>
        <div className="hidden md:flex p-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-8 transition-all duration-700">
          <ChevronRight className="w-8 h-8 metallic-text" />
        </div>
      </div>
    </div>
  );
}
