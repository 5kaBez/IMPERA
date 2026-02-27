import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { X, BookOpen, MapPin, User, Clock, Timer } from 'lucide-react';

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
      const res = await api.get<CurrentResponse>(`/schedule/${groupId}/current${testQuery}`);
      setData(res);
      // При новых данных сбрасываем dismiss (новая пара — новый баннер)
      if (res.currentLesson) {
        const prevId = sessionStorage.getItem('impera_dismissed_lesson');
        if (prevId !== String(res.currentLesson.id)) {
          setDismissed(false);
        }
      }
    } catch {
      // ignore
    }
  }, [groupId]);

  // Fetch current lesson data every 60 seconds
  useEffect(() => {
    fetchCurrent();
    const interval = setInterval(fetchCurrent, 60000);
    return () => clearInterval(interval);
  }, [fetchCurrent]);

  // Countdown timer — update every second
  useEffect(() => {
    if (!data?.currentLesson) return;

    const updateCountdown = () => {
      const now = new Date();
      const endMinutes = data.currentLesson!.endsAtHours * 60 + data.currentLesson!.endsAtMinutes;
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const remainingTotalSeconds = (endMinutes - currentMinutes) * 60 - now.getSeconds();

      if (remainingTotalSeconds <= 0) {
        setCountdown({ minutes: 0, seconds: 0 });
        // Пара закончилась — обновляем данные
        fetchCurrent();
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
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 dark:from-indigo-700 dark:via-purple-700 dark:to-indigo-800 text-white shadow-xl shadow-indigo-500/20 mb-6">
      {/* Animated background dots */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-2 right-20 w-24 h-24 rounded-full bg-white blur-2xl" />
        <div className="absolute bottom-2 left-10 w-16 h-16 rounded-full bg-white blur-xl" />
      </div>

      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white/20 transition-colors z-10"
        title="Скрыть"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="relative p-4 sm:p-5">
        {/* Top row: status + timer */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="relative flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
                Сейчас идёт {lesson.pairNumber}-я пара
              </span>
            </div>
          </div>

          {/* Countdown */}
          <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-1.5">
            <Timer className="w-3.5 h-3.5 text-white/70" />
            <span className="text-sm font-bold tabular-nums tracking-wide">
              {pad(countdown.minutes)}:{pad(countdown.seconds)}
            </span>
          </div>
        </div>

        {/* Subject — large */}
        <h2 className="text-lg sm:text-xl font-bold leading-snug mb-3 pr-8">
          {lesson.subject}
        </h2>

        {/* Details row */}
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {lesson.teacher && (
            <div className="flex items-center gap-1.5 text-sm text-white/80">
              <User className="w-4 h-4 text-white/60" />
              <span>{lesson.teacher}</span>
            </div>
          )}
          {lesson.room && (
            <div className="flex items-center gap-1.5 text-sm text-white/80">
              <MapPin className="w-4 h-4 text-white/60" />
              <span>Ауд. {lesson.room}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-sm text-white/80">
            <Clock className="w-4 h-4 text-white/60" />
            <span>{lesson.timeStart} — {lesson.timeEnd}</span>
          </div>
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
    <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
      <div
        className="h-full bg-white/60 rounded-full transition-all duration-1000 ease-linear"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
