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
      // Debug log
      console.log('[CurrentLesson] Fetched:', {
        currentLesson: res.currentLesson ? `${res.currentLesson.pairNumber}: ${res.currentLesson.subject}` : null,
        nextLesson: res.nextLesson ? `${res.nextLesson.pairNumber}: ${res.nextLesson.subject}` : null,
        time: new Date().toLocaleTimeString(),
      });
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
    <div className="relative overflow-hidden apple-glass rounded-[32px] border border-[var(--apple-border)] shadow-2xl mb-10 transition-all duration-700 animate-in fade-in zoom-in group">
      {/* Moving Background Accents */}
      <div className="absolute top-0 right-0 w-[400px] h-full bg-[var(--color-primary-apple)]/10 blur-[100px] -z-10 animate-pulse" />
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-transparent via-white/5 to-black/5 pointer-events-none" />
      {/* Animated background dots */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-2 right-20 w-24 h-24 rounded-full bg-white blur-2xl" />
        <div className="absolute bottom-2 left-10 w-16 h-16 rounded-full bg-white blur-xl" />
      </div>

      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 p-2.5 rounded-2xl bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 transition-all z-10 group/close"
        title="Скрыть"
      >
        <X className="w-4 h-4 text-[var(--color-text-muted)] group-hover/close:scale-125 smooth-transition" />
      </button>

      <div className="relative p-6 sm:p-8">
        {/* Top row: status + timer */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Идёт {lesson.pairNumber}-я пара
              </span>
            </div>
          </div>

          {/* Countdown timer badge */}
          <div className="flex items-center gap-2.5 h-10 px-4 rounded-2xl bg-[var(--color-text-main)] text-white shadow-xl scale-105">
            <Timer className="w-4 h-4 animate-pulse" />
            <span className="text-sm font-bold tabular-nums tracking-widest">
              {pad(countdown.minutes)}:{pad(countdown.seconds)}
            </span>
          </div>
        </div>

        {/* Subject */}
        <h2 className="text-3xl font-black text-[var(--color-text-main)] leading-[1.1] mb-6 pr-12 tracking-[-0.03em]">
          {lesson.subject}
        </h2>

        {/* Details Cards */}
        <div className="flex flex-wrap gap-3 mb-8">
          {[
            { icon: User, text: lesson.teacher },
            { icon: MapPin, text: `Аудитория ${lesson.room}` },
            { icon: Clock, text: `${lesson.timeStart} — ${lesson.timeEnd}` },
          ].map((info, idx) => (
            <div key={idx} className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-[var(--apple-border)] shadow-sm">
              <info.icon className="w-4 h-4 text-[var(--color-primary-apple)]" />
              <span className="text-xs font-bold text-[var(--color-text-main)]">{info.text}</span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <ProgressBar lesson={lesson} />
        </div>
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
        className="h-full bg-gradient-to-r from-[var(--color-primary-apple)] to-indigo-500 rounded-full transition-all duration-1000 ease-linear shadow-[0_0_15px_rgba(0,122,255,0.4)] relative"
        style={{ width: `${progress}%` }}
      >
        <div className="absolute inset-0 bg-white/20 animate-pulse" />
      </div>
    </div>
  );
}
