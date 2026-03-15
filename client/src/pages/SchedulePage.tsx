import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { analytics } from '../api/analytics';
import type { Lesson, ScheduleDay, ScheduleWeek, Note } from '../types';
import { DAY_NAMES } from '../types';
import { Calendar, User, ChevronRight, ChevronLeft, Dumbbell, Plus, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiLoader from '../components/EmojiLoader';
import LessonDetailModal from '../components/LessonDetailModal';
import NotesBadge, { DayNotesBlock } from '../components/NotesBadge';
import NoteEditorModal from '../components/NoteEditorModal';
import NoteViewerModal from '../components/NoteViewerModal';
import { useDelayedLoading } from '../hooks/useDelayedLoading';

/** Check if lesson is a sports/PE class */
function isSportLesson(lesson: Lesson): boolean {
  const s = lesson.subject.toLowerCase();
  return (
    s.includes('физкультур') ||
    s.includes('физическая культура') ||
    s.includes('физическая подготовка') ||
    s.includes('физическое воспитание') ||
    s.includes('элект. по физ') ||
    s.includes('элективные дисциплины по физ') ||
    s === 'фп' ||
    s === 'физ-ра' ||
    s.startsWith('элект.дисц.по физ') ||
    s.startsWith('элект. дисц. по физ')
  );
}

type Tab = 'today' | 'tomorrow' | 'week' | 'date';
const MAIN_TABS: ('today' | 'tomorrow' | 'week')[] = ['today', 'tomorrow', 'week'];

export default function SchedulePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('today');
  const [todayData, setTodayData] = useState<ScheduleDay | null>(null);
  const [tomorrowData, setTomorrowData] = useState<ScheduleDay | null>(null);
  const [weekData, setWeekData] = useState<ScheduleWeek | null>(null);
  const [dateData, setDateData] = useState<ScheduleDay | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [loading, setLoading] = useState(true);
  const showLoader = useDelayedLoading(loading, 1500);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [notesForDate, setNotesForDate] = useState<Note[]>([]);
  const [editingNote, setEditingNote] = useState<{ note?: Note; lessonId?: number; lessonSubject?: string; lessonTimeStart?: string; date: string } | null>(null);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  /** If it's a sport lesson -> navigate to /sports with time+day highlight, otherwise open detail modal */
  const handleLessonClick = (lesson: Lesson) => {
    if (isSportLesson(lesson)) {
      navigate('/sports', { state: { highlightTime: lesson.timeStart, highlightDay: lesson.dayOfWeek } });
    } else {
      setSelectedLesson(lesson);
    }
  };

  const groupId = user?.groupId;

  // Close calendar on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setShowCalendar(false);
      }
    };
    if (showCalendar) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCalendar]);

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

    let fetchTask: Promise<void>;

    if (tab === 'today') {
      fetchTask = api.get<ScheduleDay>(`/schedule/${groupId}/today`).then(setTodayData);
    } else if (tab === 'tomorrow') {
      fetchTask = api.get<ScheduleDay>(`/schedule/${groupId}/tomorrow`).then(setTomorrowData);
    } else if (tab === 'week') {
      fetchTask = api.get<ScheduleWeek>(`/schedule/${groupId}/week`).then(weekData => {
        if (!weekData || Object.keys(weekData.days || {}).length === 0) {
          setWeekData({ days: { [new Date().getDay() || 7]: mockLessons }, parity: 2, weekNumber: 1 });
        } else {
          setWeekData(weekData);
        }
      });
    } else if (tab === 'date' && selectedDate) {
      const dateStr = formatDateISO(selectedDate);
      fetchTask = api.get<ScheduleDay>(`/schedule/${groupId}/date/${dateStr}`).then(setDateData);
    } else {
      setLoading(false);
      return;
    }

    // Fetch notes in parallel (for day views)
    if (tab !== 'week') {
      const noteDateStr = tab === 'date' && selectedDate
        ? formatDateISO(selectedDate)
        : tab === 'tomorrow'
          ? formatDateISO(new Date(Date.now() + 86400000))
          : formatDateISO(new Date());
      api.get<{ notes: Note[] }>(`/notes/date/${noteDateStr}`)
        .then(data => {
          const hidden: number[] = JSON.parse(localStorage.getItem('hidden_notes') || '[]');
          const notes = (data.notes || []).filter(n => !hidden.includes(n.id));
          setNotesForDate(notes);
        })
        .catch(() => setNotesForDate([]));
    } else {
      setNotesForDate([]);
    }

    fetchTask.catch((err) => {
      console.warn('API fetch failed, showing mock data:', err);
      if (tab === 'today') {
        setTodayData({ lessons: mockLessons, dayOfWeek: new Date().getDay() || 7, parity: 2, weekNumber: 1, date: new Date().toISOString() });
      } else if (tab === 'tomorrow') {
        setTomorrowData({ lessons: [mockLessons[0]], dayOfWeek: (new Date().getDay() % 7) + 1, parity: 2, weekNumber: 1, date: new Date().toISOString() });
      } else if (tab === 'week') {
        setWeekData({ days: { [new Date().getDay() || 7]: mockLessons }, parity: 2, weekNumber: 1 });
      } else if (tab === 'date' && selectedDate) {
        const dow = selectedDate.getDay();
        setDateData({ lessons: [], dayOfWeek: dow === 0 ? 7 : dow, parity: 2, weekNumber: 1, date: selectedDate.toISOString() });
      }
    }).finally(() => setLoading(false));
  }, [groupId, tab, selectedDate]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setTab('date');
    setShowCalendar(false);
    analytics.trackEvent('schedule_date_pick', 'schedule', 1, { date: formatDateISO(date) });
    analytics.trackButtonClick('schedule_calendar_date_btn', formatDate(date), 'schedule');
  };

  const handleMainTabClick = (t: 'today' | 'tomorrow' | 'week') => {
    setTab(t);
    setShowCalendar(false);
    const buttonText = t === 'today' ? 'Сегодня' : t === 'tomorrow' ? 'Завтра' : 'Неделя';
    analytics.trackEvent('schedule_tab_click', 'schedule', 1, { tab: t });
    analytics.trackButtonClick(`schedule_${t}_btn`, buttonText, 'schedule');
  };

  const handleNoteSave = (note: Note) => {
    setNotesForDate(prev => {
      const idx = prev.findIndex(n => n.id === note.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = note;
        return next;
      }
      return [...prev, note];
    });
  };

  const handleNoteDelete = (noteId: number) => {
    setNotesForDate(prev => prev.filter(n => n.id !== noteId));
  };

  const handleBlockUser = (blockedUserId: number) => {
    // Убираем заметки заблокированного пользователя из списка
    setNotesForDate(prev => prev.filter(n => n.userId !== blockedUserId));
  };

  const handleHideNote = (noteId: number) => {
    // Скрыть одну конкретную заметку (только из текущего view)
    setNotesForDate(prev => prev.filter(n => n.id !== noteId));
    // Сохраняем в localStorage чтобы не показывать снова
    try {
      const hidden = JSON.parse(localStorage.getItem('hidden_notes') || '[]');
      hidden.push(noteId);
      localStorage.setItem('hidden_notes', JSON.stringify(hidden));
    } catch {}
  };

  const handleNoteClick = (note: Note) => {
    // Open read-only viewer for all notes
    setViewingNote(note);
  };

  const handleEditFromViewer = () => {
    if (!viewingNote) return;
    const dateStr = viewingNote.date.split('T')[0];
    setEditingNote({
      note: viewingNote,
      lessonId: viewingNote.lessonId ?? undefined,
      lessonSubject: viewingNote.lesson?.subject,
      lessonTimeStart: viewingNote.lesson?.timeStart,
      date: dateStr,
    });
    setViewingNote(null);
  };

  const getCurrentDateStr = (): string => {
    if (tab === 'date' && selectedDate) return formatDateISO(selectedDate);
    if (tab === 'tomorrow') return formatDateISO(new Date(Date.now() + 86400000));
    return formatDateISO(new Date());
  };

  const headerDate = tab === 'date' && selectedDate ? selectedDate : new Date();

  return (
    <div>
      {/* Header - Responsive */}
      <div className="mb-2 md:mb-6 pt-0">
        <h1 className="text-2xl md:text-5xl lg:text-6xl font-black metallic-text tracking-[-0.08em] mb-1 lowercase">
          расписание
        </h1>
        <div className="flex items-center gap-2 md:gap-4 text-[var(--color-text-muted)] font-black uppercase tracking-widest text-[8px] md:text-[10px]">
          <Calendar className="w-3 md:w-4 h-3 md:h-4 text-[var(--color-primary-apple)]" />
          <p className="opacity-60">
            {formatDate(headerDate)}
          </p>
        </div>
      </div>

      {/* Tabs Row: main tabs + calendar button */}
      <div className="mb-3 md:mb-8 flex items-center gap-2">
        {/* Main liquid tabs */}
        <div className="flex-1 liquid-glass-tab p-1 rounded-[20px] md:rounded-[32px] flex items-center shadow-lg md:shadow-2xl relative overflow-hidden">
          {/* Desktop bubble indicator */}
          <div className="absolute inset-0 pointer-events-none hidden md:block" style={{ filter: "url(#liquid-goo)" }}>
            {MAIN_TABS.map((t) => (
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
            {MAIN_TABS.map((t) => (
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
            {MAIN_TABS.map((t) => (
              <button
                key={t}
                onClick={() => handleMainTabClick(t)}
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

        {/* Calendar button */}
        <div className="relative" ref={calendarRef}>
          <button
            onClick={() => {
              setShowCalendar(prev => !prev);
              analytics.trackButtonClick('schedule_calendar_btn', 'Calendar', 'schedule');
            }}
            className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl md:rounded-[20px] flex items-center justify-center transition-all duration-300 border shadow-lg ${
              tab === 'date'
                ? 'iron-metal-bg text-white shadow-gold-glow border-transparent'
                : showCalendar
                  ? 'bg-[var(--color-primary-apple)]/10 text-[var(--color-primary-apple)] border-[var(--color-primary-apple)]/30'
                  : 'bg-black/[0.03] dark:bg-white/[0.04] text-[var(--color-text-muted)] border-[var(--apple-border)] hover:text-[var(--color-text-main)] hover:border-[var(--color-primary-apple)]/20'
            }`}
          >
            <Calendar className="w-4 h-4 md:w-5 md:h-5" />
          </button>

          {/* Calendar Picker Dropdown */}
          <AnimatePresence>
            {showCalendar && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 top-full mt-2 z-50"
              >
                <CalendarPicker
                  selectedDate={selectedDate}
                  onSelect={handleDateSelect}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Selected date indicator */}
      <AnimatePresence>
        {tab === 'date' && selectedDate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-3 flex items-center gap-2 px-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary-apple)]" />
              <span className="text-[10px] md:text-[11px] font-black text-[var(--color-primary-apple)] uppercase tracking-wider">
                {selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={() => { setTab('today'); setSelectedDate(null); }}
                className="ml-auto text-[9px] font-black text-[var(--color-text-muted)] opacity-50 uppercase tracking-wider hover:opacity-80 transition-opacity"
              >
                Сбросить
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {!groupId ? (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
          <p className="text-base font-medium text-gray-500 dark:text-gray-400">Группа не выбрана</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Выберите группу в профиле</p>
        </div>
      ) : loading ? (
        showLoader ? <EmojiLoader /> : null
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={tab === 'date' ? `date-${selectedDate?.toISOString()}` : tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {tab === 'today' && todayData && (
              <DaySchedule data={todayData} emptyMessage="Сегодня нет занятий" onLessonClick={handleLessonClick} notes={notesForDate} onNoteClick={handleNoteClick} currentUserId={user?.id} onBlockUser={handleBlockUser} onHideNote={handleHideNote} onAddNote={(lessonId, subject, timeStart) => setEditingNote({ lessonId, lessonSubject: subject, lessonTimeStart: timeStart, date: getCurrentDateStr() })} />
            )}
            {tab === 'tomorrow' && tomorrowData && (
              <DaySchedule data={tomorrowData} emptyMessage="Завтра нет занятий" onLessonClick={handleLessonClick} notes={notesForDate} onNoteClick={handleNoteClick} currentUserId={user?.id} onBlockUser={handleBlockUser} onHideNote={handleHideNote} onAddNote={(lessonId, subject, timeStart) => setEditingNote({ lessonId, lessonSubject: subject, lessonTimeStart: timeStart, date: getCurrentDateStr() })} />
            )}
            {tab === 'week' && weekData && (
              <WeekSchedule data={weekData} onLessonClick={handleLessonClick} />
            )}
            {tab === 'date' && dateData && (
              <DaySchedule
                data={dateData}
                emptyMessage={selectedDate ? `${selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} — нет занятий` : 'Нет занятий'}
                onLessonClick={handleLessonClick}
                notes={notesForDate}
                onNoteClick={handleNoteClick}
                currentUserId={user?.id}
                onBlockUser={handleBlockUser}
                onHideNote={handleHideNote}
                onAddNote={(lessonId, subject, timeStart) => setEditingNote({ lessonId, lessonSubject: subject, lessonTimeStart: timeStart, date: getCurrentDateStr() })}
              />
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* FAB — Add Note */}
      {tab !== 'week' && (
        <button
          onClick={() => setEditingNote({ date: getCurrentDateStr() })}
          className="fixed left-4 md:left-6 z-[9998] w-12 h-12 rounded-2xl bg-black/80 dark:bg-black border border-zinc-400 dark:border-zinc-600 text-zinc-100 hover:text-white hover:border-zinc-300 dark:hover:border-zinc-500 font-bold transition-all active:scale-90 hover:scale-105 flex items-center justify-center shadow-lg"
          style={{ bottom: '90px' }}
          title="Добавить заметку"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Lesson Detail Modal */}
      {selectedLesson && (
        <LessonDetailModal
          lesson={selectedLesson}
          onClose={() => setSelectedLesson(null)}
          notes={notesForDate.filter(n => n.lessonId === selectedLesson.id)}
          onNoteClick={handleNoteClick}
          onAddNote={() => setEditingNote({ lessonId: selectedLesson.id, lessonSubject: selectedLesson.subject, lessonTimeStart: selectedLesson.timeStart, date: getCurrentDateStr() })}
        />
      )}

      {/* Note Viewer (read-only) */}
      {viewingNote && (
        <NoteViewerModal
          note={viewingNote}
          currentUserId={user?.id}
          onEdit={handleEditFromViewer}
          onClose={() => setViewingNote(null)}
        />
      )}

      {/* Note Editor */}
      {editingNote && (
        <NoteEditorModal
          lessonId={editingNote.lessonId}
          lessonSubject={editingNote.lessonSubject}
          lessonTimeStart={editingNote.lessonTimeStart}
          date={editingNote.date}
          existingNote={editingNote.note}
          onSave={handleNoteSave}
          onDelete={handleNoteDelete}
          onClose={() => setEditingNote(null)}
        />
      )}
    </div>
  );
}

/* ─── Helpers ─── */

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const MONTH_NAMES_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];
const WEEKDAY_HEADERS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function isSameDay(a: Date, b: Date): boolean {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

/* ─── Calendar Picker ─── */

function CalendarPicker({ selectedDate, onSelect }: {
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
}) {
  const [viewDate, setViewDate] = useState(() => {
    const d = selectedDate || new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const today = new Date();
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  // Build grid: first day of month, padded to start from Monday
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startDow = firstDay.getDay() - 1; // 0=Mon, 6=Sun
  if (startDow < 0) startDow = 6;

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d));
  // Pad to complete last week
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="w-72 md:w-80 rounded-2xl border border-[var(--apple-border)] bg-[var(--color-bg-apple)] shadow-2xl overflow-hidden">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--apple-border)]">
        <button
          onClick={prevMonth}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-black text-[var(--color-text-main)] tracking-tight">
          {MONTH_NAMES_RU[month]} {year}
        </span>
        <button
          onClick={nextMonth}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 px-3 pt-2">
        {WEEKDAY_HEADERS.map(d => (
          <div key={d} className="text-center text-[9px] font-black uppercase tracking-wider text-[var(--color-text-muted)] opacity-50 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 px-3 pb-3 gap-0.5">
        {cells.map((date, idx) => {
          if (!date) {
            return <div key={`empty-${idx}`} className="w-full aspect-square" />;
          }

          const isT = isSameDay(date, today);
          const isSel = selectedDate ? isSameDay(date, selectedDate) : false;
          const isSunday = date.getDay() === 0;

          return (
            <button
              key={date.getDate()}
              onClick={() => onSelect(date)}
              className={`w-full aspect-square rounded-xl flex items-center justify-center text-[12px] md:text-[13px] font-bold transition-all duration-200 relative ${
                isSel
                  ? 'iron-metal-bg text-white shadow-lg shadow-gold-glow/30 font-black scale-105'
                  : isT
                    ? 'bg-[var(--color-primary-apple)]/15 text-[var(--color-primary-apple)] font-black ring-1 ring-[var(--color-primary-apple)]/30'
                    : isSunday
                      ? 'text-[var(--color-text-muted)] opacity-50 hover:bg-black/5 dark:hover:bg-white/5 hover:opacity-80'
                      : 'text-[var(--color-text-main)] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="flex gap-1 px-3 pb-3">
        <button
          onClick={() => onSelect(today)}
          className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-[var(--color-primary-apple)] bg-[var(--color-primary-apple)]/10 hover:bg-[var(--color-primary-apple)]/15 transition-colors"
        >
          Сегодня
        </button>
        <button
          onClick={() => {
            const tmrw = new Date();
            tmrw.setDate(tmrw.getDate() + 1);
            onSelect(tmrw);
          }}
          className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors"
        >
          Завтра
        </button>
        <button
          onClick={() => {
            const nextMon = new Date();
            const dow = nextMon.getDay();
            const daysUntilMon = dow === 0 ? 1 : dow === 1 ? 7 : 8 - dow;
            nextMon.setDate(nextMon.getDate() + daysUntilMon);
            onSelect(nextMon);
          }}
          className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors"
        >
          Пн
        </button>
      </div>
    </div>
  );
}

/* ─── Schedule Display Components ─── */

function DaySchedule({ data, emptyMessage, onLessonClick, notes = [], onNoteClick, onAddNote, currentUserId, onBlockUser, onHideNote }: {
  data: ScheduleDay;
  emptyMessage: string;
  onLessonClick: (l: Lesson) => void;
  notes?: Note[];
  onNoteClick?: (n: Note) => void;
  onAddNote?: (lessonId: number, subject: string, timeStart: string) => void;
  currentUserId?: number;
  onBlockUser?: (userId: number) => void;
  onHideNote?: (noteId: number) => void;
}) {
  const dateOnlyNotes = notes.filter(n => !n.lessonId);

  if (data.lessons.length === 0) {
    return (
      <div>
        {dateOnlyNotes.length > 0 && <DayNotesBlock notes={dateOnlyNotes} currentUserId={currentUserId} onNoteClick={onNoteClick} onBlockUser={onBlockUser} onHideNote={onHideNote} />}
        <div className="text-center py-12 md:py-24 apple-card border-dashed border-[var(--apple-border)] bg-black/5 dark:bg-white/5 squircle overflow-hidden">
          <div className="w-16 md:w-24 h-16 md:h-24 squircle bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto mb-4 md:mb-8 overflow-hidden">
            <Calendar className="w-8 md:w-12 h-8 md:h-12 text-[var(--color-text-muted)] opacity-30" />
          </div>
          <p className="text-lg md:text-2xl font-black text-[var(--color-text-main)] tracking-tight mb-2 lowercase">{emptyMessage}</p>
          <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] metallic-text">
            {data.parity === 1 ? 'Нечётная' : 'Чётная'} &bull; №{data.weekNumber}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {dateOnlyNotes.length > 0 && <DayNotesBlock notes={dateOnlyNotes} currentUserId={currentUserId} onNoteClick={onNoteClick} onBlockUser={onBlockUser} onHideNote={onHideNote} />}
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
        {data.lessons.map((lesson, idx) => {
          const lessonNotes = notes.filter(n => n.lessonId === lesson.id);
          return (
            <motion.div
              key={lesson.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03, duration: 0.3 }}
              className="flex gap-2 items-stretch"
            >
              <div className="flex-1">
                <CompactLessonCard lesson={lesson} onClick={() => onLessonClick(lesson)} />
                <NotesBadge notes={lessonNotes} currentUserId={currentUserId} onNoteClick={onNoteClick} onBlockUser={onBlockUser} onHideNote={onHideNote} />
              </div>
              {onAddNote && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddNote(lesson.id, lesson.subject, lesson.timeStart);
                  }}
                  className="px-3 py-2 md:px-4 md:py-3 rounded-2xl bg-[var(--color-primary-apple)]/10 dark:bg-[var(--color-primary-apple-dark)]/15 border border-[var(--color-primary-apple)]/20 dark:border-[var(--color-primary-apple-dark)]/25 text-[var(--color-primary-apple)] dark:text-[var(--color-primary-apple-dark)] hover:bg-[var(--color-primary-apple)]/20 dark:hover:bg-[var(--color-primary-apple-dark)]/25 transition-all active:scale-90 hover:scale-110 flex items-center justify-center shadow-sm hover:shadow-md"
                  title="Создать заметку на эту пару"
                >
                  <BookOpen className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              )}
            </motion.div>
          );
        })}
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
        <p className="text-lg md:text-2xl font-black text-[var(--color-text-main)] tracking-tight mb-2 lowercase">На этой неделе нет занятий</p>
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
  const isSport = isSportLesson(lesson);

  return (
    <div
      onClick={onClick}
      className="cursor-pointer active:scale-[0.98] transition-transform duration-200"
    >
      {/* Mobile card — ultra compact */}
      <div className={`md:hidden flex items-start gap-3 p-3 rounded-2xl border active:bg-black/[0.08] dark:active:bg-white/[0.08] transition-colors ${isSport
        ? 'bg-emerald-500/[0.04] dark:bg-emerald-500/[0.06] border-emerald-500/15'
        : 'bg-black/[0.03] dark:bg-white/[0.04] border-[var(--apple-border)]'
      }`}>
        {/* Time column */}
        <div className="flex flex-col items-center w-12 flex-shrink-0 pt-0.5">
          <span className="text-[13px] font-black tracking-tight text-[var(--color-text-main)]">{lesson.timeStart}</span>
          <div className="w-4 h-px bg-[var(--color-primary-apple)] opacity-30 my-1" />
          <span className="text-[9px] font-bold text-[var(--color-text-muted)] opacity-40">{lesson.timeEnd}</span>
        </div>
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            {isSport ? (
              <span className="px-2 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <Dumbbell className="w-2.5 h-2.5" />
                Спорт
              </span>
            ) : (
              <span className={`px-2 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-wider ${lesson.lessonType === 'Лекция'
                ? 'iron-metal-bg text-white'
                : lesson.lessonType === 'Практика'
                  ? 'bg-stone-500/10 text-stone-600 dark:text-stone-400 border border-stone-500/20'
                  : lesson.lessonType === 'Лабораторная'
                    ? 'bg-[var(--color-secondary-apple)]/10 text-[var(--color-secondary-apple)] border border-[var(--color-secondary-apple)]/20'
                    : 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border border-zinc-500/20'
                }`}>
                {lesson.lessonType}
              </span>
            )}
            {lesson.room && <span className="text-[8px] font-bold text-[var(--color-text-muted)] opacity-40 uppercase">{lesson.room}</span>}
          </div>
          <h3 className="text-[13px] font-black text-[var(--color-text-main)] leading-snug mb-0.5 tracking-tight lowercase line-clamp-2">
            {lesson.subject}
          </h3>
          {isSport ? (
            <div className="flex items-center gap-1.5 mt-0.5">
              <Dumbbell className="w-2.5 h-2.5 text-emerald-500 opacity-60 flex-shrink-0" />
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 opacity-70">Перейти к секциям →</span>
            </div>
          ) : lesson.teacher ? (
            <div className="flex items-center gap-1.5 mt-0.5">
              <User className="w-2.5 h-2.5 text-[var(--color-primary-apple)] opacity-60 flex-shrink-0" />
              <span className="text-[10px] font-bold text-[var(--color-text-muted)] opacity-50 truncate">{lesson.teacher}</span>
            </div>
          ) : null}
        </div>
        <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] opacity-15 flex-shrink-0 mt-3" />
      </div>

      {/* Desktop card — full design */}
      <div className={`hidden md:flex apple-card flex-row items-center shadow-xl hover:shadow-gold-glow transition-all duration-700 group p-1 relative squircle overflow-hidden ${isSport
        ? 'border-emerald-500/20 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.05]'
        : 'border-[var(--apple-border)] bg-black/[0.03] dark:bg-white/5'
      }`}>
        <div className="flex flex-row items-center gap-6 w-full p-5">
          {/* Time Pillar */}
          <div className={`flex flex-col items-center justify-center w-24 h-24 squircle border transition-all duration-700 group-hover:scale-110 shadow-inner group-hover:-rotate-3 group-hover:translate-x-1 overflow-hidden ${isSport
            ? 'bg-emerald-500/10 border-emerald-500/20 group-hover:bg-emerald-600 group-hover:text-white'
            : 'bg-black/5 dark:bg-white/5 border-[var(--apple-border)] group-hover:iron-metal-bg group-hover:text-white'
          }`}>
            <span className="text-xl font-black tracking-tighter">{lesson.timeStart}</span>
            <div className="w-8 h-0.5 bg-current opacity-20 my-1 rounded-full group-hover:opacity-40"></div>
            <span className="text-[10px] font-black opacity-50 uppercase tracking-widest group-hover:opacity-70">{lesson.timeEnd}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              {isSport ? (
                <span className="px-4 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] border bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 flex items-center gap-2">
                  <Dumbbell className="w-3.5 h-3.5" />
                  Спорт
                </span>
              ) : (
                <span className={`px-4 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] border ${lesson.lessonType === 'Лекция'
                  ? 'iron-metal-bg text-white shadow-lg shadow-gold-glow/20'
                  : lesson.lessonType === 'Практика'
                    ? 'bg-stone-500/10 text-stone-600 dark:text-stone-400 border-stone-500/20'
                    : lesson.lessonType === 'Лабораторная'
                      ? 'bg-[var(--color-secondary-apple)]/10 text-[var(--color-secondary-apple)] border-[var(--color-secondary-apple)]/20'
                      : 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20'
                  }`}>
                  {lesson.lessonType}
                </span>
              )}
              <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] opacity-40">
                AUD. {lesson.room}
              </span>
            </div>

            <h3 className="text-3xl font-black text-[var(--color-text-main)] leading-none mb-3 tracking-tighter lowercase">
              {lesson.subject}
            </h3>

            <div className="flex items-center gap-8 text-[11px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">
              {isSport ? (
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 squircle bg-emerald-500/10 flex items-center justify-center shadow-inner group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 overflow-hidden flex-shrink-0">
                    <Dumbbell className="w-3.5 h-3.5 text-emerald-500 group-hover:text-white" />
                  </div>
                  <span className="text-emerald-600 dark:text-emerald-400">Перейти к секциям →</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 squircle bg-black/5 dark:bg-white/5 flex items-center justify-center shadow-inner group-hover:iron-metal-bg group-hover:text-white transition-all duration-500 overflow-hidden flex-shrink-0">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate">{lesson.teacher}</span>
                </div>
              )}
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
