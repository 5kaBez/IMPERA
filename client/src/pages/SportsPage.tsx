import { useState } from 'react';
import { Dumbbell, Clock, MapPin, ChevronRight, Sparkles, Wrench, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

const SPORTS = [
  { emoji: '⚽', name: 'Футбол', place: 'Стадион ГУУ' },
  { emoji: '🏐', name: 'Волейбол', place: 'Спортзал №1' },
  { emoji: '🏀', name: 'Баскетбол', place: 'Спортзал №2' },
  { emoji: '🏸', name: 'Бадминтон', place: 'Спортзал №1' },
  { emoji: '🏓', name: 'Н. теннис', place: 'Спортзал №3' },
  { emoji: '♟️', name: 'Шахматы', place: 'Ауд. Л-302' },
  { emoji: '🏋️', name: 'Атлетизм', place: 'Спорткомплекс' },
  { emoji: '🧘', name: 'Йога', place: 'Спортзал №1' },
  { emoji: '🤸', name: 'Аэробика', place: 'Спортзал №2' },
  { emoji: '🏊', name: 'Плавание', place: 'Бассейн ГУУ' },
];

const UPCOMING_FEATURES = [
  'Запись на занятия',
  'Отметка посещений',
  'Трекер прогресса',
  'QR-код для чекина',
];

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

const TIME_SLOTS = [
  { time: '09:00', end: '10:30' },
  { time: '10:40', end: '12:10' },
  { time: '12:55', end: '14:25' },
  { time: '14:35', end: '16:05' },
  { time: '16:15', end: '17:45' },
  { time: '17:55', end: '19:25' },
];

// Schedule grid: [timeSlotIndex][dayIndex] = sport name or null
const SCHEDULE: (string | null)[][] = [
  // 09:00
  ['Йога',       'Аэробика',  'Йога',      'Аэробика',  'Плавание',  'Футбол'],
  // 10:40
  ['Волейбол',   'Баскетбол', 'Аэробика',  'Волейбол',  'Бадминтон', 'Баскетбол'],
  // 12:55
  ['Бадминтон',  'Плавание',  'Волейбол',  'Баскетбол', 'Шахматы',   'Волейбол'],
  // 14:35
  ['Баскетбол',  'Футбол',    'Баскетбол', 'Плавание',  'Футбол',    'Н. теннис'],
  // 16:15
  ['Футбол',     'Н. теннис', 'Атлетизм',  'Бадминтон', 'Атлетизм',  null],
  // 17:55
  ['Атлетизм',   null,        'Н. теннис', 'Атлетизм',  null,        null],
];

function getSportEmoji(name: string): string {
  const sport = SPORTS.find(s => s.name === name);
  return sport?.emoji || '🏃';
}

type ViewTab = 'grid' | 'sections';

export default function SportsPage() {
  const [selectedSport, setSelectedSport] = useState<number | null>(null);
  const [view, setView] = useState<ViewTab>('grid');

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
            Спортивные секции ГУУ
          </p>
        </div>
      </div>

      {/* Development Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 md:mb-8 p-3 md:p-5 rounded-2xl md:rounded-[28px] bg-gradient-to-r from-amber-500/5 via-[var(--color-primary-apple)]/10 to-amber-500/5 border border-[var(--color-primary-apple)]/20 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary-apple)]/5 blur-3xl rounded-full" />
        <div className="flex items-start gap-3 relative">
          <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl md:rounded-2xl bg-[var(--color-primary-apple)]/10 flex items-center justify-center flex-shrink-0">
            <Wrench className="w-4 h-4 md:w-5 md:h-5 text-[var(--color-primary-apple)]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-[var(--color-primary-apple)]">
                В разработке
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[var(--color-primary-apple)]/10 text-[7px] md:text-[8px] font-black uppercase tracking-wider text-[var(--color-primary-apple)]">
                beta
              </span>
            </div>
            <p className="text-[10px] md:text-sm font-bold text-[var(--color-text-muted)] leading-relaxed">
              Мы работаем над системой записи. Пока вы можете ознакомиться с расписанием секций.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Coming Soon Features */}
      <div className="mb-4 md:mb-8 flex gap-2 overflow-x-auto no-scrollbar pb-1">
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

      {/* View Tabs */}
      <div className="mb-4 md:mb-6 flex gap-1 p-1 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--apple-border)]">
        {([
          { key: 'grid' as ViewTab, label: 'Расписание', icon: Calendar },
          { key: 'sections' as ViewTab, label: 'Секции', icon: Dumbbell },
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

      {view === 'grid' ? (
        /* Schedule Grid */
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)] opacity-60 px-1 mb-3 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[var(--color-primary-apple)]" />
            Сетка занятий
          </p>

          {/* Scrollable table */}
          <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0 no-scrollbar">
            <div className="min-w-[560px] md:min-w-0">
              {/* Day headers */}
              <div className="grid grid-cols-[60px_repeat(6,1fr)] md:grid-cols-[80px_repeat(6,1fr)] gap-1 md:gap-1.5 mb-1 md:mb-1.5">
                <div />
                {DAYS.map(day => (
                  <div
                    key={day}
                    className="text-center py-2 md:py-2.5 rounded-xl iron-metal-bg text-white"
                  >
                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider">{day}</span>
                  </div>
                ))}
              </div>

              {/* Time rows */}
              {TIME_SLOTS.map((slot, timeIdx) => (
                <motion.div
                  key={slot.time}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: timeIdx * 0.05, duration: 0.3 }}
                  className="grid grid-cols-[60px_repeat(6,1fr)] md:grid-cols-[80px_repeat(6,1fr)] gap-1 md:gap-1.5 mb-1 md:mb-1.5"
                >
                  {/* Time label */}
                  <div className="flex flex-col items-center justify-center py-2 md:py-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--apple-border)]">
                    <span className="text-[11px] md:text-xs font-black text-[var(--color-text-main)] tracking-tight">{slot.time}</span>
                    <span className="text-[7px] md:text-[8px] font-bold text-[var(--color-text-muted)] opacity-40">{slot.end}</span>
                  </div>

                  {/* Sport cells */}
                  {DAYS.map((_, dayIdx) => {
                    const sportName = SCHEDULE[timeIdx]?.[dayIdx];
                    if (!sportName) {
                      return (
                        <div
                          key={dayIdx}
                          className="flex items-center justify-center py-2 md:py-3 rounded-xl bg-black/[0.01] dark:bg-white/[0.02] border border-dashed border-[var(--apple-border)] opacity-30"
                        >
                          <span className="text-[8px] text-[var(--color-text-muted)]">—</span>
                        </div>
                      );
                    }
                    const emoji = getSportEmoji(sportName);
                    return (
                      <div
                        key={dayIdx}
                        className="flex flex-col items-center justify-center py-2 md:py-3 px-1 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--apple-border)] hover:border-[var(--color-primary-apple)]/30 hover:bg-[var(--color-primary-apple)]/5 transition-all duration-200 group cursor-default"
                      >
                        <span className="text-base md:text-lg leading-none mb-0.5 group-hover:scale-110 transition-transform">{emoji}</span>
                        <span className="text-[7px] md:text-[8px] font-black text-[var(--color-text-main)] text-center leading-tight tracking-tight line-clamp-2">
                          {sportName}
                        </span>
                      </div>
                    );
                  })}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 md:mt-6 flex flex-wrap gap-2 md:gap-3">
            {SPORTS.map(sport => (
              <div key={sport.name} className="flex items-center gap-1.5 text-[8px] md:text-[9px] font-bold text-[var(--color-text-muted)] opacity-60">
                <span className="text-sm">{sport.emoji}</span>
                <span>{sport.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      ) : (
        /* Sports Sections List */
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-2 md:space-y-3"
        >
          <p className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)] opacity-60 px-1 flex items-center gap-2">
            <Dumbbell className="w-3.5 h-3.5 text-[var(--color-primary-apple)]" />
            Секции
          </p>
          {SPORTS.map((sport, idx) => (
            <motion.div
              key={sport.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.3 }}
            >
              <button
                onClick={() => setSelectedSport(selectedSport === idx ? null : idx)}
                className="w-full flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-2xl md:rounded-[24px] bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--apple-border)] active:scale-[0.98] transition-all duration-200 group"
              >
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-2xl md:text-3xl flex-shrink-0 group-active:iron-metal-bg transition-all duration-300">
                  {sport.emoji}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <h3 className="text-[13px] md:text-base font-black text-[var(--color-text-main)] tracking-tight">
                    {sport.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-2.5 h-2.5 text-[var(--color-primary-apple)] opacity-60 flex-shrink-0" />
                    <span className="text-[10px] md:text-xs font-bold text-[var(--color-text-muted)] opacity-50">{sport.place}</span>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 text-[var(--color-text-muted)] opacity-20 flex-shrink-0 transition-transform duration-200 ${selectedSport === idx ? 'rotate-90' : ''}`} />
              </button>

              {selectedSport === idx && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-1 ml-3 mr-3 p-3 md:p-4 rounded-xl md:rounded-2xl bg-[var(--color-primary-apple)]/5 border border-[var(--color-primary-apple)]/10"
                >
                  {/* Show schedule for this sport */}
                  <p className="text-[9px] md:text-[10px] font-black uppercase tracking-wider text-[var(--color-primary-apple)] mb-2">
                    Расписание
                  </p>
                  <div className="space-y-1">
                    {SCHEDULE.map((row, timeIdx) =>
                      row.map((cell, dayIdx) => {
                        if (cell !== sport.name) return null;
                        return (
                          <div key={`${timeIdx}-${dayIdx}`} className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-[var(--color-text-main)] opacity-70">
                            <span className="text-[var(--color-primary-apple)] font-black">{DAYS[dayIdx]}</span>
                            <span className="opacity-40">•</span>
                            <span>{TIME_SLOTS[timeIdx].time} — {TIME_SLOTS[timeIdx].end}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <MapPin className="w-3 h-3 text-[var(--color-primary-apple)] opacity-60" />
                    <span className="text-[9px] md:text-[10px] font-bold text-[var(--color-text-muted)]">{sport.place}</span>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Bottom Info */}
      <div className="mt-6 md:mt-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/5 dark:bg-white/5 border border-[var(--apple-border)]">
          <Dumbbell className="w-3.5 h-3.5 text-[var(--color-primary-apple)]" />
          <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">
            Полный запуск — скоро
          </span>
        </div>
      </div>
    </div>
  );
}
