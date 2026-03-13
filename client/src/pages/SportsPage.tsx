import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Dumbbell, Clock, MapPin, ChevronRight, Sparkles, Wrench, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { analytics } from '../api/analytics';

/* ─── Sport metadata ─── */
const SPORT_INFO: Record<string, { emoji: string; place: string }> = {
  'Атлетизм':     { emoji: '🏋️', place: 'Спорткомплекс' },
  'Аэробика':     { emoji: '🤸',  place: 'Спортзал №2' },
  'Баскетбол':    { emoji: '🏀',  place: 'Спортзал №2' },
  'Бокс':         { emoji: '🥊',  place: 'Спортзал №3' },
  'Бадминтон':    { emoji: '🏸',  place: 'Спортзал №1' },
  'Волейбол':     { emoji: '🏐',  place: 'Спортзал №1' },
  'Н. теннис':    { emoji: '🏓',  place: 'Спортзал №3' },
  'Плавание':     { emoji: '🏊',  place: 'Бассейн ГУУ' },
  'Самооборона':  { emoji: '🥋',  place: 'Спортзал №3' },
  'СМГ':          { emoji: '❤️‍🩹', place: 'Спортзал №1' },
  'Фитнес':       { emoji: '💪',  place: 'Спорткомплекс' },
  'Футбол':       { emoji: '⚽',  place: 'Стадион ГУУ' },
  'Шахматы':      { emoji: '♟️',  place: 'Ауд. Л-302' },
};
const SPORT_NAMES = Object.keys(SPORT_INFO);

const DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Пт', 'Сб'];
const DAYS_FULL  = ['Понедельник', 'Вторник', 'Среда', 'Пятница', 'Суббота'];

/** Map lesson.dayOfWeek (1=Mon…7=Sun) → our day index (0-4). Returns -1 if no sports that day */
const DAY_OF_WEEK_TO_IDX: Record<number, number> = { 1: 0, 2: 1, 3: 2, 5: 3, 6: 4 };

const TIME_SLOTS = [
  { time: '09:00', end: '10:30' },
  { time: '10:40', end: '12:10' },
  { time: '12:55', end: '14:25' },
  { time: '14:35', end: '16:05' },
  { time: '16:15', end: '17:45' },
  { time: '17:55', end: '19:25' },
];

/* ─── Full schedule from official timetable ───
   SCHEDULE[sport][dayIdx 0-4][timeIdx 0-5] = teacher name or null
   Days: 0=Пн, 1=Вт, 2=Ср, 3=Пт, 4=Сб
   Times: 0=9:00, 1=10:40, 2=12:55, 3=14:35, 4=16:15, 5=17:55
*/
const SCHEDULE: Record<string, (string | null)[][]> = {
  'Атлетизм': [
    [null,        'Мамышев',  'Мамышев',  'Мамышев',  'Мамышев',  null],
    ['Кокорев',   'Мамышев',  'Мамышев',  'Мамышев',  'Мамышев',  null],
    [null,        'Мамышев',  'Мамышев',  'Мамышев',  'Мамышев',  null],
    ['Домащенко', 'Мамышев',  'Мамышев',  'Мамышев',  'Мамышев',  null],
    [null,        null,        'Махотина', 'Мамышев',  null,        null],
  ],
  'Аэробика': [
    ['Сиверкина', 'Сиверкина', 'Сиверкина', 'Чернова',   'Чернова',   null],
    ['Сиверкина', 'Сиверкина', 'Сиверкина', null,         null,         null],
    ['Сиверкина', 'Сиверкина', 'Сиверкина', 'Махотина',  'Махотина',  null],
    ['Сиверкина', 'Сиверкина', 'Сиверкина', null,         null,         null],
    [null,        null,        'Махотина',  'Махотина',  null,         null],
  ],
  'Баскетбол': [
    ['Носач',     'Меркулова', 'Меркулова', 'Меркулова', 'Меркулова', null],
    ['Носач',     'Меркулова', 'Меркулова', 'Меркулова', 'Меркулова', null],
    ['Носач',     null,         null,         null,         null,        null],
    [null,        'Меркулова', 'Меркулова', 'Меркулова', 'Меркулова', null],
    [null,        'Носач',     'Носач',     'Носач',     null,         null],
  ],
  'Бокс': [
    ['Домащенко', 'Домащенко', 'Домащенко', 'Домащенко', 'Савченко',  null],
    ['Домащенко', 'Савченко',  'Савченко',  'Савченко',  'Савченко',  null],
    ['Домащенко', 'Домащенко', 'Савченко',  'Савченко',  'Савченко',  null],
    ['Савченко',  'Савченко',  'Савченко',  'Савченко',  'Савченко',  null],
    [null,        null,         null,         null,         null,        null],
  ],
  'Бадминтон': [
    ['Кабанова',  'Кабанова',  'Кабанова',  'Кабанова',  'Кабанова',  null],
    [null,        'Кабанова',  'Кабанова',  'Кабанова',  'Кабанова',  null],
    ['Турмандзе', 'Турмандзе', 'Турмандзе', 'Турмандзе', 'Турмандзе', null],
    ['Кокорев',   'Кокорев',   'Кокорев',   'Кокорев',   'Кокорев',   null],
    [null,        null,         null,         null,         null,        null],
  ],
  'Волейбол': [
    ['Баранников','Баранников','Баранников','Баранцев',  'Баранцев',  null],
    ['Баранцев',  'Баранников','Баранцев',  'Баранцев',  'Баранцев',  null],
    ['Найденова', 'Найденова', 'Найденова', 'Найденова', 'Найденова', null],
    ['Баранников','Баранников','Баранников','Баранников','Баранников', null],
    [null,        null,        'Терехова',  'Терехова',  null,         null],
  ],
  'Н. теннис': [
    ['Логачёв',   'Логачёв',   'Логачёв',   'Логачёв',   'Логачёв',   null],
    ['Найденова', 'Найденова', 'Качалов',   'Качалов',   'Качалов',   null],
    ['Качалов',   'Качалов',   'Найденова', 'Качалов',   'Логачёв',   null],
    ['Найденова', 'Найденова', 'Найденова', 'Найденова', 'Найденова', null],
    ['Носач',     null,         null,         null,         null,        null],
  ],
  'Плавание': [
    ['Раевский',  'Раевский',  'Раевский',  'Раевский',  'Раевский',  null],
    ['Терехова',  'Терехова',  'Терехова',  'Терехова',  'Терехова',  null],
    ['Раевский',  'Раевский',  'Раевский',  'Раевский',  'Раевский',  null],
    ['Раевский',  'Раевский',  'Раевский',  'Раевский',  'Раевский',  null],
    [null,        null,         null,         null,         null,        null],
  ],
  'Самооборона': [
    [null,        null,         null,         null,        'Зезюлин',   null],
    ['Продиус',   'Продиус',   'Продиус',   'Продиус',   null,         null],
    [null,        null,         null,         'Зезюлин',  'Зезюлин',   null],
    ['Продиус',   null,         null,         'Продиус',   null,         null],
    [null,        null,         null,         null,         null,        null],
  ],
  'СМГ': [
    [null,        'Серегина',  'Серегина',  null,        'Серегина',  null],
    [null,        'Серегина',  'Серегина',  'Серегина',  'Серегина',  null],
    ['Серегина',  'Серегина',  'Серегина',  'Серегина',  'Серегина',  null],
    [null,        'Кабанова',  'Кабанова',  null,        'Кабанова',  'Кабанова'],
    [null,        null,         null,         null,         null,        null],
  ],
  'Фитнес': [
    ['Велищева',  'Велищева',  'Велищева',  'Велищева',  'Велищева',  null],
    ['Велищева',  'Велищева',  'Велищева',  'Велищева',  'Велищева',  null],
    ['Велищева',  'Велищева',  'Велищева',  'Чернова',   'Чернова',   null],
    ['Чернова',   'Чернова',   'Чернова',   'Чернова',   'Чернова',   null],
    ['Кокорев',   'Кокорев',   'Кокорев',   'Кокорев',   null,         null],
  ],
  'Футбол': [
    [null,        'Чичерин',   null,        'Чичерин',   'Чичерин',   null],
    ['Хромов',    'Хромов',    'Хромов',    'Чичерин',   'Чичерин',   null],
    ['Хромов',    'Хромов',    'Хромов',    'Хромов',    'Чичерин',   null],
    [null,        'Чичерин',   'Чичерин',   null,        'Чичерин',   null],
    [null,        null,         null,         null,         null,        null],
  ],
  'Шахматы': [
    [null,        null,         null,        'Баранников','Баранников', null],
    [null,        null,        'Баранников','Баранников', null,         null],
    [null,        null,        'Чернова',   'Логачёв',    null,         null],
    [null,        null,         null,        'Чичерин',    null,         null],
    [null,        null,         null,         null,         null,        null],
  ],
};

const UPCOMING_FEATURES = [
  'Запись на занятия',
  'Отметка посещений',
  'Трекер прогресса',
  'QR-код для чекина',
];

/* ─── Helpers ─── */

/** Get all sports available at a specific day+time slot */
function getSportsForSlot(dayIdx: number, timeIdx: number) {
  return SPORT_NAMES
    .filter(sport => SCHEDULE[sport]?.[dayIdx]?.[timeIdx])
    .map(sport => ({
      name: sport,
      teacher: SCHEDULE[sport][dayIdx][timeIdx]!,
      emoji: SPORT_INFO[sport].emoji,
      place: SPORT_INFO[sport].place,
    }));
}

/** Get all time slots for a sport across all days */
function getSportSchedule(sportName: string) {
  const entries: { dayIdx: number; timeIdx: number; teacher: string }[] = [];
  const data = SCHEDULE[sportName];
  if (!data) return entries;
  data.forEach((day, dayIdx) => {
    day.forEach((teacher, timeIdx) => {
      if (teacher) entries.push({ dayIdx, timeIdx, teacher });
    });
  });
  return entries;
}

type ViewTab = 'time' | 'sections';

export default function SportsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as { highlightTime?: string; highlightDay?: number } | null);

  const highlightTime = state?.highlightTime || null;
  const highlightDay = state?.highlightDay || null;
  const [view, setView] = useState<ViewTab>('time');
  const [selectedDay, setSelectedDay] = useState(0);
  const highlightTimeIdx = highlightTime ? TIME_SLOTS.findIndex(t => t.time === highlightTime) : -1;
  const highlightDayIdx = highlightDay ? DAY_OF_WEEK_TO_IDX[highlightDay] ?? -1 : -1;
  const [showHighlight, setShowHighlight] = useState(highlightTimeIdx >= 0);
  const highlightRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    analytics.trackPageView('/sports');
  }, []);

  useEffect(() => {
    analytics.trackEvent('sports_view_tab_change', 'sports', 1, { view });
  }, [view]);

  const getInitialDay = () => {
    if (highlightDayIdx >= 0) return highlightDayIdx;
    const today = new Date().getDay(); // 0=Sun, 1=Mon...
    if (today === 0) return 0; // Sunday → show Monday
    const mapped = DAY_OF_WEEK_TO_IDX[today];
    return mapped ?? 0;
  };

  const [expandedSport, setExpandedSport] = useState<string | null>(null);
  const [showHighlight, setShowHighlight] = useState(!!highlightTime);
  const highlightRowRef = useRef<HTMLDivElement>(null);

  // Clear navigation state so highlight disappears on re-visit
  useEffect(() => {
    if (highlightTime) {
      navigate(location.pathname, { replace: true, state: {} });
      setTimeout(() => {
        highlightRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
      const timer = setTimeout(() => setShowHighlight(false), 5000);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="pb-12">
      {/* Header */}
      <div className="mb-3 md:mb-8">
        <h1 className="text-2xl md:text-5xl font-black metallic-text tracking-[-0.06em] mb-1 lowercase">
          физкультура
        </h1>
        <div className="flex items-center gap-2">
          <Dumbbell className="w-3 h-3 md:w-4 md:h-4 text-[var(--color-primary-apple)]" />
          <p className="text-[var(--color-text-muted)] font-black uppercase tracking-widest text-[8px] md:text-[10px] opacity-70">
            Спортивные секции ГУУ &bull; Весна 2025/2026
          </p>
        </div>
      </div>

      {/* Highlight Banner — when navigated from schedule */}
      <AnimatePresence>
        {showHighlight && highlightTimeIdx >= 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="mb-3 md:mb-5 p-3 md:p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Dumbbell className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] md:text-xs font-black text-emerald-700 dark:text-emerald-300 tracking-tight">
                Твоя пара: {highlightDayIdx >= 0 ? DAYS_SHORT[highlightDayIdx] : ''} {TIME_SLOTS[highlightTimeIdx].time} — {TIME_SLOTS[highlightTimeIdx].end}
              </p>
              <p className="text-[9px] md:text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">
                Вот секции, доступные на это время ↓
              </p>
            </div>
            <button
              onClick={() => setShowHighlight(false)}
              className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 hover:bg-emerald-500/20 transition-colors flex-shrink-0 text-xs font-bold"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Tabs */}
      <div className="mb-3 md:mb-5 flex gap-1 p-1 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--apple-border)]">
        {([
          { key: 'time' as ViewTab, label: 'По времени', icon: Clock },
          { key: 'sections' as ViewTab, label: 'По секциям', icon: Dumbbell },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setView(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 md:py-3 px-3 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${view === t.key
              ? 'iron-metal-bg text-white shadow-lg'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ──── TIME VIEW ──── */}
      {view === 'time' ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Day tabs */}
          <div className="mb-3 md:mb-5 flex gap-1 p-1 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--apple-border)]">
            {DAYS_SHORT.map((day, idx) => (
              <button
                key={day}
                onClick={() => setSelectedDay(idx)}
                className={`flex-1 py-2 md:py-2.5 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${selectedDay === idx
                  ? 'iron-metal-bg text-white shadow-lg'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          <p className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)] opacity-50 px-1 mb-3">
            {DAYS_FULL[selectedDay]}
          </p>

          {/* Time slots */}
          <div className="space-y-3 md:space-y-4">
            {TIME_SLOTS.map((slot, timeIdx) => {
              const sports = getSportsForSlot(selectedDay, timeIdx);
              if (sports.length === 0) return null;

              const isHighlighted = showHighlight && timeIdx === highlightTimeIdx && selectedDay === highlightDayIdx;

              return (
                <motion.div
                  key={slot.time}
                  ref={isHighlighted ? highlightRowRef : undefined}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: timeIdx * 0.05, duration: 0.3 }}
                  className={`rounded-2xl border transition-all duration-700 overflow-hidden ${isHighlighted
                    ? 'ring-2 ring-emerald-500/50 border-emerald-500/30 bg-emerald-500/[0.04] shadow-lg shadow-emerald-500/10'
                    : 'border-[var(--apple-border)] bg-black/[0.02] dark:bg-white/[0.02]'
                  }`}
                >
                  {/* Time header */}
                  <div className={`flex items-center justify-between px-3 md:px-4 py-2 md:py-2.5 border-b transition-all duration-700 ${isHighlighted
                    ? 'bg-emerald-500/10 border-emerald-500/20'
                    : 'bg-black/[0.02] dark:bg-white/[0.03] border-[var(--apple-border)]'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Clock className={`w-3.5 h-3.5 transition-colors duration-700 ${isHighlighted ? 'text-emerald-500' : 'text-[var(--color-primary-apple)]'}`} />
                      <span className={`text-[12px] md:text-sm font-black tracking-tight transition-colors duration-700 ${isHighlighted ? 'text-emerald-700 dark:text-emerald-300' : 'text-[var(--color-text-main)]'}`}>
                        {slot.time} — {slot.end}
                      </span>
                    </div>
                    <span className={`text-[9px] md:text-[10px] font-bold px-2 py-0.5 rounded-full transition-all duration-700 ${isHighlighted
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-black/5 dark:bg-white/5 text-[var(--color-text-muted)] opacity-60'
                    }`}>
                      {sports.length} {sports.length === 1 ? 'секция' : sports.length < 5 ? 'секции' : 'секций'}
                    </span>
                  </div>

                  {/* Sports grid */}
                  <div className="p-2 md:p-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 md:gap-2">
                    {sports.map((sport, idx) => (
                      <motion.div
                        key={sport.name}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.03, duration: 0.2 }}
                        className={`flex items-start gap-2 p-2.5 md:p-3 rounded-xl border transition-all duration-500 ${isHighlighted
                          ? 'bg-emerald-500/[0.06] border-emerald-500/15 hover:bg-emerald-500/10'
                          : 'bg-black/[0.02] dark:bg-white/[0.03] border-[var(--apple-border)] hover:border-[var(--color-primary-apple)]/20 hover:bg-[var(--color-primary-apple)]/5'
                        }`}
                      >
                        <span className={`text-lg md:text-xl leading-none flex-shrink-0 ${isHighlighted ? 'animate-bounce' : ''}`} style={isHighlighted ? { animationDuration: '2s', animationIterationCount: '2' } : {}}>
                          {sport.emoji}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[11px] md:text-xs font-black text-[var(--color-text-main)] tracking-tight leading-tight">
                            {sport.name}
                          </h4>
                          <div className="flex items-center gap-1 mt-0.5">
                            <User className="w-2.5 h-2.5 text-[var(--color-primary-apple)] opacity-50 flex-shrink-0" />
                            <span className="text-[9px] md:text-[10px] font-bold text-[var(--color-text-muted)] opacity-60 truncate">
                              {sport.teacher}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin className="w-2.5 h-2.5 text-[var(--color-primary-apple)] opacity-30 flex-shrink-0" />
                            <span className="text-[8px] md:text-[9px] font-bold text-[var(--color-text-muted)] opacity-40 truncate">
                              {sport.place}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      ) : (
        /* ──── SECTIONS VIEW ──── */
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-2 md:space-y-3"
        >
          {SPORT_NAMES.map((sportName, idx) => {
            const info = SPORT_INFO[sportName];
            const schedule = getSportSchedule(sportName);
            const isExpanded = expandedSport === sportName;

            return (
              <motion.div
                key={sportName}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03, duration: 0.3 }}
              >
                <button
                  onClick={() => setExpandedSport(isExpanded ? null : sportName)}
                  className="w-full flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--apple-border)] active:scale-[0.98] transition-all duration-200 group"
                >
                  <div className="w-11 h-11 md:w-13 md:h-13 rounded-xl md:rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-2xl md:text-3xl flex-shrink-0 group-active:iron-metal-bg transition-all duration-300">
                    {info.emoji}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <h3 className="text-[13px] md:text-base font-black text-[var(--color-text-main)] tracking-tight">
                      {sportName}
                    </h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5 text-[var(--color-primary-apple)] opacity-60 flex-shrink-0" />
                        <span className="text-[10px] md:text-xs font-bold text-[var(--color-text-muted)] opacity-50">{info.place}</span>
                      </div>
                      <span className="text-[9px] font-bold text-[var(--color-text-muted)] opacity-30">
                        {schedule.length} занят.
                      </span>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-[var(--color-text-muted)] opacity-20 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-1 mx-3 p-3 md:p-4 rounded-xl md:rounded-2xl bg-[var(--color-primary-apple)]/5 border border-[var(--color-primary-apple)]/10">
                        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-wider text-[var(--color-primary-apple)] mb-2.5">
                          Расписание
                        </p>
                        {/* Group by day */}
                        {DAYS_SHORT.map((day, dayIdx) => {
                          const dayEntries = schedule.filter(e => e.dayIdx === dayIdx);
                          if (dayEntries.length === 0) return null;
                          return (
                            <div key={day} className="mb-2 last:mb-0">
                              <span className="text-[10px] font-black text-[var(--color-primary-apple)] opacity-80">{DAYS_FULL[dayIdx]}</span>
                              <div className="ml-2 mt-0.5 space-y-0.5">
                                {dayEntries.map(e => (
                                  <div key={`${e.dayIdx}-${e.timeIdx}`} className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-[var(--color-text-main)] opacity-70">
                                    <span className="text-[var(--color-text-muted)] opacity-50 w-24 flex-shrink-0">
                                      {TIME_SLOTS[e.timeIdx].time} — {TIME_SLOTS[e.timeIdx].end}
                                    </span>
                                    <span className="opacity-40">•</span>
                                    <span className="text-[var(--color-text-muted)] opacity-50">{e.teacher}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[var(--color-primary-apple)]/10">
                          <MapPin className="w-3 h-3 text-[var(--color-primary-apple)] opacity-60" />
                          <span className="text-[9px] md:text-[10px] font-bold text-[var(--color-text-muted)]">{info.place}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Coming Soon Features */}
      <div className="mt-5 md:mt-8 flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {UPCOMING_FEATURES.map((feature, idx) => (
          <motion.div
            key={feature}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--apple-border)] flex-shrink-0"
          >
            <Sparkles className="w-3 h-3 text-[var(--color-primary-apple)]" />
            <span className="text-[9px] md:text-[10px] font-bold text-[var(--color-text-muted)] whitespace-nowrap">{feature}</span>
          </motion.div>
        ))}
      </div>

      {/* Dev note */}
      <div className="mt-4 md:mt-6 p-3 md:p-4 rounded-2xl bg-[var(--color-primary-apple)]/5 border border-[var(--color-primary-apple)]/10 flex items-start gap-3">
        <Wrench className="w-4 h-4 text-[var(--color-primary-apple)] opacity-60 flex-shrink-0 mt-0.5" />
        <div>
          <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-[var(--color-primary-apple)] opacity-70">В разработке</span>
          <p className="text-[9px] md:text-[10px] font-bold text-[var(--color-text-muted)] opacity-60 mt-0.5 leading-relaxed">
            Система записи на секции скоро будет доступна. Расписание актуально на весну 2025/2026.
          </p>
        </div>
      </div>
    </div>
  );
}
