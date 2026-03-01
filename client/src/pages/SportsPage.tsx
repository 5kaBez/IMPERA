import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { SportSection, SportSlot, SportProgress, SportAttendanceRecord, SportSessionInfo } from '../types';
import { DAY_NAMES_SHORT, SPORT_EMOJIS } from '../types';
import {
  Heart, Clock, MapPin, User, Filter, ChevronDown, ChevronUp, Star,
  QrCode, CheckCircle2, XCircle, Timer, Play, Square, Users, Shield, Hash,
} from 'lucide-react';

type ViewMode = 'sections' | 'schedule' | 'attendance';

const TIME_SLOTS = ['09:00', '10:40', '12:55', '14:35', '16:15', '17:55'];
const DAYS = [1, 2, 3, 5, 6];

export default function SportsPage() {
  const { user } = useAuth();
  const [view, setView] = useState<ViewMode>('attendance');
  const [sections, setSections] = useState<SportSection[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const [filterDay, setFilterDay] = useState<number | null>(null);

  // Attendance state
  const [progress, setProgress] = useState<SportProgress | null>(null);
  const [attendance, setAttendance] = useState<SportAttendanceRecord[]>([]);
  const [showCheckin, setShowCheckin] = useState(false);

  // Teacher state
  const [isTeacher, setIsTeacher] = useState(false);
  const [activeSession, setActiveSession] = useState<SportSessionInfo | null>(null);
  const [showTeacherPanel, setShowTeacherPanel] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sectionsData, favData, progressData, attendanceData] = await Promise.all([
        api.get<SportSection[]>('/sports/sections'),
        user ? api.get<SportSection[]>('/sports/favorites').catch(() => []) : Promise.resolve([]),
        user ? api.get<SportProgress>('/sports/attendance/my-progress').catch(() => null) : Promise.resolve(null),
        user ? api.get<SportAttendanceRecord[]>('/sports/attendance/my-attendance').catch(() => []) : Promise.resolve([]),
      ]);
      setSections(sectionsData);
      setFavorites(favData.map((s: SportSection) => s.id));
      if (progressData) setProgress(progressData);
      setAttendance(attendanceData);

      // Check if user is a sport teacher
      if (user) {
        try {
          const sessions = await api.get<any[]>('/sports/attendance/my-sessions');
          setIsTeacher(true);
          const active = sessions.find((s: any) => s.status === 'active');
          if (active) {
            const sessionData = await api.get<SportSessionInfo>(`/sports/attendance/session/${active.id}/code`);
            setActiveSession(sessionData);
          }
        } catch {
          // Not a teacher — that's fine
        }
      }
    } catch (err) {
      console.error('Failed to load sports:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (sectionId: number) => {
    try {
      const result = await api.post<{ favorited: boolean }>(`/sports/favorites/${sectionId}`, {});
      setFavorites(prev => result.favorited ? [...prev, sectionId] : prev.filter(id => id !== sectionId));
    } catch (err) {
      console.error('Favorite error:', err);
    }
  };

  const filteredSections = sections;
  const filteredByDay = filterDay
    ? filteredSections.map(s => ({ ...s, slots: s.slots.filter(slot => slot.dayOfWeek === filterDay) })).filter(s => s.slots.length > 0)
    : filteredSections;

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Физкультура</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {sections.length} {sections.length === 1 ? 'секция' : sections.length < 5 ? 'секции' : 'секций'}
          </p>
        </div>
        {(isTeacher || user?.role === 'admin') && (
          <button
            onClick={() => setShowTeacherPanel(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white text-xs font-medium rounded-lg"
          >
            <Play className="w-3.5 h-3.5" /> Преподавателю
          </button>
        )}
      </div>

      {/* Progress bar */}
      {progress && <ProgressBar progress={progress} />}

      {/* Quick check-in button */}
      <button
        onClick={() => setShowCheckin(true)}
        className="w-full mb-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
      >
        <QrCode className="w-5 h-5" />
        Отметиться на занятии
      </button>

      {/* View Toggle */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl mb-3">
        {([
          { key: 'attendance' as const, label: 'Посещения' },
          { key: 'sections' as const, label: 'Секции' },
          { key: 'schedule' as const, label: 'Сетка' },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setView(t.key)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              view === t.key
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : view === 'attendance' ? (
        <AttendanceHistory records={attendance} />
      ) : view === 'schedule' ? (
        <>
          <DayFilterChips filterDay={filterDay} setFilterDay={setFilterDay} />
          <ScheduleGrid sections={filteredByDay} filterDay={filterDay} />
        </>
      ) : (
        <>
          <DayFilterChips filterDay={filterDay} setFilterDay={setFilterDay} />
          <SectionList
            sections={filteredByDay}
            favorites={favorites}
            expandedSection={expandedSection}
            onToggleExpand={(id) => setExpandedSection(expandedSection === id ? null : id)}
            onToggleFavorite={toggleFavorite}
          />
        </>
      )}

      {/* Check-in modal */}
      {showCheckin && (
        <CheckinModal
          onClose={() => setShowCheckin(false)}
          onSuccess={() => { setShowCheckin(false); loadData(); }}
        />
      )}

      {/* Teacher panel */}
      {showTeacherPanel && (
        <TeacherPanel
          sections={sections}
          activeSession={activeSession}
          onClose={() => setShowTeacherPanel(false)}
          onSessionUpdate={(s) => { setActiveSession(s); }}
          onRefresh={loadData}
        />
      )}
    </div>
  );
}

/* ===== Progress Bar ===== */
function ProgressBar({ progress }: { progress: SportProgress }) {
  const pct = Math.min(100, Math.round((progress.confirmed / progress.required) * 100));
  const pendingPct = Math.min(100 - pct, Math.round((progress.pending / progress.required) * 100));

  return (
    <div className="mb-4 p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Прогресс: {progress.confirmed}/{progress.required}
        </span>
        <span className="text-xs text-gray-500">
          {progress.completed ? '✅ Закрыто!' : `Осталось ${progress.required - progress.confirmed}`}
        </span>
      </div>
      <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex">
        <div
          className="h-full bg-green-500 transition-all duration-500 rounded-l-full"
          style={{ width: `${pct}%` }}
        />
        {pendingPct > 0 && (
          <div
            className="h-full bg-yellow-400 transition-all duration-500"
            style={{ width: `${pendingPct}%` }}
          />
        )}
      </div>
      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Подтв. {progress.confirmed}</span>
        {progress.pending > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" /> Ожидает {progress.pending}</span>}
        {progress.rejected > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Отклон. {progress.rejected}</span>}
      </div>
    </div>
  );
}

/* ===== Check-in Modal ===== */
function CheckinModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async () => {
    if (code.length !== 6) { setError('Введите 6-значный код'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await api.post<{ section: string; sectionEmoji?: string }>('/sports/attendance/checkin', { code });
      setSuccess(`${result.sectionEmoji || '✅'} ${result.section}`);
      setTimeout(onSuccess, 1500);
    } catch (err: any) {
      setError(err?.message || 'Ошибка отметки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-6 mx-4 w-full max-w-sm shadow-xl">
        <h2 className="text-lg font-bold mb-1 text-center">Отметиться</h2>
        <p className="text-xs text-gray-500 text-center mb-4">Введите 6-значный код с экрана преподавателя</p>

        {success ? (
          <div className="text-center py-4">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
            <p className="text-lg font-bold text-green-600">{success}</p>
            <p className="text-xs text-gray-500 mt-1">Ожидает подтверждения преподавателя</p>
          </div>
        ) : (
          <>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              className="w-full text-center text-3xl font-mono font-bold tracking-[0.5em] py-4 px-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 focus:border-indigo-500 focus:outline-none"
              placeholder="------"
            />
            {error && <p className="text-xs text-red-500 text-center mt-2">{error}</p>}
            <button
              onClick={submit}
              disabled={loading || code.length !== 6}
              className="w-full mt-4 py-3 bg-indigo-500 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Проверяем...' : 'Подтвердить'}
            </button>
          </>
        )}

        <button onClick={onClose} className="w-full mt-2 py-2 text-sm text-gray-500 hover:text-gray-700">
          Отмена
        </button>
      </div>
    </div>
  );
}

/* ===== Attendance History ===== */
function AttendanceHistory({ records }: { records: SportAttendanceRecord[] }) {
  if (records.length === 0) {
    return (
      <div className="text-center py-12">
        <QrCode className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
        <p className="text-sm font-medium text-gray-500">Нет посещений</p>
        <p className="text-xs text-gray-400 mt-1">Отметьтесь на занятии с помощью кода</p>
      </div>
    );
  }

  const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
    confirmed: { icon: CheckCircle2, color: 'text-green-500', label: 'Подтверждено' },
    pending: { icon: Timer, color: 'text-yellow-500', label: 'Ожидание' },
    rejected: { icon: XCircle, color: 'text-red-500', label: 'Отклонено' },
  };

  return (
    <div className="space-y-2">
      {records.map(r => {
        const cfg = statusConfig[r.status] || statusConfig.pending;
        const Icon = cfg.icon;
        return (
          <div key={r.id} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <Icon className={`w-5 h-5 flex-shrink-0 ${cfg.color}`} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">
                {r.sectionEmoji || '🏃'} {r.section}
              </p>
              <p className="text-[11px] text-gray-500">
                {r.teacher} · {new Date(r.checkedInAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <span className={`text-[10px] font-medium ${cfg.color}`}>{cfg.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ===== Teacher Panel ===== */
function TeacherPanel({
  sections,
  activeSession,
  onClose,
  onSessionUpdate,
  onRefresh,
}: {
  sections: SportSection[];
  activeSession: SportSessionInfo | null;
  onClose: () => void;
  onSessionUpdate: (s: SportSessionInfo | null) => void;
  onRefresh: () => void;
}) {
  const [session, setSession] = useState<SportSessionInfo | null>(activeSession);
  const [selectedSection, setSelectedSection] = useState<number>(sections[0]?.id || 0);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [checkedStudents, setCheckedStudents] = useState<Set<number>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  // Poll for code updates and new students
  useEffect(() => {
    if (session?.status === 'active') {
      // Init all students as checked
      setCheckedStudents(new Set(session.students.map(s => s.id)));

      pollRef.current = setInterval(async () => {
        try {
          const data = await api.get<SportSessionInfo>(`/sports/attendance/session/${session.sessionId}/code`);
          setSession(data);
          // Auto-check new students
          setCheckedStudents(prev => {
            const next = new Set(prev);
            data.students.forEach(s => next.add(s.id));
            return next;
          });
        } catch {
          // Session may have ended
        }
      }, 5000); // Обновляем каждые 5 сек
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [session?.sessionId, session?.status]);

  const startSession = async () => {
    setStarting(true);
    try {
      const data = await api.post<any>('/sports/attendance/start-session', { sectionId: selectedSection });
      const sessionData = await api.get<SportSessionInfo>(`/sports/attendance/session/${data.sessionId}/code`);
      setSession(sessionData);
      onSessionUpdate(sessionData);
    } catch (err: any) {
      alert(err?.message || 'Ошибка');
    } finally {
      setStarting(false);
    }
  };

  const endSession = async () => {
    if (!session) return;
    setEnding(true);
    try {
      await api.post(`/sports/attendance/session/${session.sessionId}/end`, {
        confirmedStudentIds: Array.from(checkedStudents),
      });
      setSession(null);
      onSessionUpdate(null);
      onRefresh();
    } catch (err: any) {
      alert(err?.message || 'Ошибка');
    } finally {
      setEnding(false);
    }
  };

  const toggleStudent = (id: number) => {
    setCheckedStudents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            <Shield className="w-5 h-5 inline mr-1.5 text-green-500" />
            Панель преподавателя
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
        </div>

        <div className="p-4">
          {!session || session.status !== 'active' ? (
            /* Start session form */
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Начните занятие, чтобы студенты могли отметиться</p>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(Number(e.target.value))}
                className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 mb-3 text-sm"
              >
                {sections.map(s => (
                  <option key={s.id} value={s.id}>{s.emoji || SPORT_EMOJIS[s.name] || '🏃'} {s.name}</option>
                ))}
              </select>
              <button
                onClick={startSession}
                disabled={starting}
                className="w-full py-3 bg-green-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Play className="w-5 h-5" />
                {starting ? 'Создаём...' : 'Начать занятие'}
              </button>
            </div>
          ) : (
            /* Active session */
            <div>
              <p className="text-sm text-gray-500 mb-2 text-center">
                {session.sectionEmoji || '🏃'} <strong>{session.section}</strong>
              </p>

              {/* Rotating code display */}
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 mb-4 text-center">
                <p className="text-white/70 text-xs mb-1">Код для студентов:</p>
                <p className="text-white text-5xl font-mono font-black tracking-[0.3em] leading-none">
                  {session.code}
                </p>
                <p className="text-white/50 text-[10px] mt-2">
                  <Timer className="w-3 h-3 inline mr-1" />
                  Обновится через ~{session.ttl}с
                </p>
              </div>

              {/* Students list */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold flex items-center gap-1">
                    <Users className="w-4 h-4" /> Студенты ({session.studentCount})
                  </h3>
                </div>
                {session.students.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Пока никто не отметился</p>
                ) : (
                  <div className="space-y-1">
                    {session.students.map(s => (
                      <button
                        key={s.id}
                        onClick={() => toggleStudent(s.id)}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm transition-all ${
                          checkedStudents.has(s.id)
                            ? 'bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30'
                            : 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30'
                        }`}
                      >
                        {checkedStudents.has(s.id)
                          ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                          : <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        }
                        <span className="flex-1">
                          {s.firstName} {s.lastName || ''}
                          {s.username && <span className="text-gray-400 ml-1">@{s.username}</span>}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(s.checkedInAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* End session */}
              <button
                onClick={endSession}
                disabled={ending}
                className="w-full py-3 bg-red-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Square className="w-5 h-5" />
                {ending ? 'Завершаем...' : `Завершить (${checkedStudents.size} подтв.)`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===== Day filter chips ===== */
function DayFilterChips({ filterDay, setFilterDay }: { filterDay: number | null; setFilterDay: (d: number | null) => void }) {
  return (
    <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
      <button
        onClick={() => setFilterDay(null)}
        className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
          filterDay === null ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
        }`}
      >
        Все дни
      </button>
      {DAYS.map(day => (
        <button
          key={day}
          onClick={() => setFilterDay(filterDay === day ? null : day)}
          className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
            filterDay === day ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}
        >
          {DAY_NAMES_SHORT[day]}
        </button>
      ))}
    </div>
  );
}

/* ===== Section List View ===== */
function SectionList({ sections, favorites, expandedSection, onToggleExpand, onToggleFavorite }: {
  sections: SportSection[]; favorites: number[]; expandedSection: number | null;
  onToggleExpand: (id: number) => void; onToggleFavorite: (id: number) => void;
}) {
  if (sections.length === 0) {
    return (
      <div className="text-center py-12">
        <Star className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
        <p className="text-sm text-gray-500">Нет секций</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {sections.map(section => {
        const emoji = section.emoji || SPORT_EMOJIS[section.name] || '🏃';
        const isFav = favorites.includes(section.id);
        const isExpanded = expandedSection === section.id;
        const uniqueDays = [...new Set(section.slots.map(s => s.dayOfWeek))];
        return (
          <div key={section.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <button onClick={() => onToggleExpand(section.id)} className="w-full p-3 flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <span className="text-2xl">{emoji}</span>
              <div className="flex-1 min-w-0">
                <h3 className="text-[14px] font-semibold text-gray-900 dark:text-gray-100">{section.name}</h3>
                <p className="text-[11px] text-gray-500">{uniqueDays.map(d => DAY_NAMES_SHORT[d]).join(', ')} · {section.slots.length} зан.</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(section.id); }} className="p-1.5 -m-1.5">
                <Heart className={`w-5 h-5 transition-colors ${isFav ? 'fill-red-500 text-red-500' : 'text-gray-300 dark:text-gray-600'}`} />
              </button>
              {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {isExpanded && (
              <div className="border-t border-gray-100 dark:border-gray-800">
                {section.slots.map(slot => (
                  <div key={slot.id} className="px-3 py-2 flex items-center gap-3 border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                    <span className="text-[11px] font-bold text-indigo-500 w-6 text-center">{DAY_NAMES_SHORT[slot.dayOfWeek]}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-[12px] text-gray-700 dark:text-gray-300">
                        <Clock className="w-3 h-3 text-gray-400" /><span className="font-medium">{slot.timeStart} — {slot.timeEnd}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {slot.teacher}</span>
                        {slot.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {slot.location}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ===== Schedule Grid View ===== */
function ScheduleGrid({ sections, filterDay }: { sections: SportSection[]; filterDay: number | null }) {
  const allSlots: SportSlot[] = sections.flatMap(s =>
    s.slots.map(slot => ({ ...slot, section: { id: s.id, name: s.name, emoji: s.emoji, slots: [] } }))
  );
  const days = filterDay ? [filterDay] : DAYS;
  const byTime = new Map<string, Map<number, SportSlot[]>>();
  for (const slot of allSlots) {
    if (!byTime.has(slot.timeStart)) byTime.set(slot.timeStart, new Map());
    const dayMap = byTime.get(slot.timeStart)!;
    if (!dayMap.has(slot.dayOfWeek)) dayMap.set(slot.dayOfWeek, []);
    dayMap.get(slot.dayOfWeek)!.push(slot);
  }
  const times = TIME_SLOTS.filter(t => byTime.has(t));

  if (times.length === 0) {
    return (
      <div className="text-center py-12">
        <Filter className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
        <p className="text-sm text-gray-500">Нет занятий</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full text-[11px] border-collapse min-w-[500px]">
        <thead>
          <tr>
            <th className="py-2 px-1 text-gray-400 font-medium text-left w-[50px]">Время</th>
            {days.map(day => (<th key={day} className="py-2 px-1 text-indigo-500 font-bold text-center">{DAY_NAMES_SHORT[day]}</th>))}
          </tr>
        </thead>
        <tbody>
          {times.map(time => {
            const dayMap = byTime.get(time)!;
            return (
              <tr key={time} className="border-t border-gray-100 dark:border-gray-800">
                <td className="py-2 px-1 font-bold text-gray-600 dark:text-gray-400 align-top">{time}</td>
                {days.map(day => {
                  const slots = dayMap.get(day) || [];
                  return (
                    <td key={day} className="py-1 px-0.5 align-top">
                      <div className="space-y-0.5">
                        {slots.map(slot => (
                          <div key={slot.id} className="bg-indigo-50 dark:bg-indigo-500/10 rounded-md px-1.5 py-1 text-[10px] leading-tight">
                            <span className="font-semibold text-gray-800 dark:text-gray-200">
                              {slot.section?.emoji || SPORT_EMOJIS[slot.section?.name || ''] || ''} {slot.section?.name}
                            </span>
                            <div className="text-gray-500 dark:text-gray-400 truncate">{slot.teacher}</div>
                          </div>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
