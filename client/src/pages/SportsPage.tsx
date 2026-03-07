import { useState } from 'react';
import { Dumbbell, Clock, MapPin, ChevronRight, Sparkles, Wrench } from 'lucide-react';
import { motion } from 'framer-motion';

const SPORTS = [
  { emoji: '⚽', name: 'Футбол', place: 'Стадион ГУУ' },
  { emoji: '🏐', name: 'Волейбол', place: 'Спортзал №1' },
  { emoji: '🏀', name: 'Баскетбол', place: 'Спортзал №2' },
  { emoji: '🏸', name: 'Бадминтон', place: 'Спортзал №1' },
  { emoji: '🏓', name: 'Настольный теннис', place: 'Спортзал №3' },
  { emoji: '♟️', name: 'Шахматы', place: 'Ауд. Л-302' },
  { emoji: '🏋️', name: 'Тренажёрный зал', place: 'Спорткомплекс' },
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

export default function SportsPage() {
  const [selectedSport, setSelectedSport] = useState<number | null>(null);

  return (
    <div className="pb-12">
      {/* Header */}
      <div className="mb-3 md:mb-8">
        <h1 className="text-2xl md:text-5xl font-black metallic-text tracking-[-0.06em] mb-1 lowercase">
          физкультура.
        </h1>
        <div className="flex items-center gap-2">
          <p className="text-[var(--color-text-muted)] font-black uppercase tracking-widest text-[8px] md:text-[10px] opacity-70">
            Спортивные секции ГУУ
          </p>
        </div>
      </div>

      {/* Development Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 md:mb-8 p-4 md:p-6 rounded-2xl md:rounded-[28px] bg-gradient-to-r from-amber-500/5 via-[var(--color-primary-apple)]/10 to-amber-500/5 border border-[var(--color-primary-apple)]/20 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary-apple)]/5 blur-3xl rounded-full" />
        <div className="flex items-start gap-3 relative">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-[var(--color-primary-apple)]/10 flex items-center justify-center flex-shrink-0">
            <Wrench className="w-5 h-5 md:w-6 md:h-6 text-[var(--color-primary-apple)]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[var(--color-primary-apple)]">
                В разработке
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[var(--color-primary-apple)]/10 text-[7px] md:text-[8px] font-black uppercase tracking-wider text-[var(--color-primary-apple)]">
                beta
              </span>
            </div>
            <p className="text-[11px] md:text-sm font-bold text-[var(--color-text-muted)] leading-relaxed">
              Мы работаем над системой записи на физкультуру. Пока вы можете ознакомиться с доступными секциями.
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

      {/* Sports Grid */}
      <div className="space-y-2 md:space-y-3">
        <p className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)] opacity-60 px-1">
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
              {/* Emoji */}
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-2xl md:text-3xl flex-shrink-0 group-active:iron-metal-bg transition-all duration-300">
                {sport.emoji}
              </div>

              {/* Info */}
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

            {/* Expanded Info */}
            {selectedSport === idx && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-1 ml-3 mr-3 p-3 md:p-4 rounded-xl md:rounded-2xl bg-[var(--color-primary-apple)]/5 border border-[var(--color-primary-apple)]/10"
              >
                <p className="text-[10px] md:text-xs font-bold text-[var(--color-text-muted)] leading-relaxed">
                  Подробная информация о секции «{sport.name}» будет доступна после запуска модуля физкультуры.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Clock className="w-3 h-3 text-[var(--color-primary-apple)] opacity-60" />
                  <span className="text-[9px] md:text-[10px] font-bold text-[var(--color-primary-apple)] opacity-70">Скоро!</span>
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

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
