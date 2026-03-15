import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { X, MapPin, User, Clock, Timer } from 'lucide-react';

interface CurrentLessonData {
  id: number;
  subject: string;
  teacher: string;
  room: string;
  lessonType: string;
  pairNumber: number;
  timeStart: string;
  timeEnd: string;
  endsAtHours: number;
  endsAtMinutes: number;
}

interface NextLessonData {
  id: number;
  subject: string;
  teacher: string;
  room: string;
  lessonType: string;
  pairNumber: number;
  timeStart: string;
  timeEnd: string;
  startsAtHours: number;
  startsAtMinutes: number;
}

interface CurrentResponse {
  currentLesson: CurrentLessonData | null;
  nextLesson: NextLessonData | null;
  serverTime: string;
  weekNumber: number;
  parity: number;
}

export default function CurrentLessonBanner() {
  const { user } = useAuth();
  const [data, setData] = useState<CurrentResponse | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [countdown, setCountdown] = useState({ minutes: 0, seconds: 0 });

  const groupId = user?.groupId;

  const fetchCurrent = useCallback(async () => {
    if (!groupId) return;
    try {
      // Dev: поддержка ?_testHour=9&_testMinute=15 в URL для тестирования баннера
      const urlParams = new URLSearchParams(window.location.search);
      const testH = urlParams.get('_testHour');
      const testM = urlParams.get('_testMinute');
      const testQuery = testH ? `?_testHour=${testH}&_testMinute=${testM || '0'}` : '';
      const res = await api.get<CurrentResponse>(`/schedule/${groupId}/current${testQuery}`, {
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });
      setData(res);
      // При новых данных сбрасываем dismiss (новая пара — новый баннер)
      if (res.currentLesson) {
        const prevId = sessionStorage.getItem('impera_dismissed_lesson');
        if (prevId !== String(res.currentLesson.id)) {
          setDismissed(false);
        }
      }
    } catch (err) {
      console.error('[CurrentLesson] Fetch error:', err);
    }
  }, [groupId]);

  // Fetch current lesson data every 30 seconds (more frequent to catch transitions)
  useEffect(() => {
    fetchCurrent();
    const interval = setInterval(fetchCurrent, 30000);
    return () => clearInterval(interval);
  }, [fetchCurrent]);

  // Countdown timer — update every second
  useEffect(() => {
    if (!data?.currentLesson) return;

    let expired = false;

    const updateCountdown = () => {
      if (expired) return; // Уже истекло — не тикаем больше

      const now = new Date();
      const endMinutes = data.currentLesson!.endsAtHours * 60 + data.currentLesson!.endsAtMinutes;
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const remainingTotalSeconds = (endMinutes - currentMinutes) * 60 - now.getSeconds();

      if (remainingTotalSeconds <= 0) {
        expired = true;
        // Пара закончилась — сразу убираем баннер и обновляем данные
        setData(prev => prev ? { ...prev, currentLesson: null } : null);
        setDismissed(false);
        // Через 3 секунды проверяем, может началась следующая пара
        setTimeout(() => fetchCurrent(), 3000);
        return;
      }

      setCountdown({
        minutes: Math.floor(remainingTotalSeconds / 60),
        seconds: remainingTotalSeconds % 60,
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [data?.currentLesson, fetchCurrent]);

  const handleDismiss = () => {
    setDismissed(true);
    if (data?.currentLesson) {
      sessionStorage.setItem('impera_dismissed_lesson', String(data.currentLesson.id));
    }
  };

  // Не показываем если нет текущей пары или закрыли
  if (!data?.currentLesson || dismissed) return null;

  const lesson = data.currentLesson;
  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="relative overflow-hidden apple-glass rounded-2xl md:rounded-[32px] border border-[var(--apple-border)] shadow-lg md:shadow-2xl mb-3 md:mb-10 group">
      {/* Background accents - only on desktop */}
      <div className="hidden md:block absolute top-0 right-0 w-[400px] h-full bg-[var(--color-primary-apple)]/10 blur-[100px] -z-10" />

      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 md:top-4 md:right-4 p-1.5 md:p-2.5 rounded-xl md:rounded-2xl bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 transition-all z-10"
        title="Скрыть"
      >
        <X className="w-3.5 h-3.5 md:w-4 md:h-4 text-[var(--color-text-muted)]" />
      </button>

      <div className="relative p-3 md:p-8">
        {/* Top row: status + timer */}
        <div className="flex items-center justify-between mb-2 md:mb-6">
          <div className="flex items-center gap-1.5 px-2 py-1 md:px-3 md:py-1.5 rounded-full bg-black/5 dark:bg-white/5 border border-[var(--apple-border)]">
            <span className="flex h-1.5 w-1.5 md:h-2 md:w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-400 dark:bg-gray-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 md:h-2 md:w-2 bg-gray-500 dark:bg-gray-400"></span>
            </span>
            <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
              {lesson.pairNumber}-я пара
            </span>
          </div>

          {/* Countdown timer badge */}
          <div className="flex items-center gap-1.5 h-7 md:h-10 px-2.5 md:px-4 rounded-xl md:rounded-2xl bg-black/10 dark:bg-white/10 text-[var(--color-text-main)] shadow-lg mr-6 md:mr-0 border border-[var(--apple-border)]">
            <Timer className="w-3 h-3 md:w-4 md:h-4" />
            <span className="text-[11px] md:text-sm font-bold tabular-nums tracking-wider">
              {pad(countdown.minutes)}:{pad(countdown.seconds)}
            </span>
          </div>
        </div>

        {/* Subject */}
        <h2 className="text-base md:text-3xl font-black text-[var(--color-text-main)] leading-snug md:leading-[1.1] mb-2 md:mb-6 pr-6 md:pr-12 tracking-tight">
          {lesson.subject}
        </h2>

        {/* Details — inline on mobile, cards on desktop */}
        <div className="flex flex-wrap gap-1.5 md:gap-3 mb-2 md:mb-8">
          {[
            { icon: User, text: lesson.teacher },
            { icon: MapPin, text: lesson.room },
            { icon: Clock, text: `${lesson.timeStart}–${lesson.timeEnd}` },
          ].map((info, idx) => (
            <div key={idx} className="flex items-center gap-1 md:gap-2.5 px-2 py-1 md:px-4 md:py-2.5 rounded-lg md:rounded-2xl bg-black/5 dark:bg-white/5 border border-[var(--apple-border)]">
              <info.icon className="w-3 h-3 md:w-4 md:h-4 text-[var(--color-primary-apple)]" />
              <span className="text-[10px] md:text-xs font-bold text-[var(--color-text-main)]">{info.text}</span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <ProgressBar lesson={lesson} />
      </div>
    </div>
  );
}

function ProgressBar({ lesson }: { lesson: CurrentLessonData }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const startMatch = lesson.timeStart.match(/^(\d{1,2})[:\.](\d{2})/);
      const endMatch = lesson.timeEnd.match(/^(\d{1,2})[:\.](\d{2})/);
      if (!startMatch || !endMatch) return;

      const startMin = parseInt(startMatch[1]) * 60 + parseInt(startMatch[2]);
      const endMin = parseInt(endMatch[1]) * 60 + parseInt(endMatch[2]);
      const currentMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

      const total = endMin - startMin;
      const elapsed = currentMin - startMin;
      const pct = Math.min(Math.max((elapsed / total) * 100, 0), 100);
      setProgress(pct);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [lesson]);

  return (
    <div className="w-full h-3 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden relative border border-[var(--apple-border)]">
      <div
        className="h-full rounded-full transition-all duration-1000 ease-linear relative"
        style={{ 
          width: `${progress}%`,
          background: 'linear-gradient(135deg, #142240 0%, #20426C 40%, #2B5A8F 100%)',
          boxShadow: '0 0 20px rgba(32, 66, 108, 0.35)'
        }}
      >
        <div className="absolute inset-0 bg-white/20 animate-pulse" />
      </div>
    </div>
  );
}
