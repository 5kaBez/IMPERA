import { useEffect, useState, useRef } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type {
  SportSection, SportSlot, SportProgress, SportAttendanceRecord,
  SportSessionInfo, SportEnrollment, SportActiveSession,
} from '../types';
import { DAY_NAMES_SHORT, SPORT_EMOJIS } from '../types';
import {
  Heart, Clock, MapPin, User, ChevronDown, ChevronUp, Star,
  CheckCircle2, XCircle, Timer, Play, Users, Shield,
  Navigation, Fingerprint, Link2, AlertTriangle, Calendar,
  Search, Dumbbell, Filter,
} from 'lucide-react';

const TIME_SLOTS = ['09:00', '10:40', '12:55', '14:35', '16:15', '17:55'];
const DAYS = [1, 2, 3, 5, 6];

/* ==========================================================
   MAIN PAGE — роутер по роли
   ========================================================== */
export default function SportsPage() {
  const { user } = useAuth();

  if (user?.role === 'admin') return <AdminSportsView />;
  if (user?.isSportTeacher) return <TeacherSportsView />;
  return <StudentSportsView />;
}

/* ==========================================================
   СТУДЕНТ — прогресс на топе, запись, чекин, секции
   ========================================================== */
function StudentSportsView() {
  const [sections, setSections] = useState<SportSection[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState<SportEnrollment | null>(null);
  const [progress, setProgress] = useState<SportProgress | null>(null);
  const [attendance, setAttendance] = useState<SportAttendanceRecord[]>([]);
  const [activeSession, setActiveSession] = useState<SportActiveSession | null>(null);
  const [tab, setTab] = useState<'sections' | 'schedule' | 'history'>('sections');
  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const [filterDay, setFilterDay] = useState<number | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sectionsData, favData, enrollData, progressData, attendanceData, activeData] = await Promise.all([
        api.get<SportSection[]>('/sports/sections'),
        api.get<SportSection[]>('/sports/favorites').catch(() => []),
        api.get<SportEnrollment | null>('/sports/attendance/my-enrollment').catch(() => null),
        api.get<SportProgress>('/sports/attendance/my-progress').catch(() => null),
        api.get<SportAttendanceRecord[]>('/sports/attendance/my-attendance').catch(() => []),
        api.get<SportActiveSession | null>('/sports/attendance/my-active-session').catch(() => null),
      ]);
      setSections(sectionsData);
      setFavorites(favData.map((s: SportSection) => s.id));
      setEnrollment(enrollData);
      if (progressData) setProgress(progressData);
      setAttendance(attendanceData);
      setActiveSession(activeData);
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
    } catch { }
  };

  const enroll = async (sectionId: number) => {
    try {
      await api.post('/sports/attendance/enroll', { sectionId });
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Ошибка записи');
    }
  };

  const unenroll = async () => {
    if (!confirm('Отписаться от секции?')) return;
    try {
      await api.delete('/sports/attendance/enroll');
      setEnrollment(null);
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Ошибка');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="mb-10 animate-in fade-in slide-in-from-top duration-700">
        <h1 className="text-4xl font-black text-[var(--color-text-main)] tracking-[-0.04em] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary-apple)]/10 text-[var(--color-primary-apple)] flex items-center justify-center shadow-inner">
            <Dumbbell className="w-7 h-7" />
          </div>
          Физкультура
        </h1>
      </div>

      {/* === ПРОГРЕСС-БАР — САМЫЙ ВАЖНЫЙ, ВСЕГДА СВЕРХУ === */}
      {progress && <ProgressBar progress={progress} />}

      {/* Запись на секцию */}
      {enrollment ? (
        <EnrollmentCard enrollment={enrollment} onUnenroll={unenroll} />
      ) : (
        <EnrollmentPrompt sections={sections} onEnroll={enroll} />
      )}

      {/* Кнопка "Я на месте" (если есть активная сессия) */}
      {enrollment && (
        <CheckinArea activeSession={activeSession} onCheckin={() => loadData()} />
      )}

      {/* Tabs: Sections / Grid / My visits */}
      <div className="flex gap-1 p-1.5 apple-glass rounded-2xl mb-8 border border-[var(--apple-border)]">
        {([
          { key: 'sections' as const, label: 'Секции' },
          { key: 'schedule' as const, label: 'Сетка' },
          { key: 'history' as const, label: 'История' },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-3 px-4 rounded-[14px] text-xs font-bold uppercase tracking-wider transition-all duration-500 scale-[0.98] active:scale-95 ${tab === t.key
              ? 'bg-white dark:bg-zinc-800 text-[var(--color-text-main)] shadow-xl shadow-black/5 dark:shadow-white/5 opacity-100'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] opacity-70'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Day Filter */}
      {(tab === 'sections' || tab === 'schedule') && (
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
          <button
            onClick={() => setFilterDay(null)}
            className={`flex-shrink-0 px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${filterDay === null
              ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-black dark:border-white'
              : 'bg-transparent text-[var(--color-text-muted)] border-[var(--apple-border)] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
          >
            Все
          </button>
          {DAYS.map(day => (
            <button
              key={day}
              onClick={() => setFilterDay(filterDay === day ? null : day)}
              className={`flex-shrink-0 px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${filterDay === day
                ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-black dark:border-white'
                : 'bg-transparent text-[var(--color-text-muted)] border-[var(--apple-border)] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
            >
              {DAY_NAMES_SHORT[day]}
            </button>
          ))}
        </div>
      )}

      {/* Контент вкладок */}
      {tab === 'sections' ? (
        <SectionList
          sections={filterDay ? sections.map(s => ({ ...s, slots: s.slots.filter(sl => sl.dayOfWeek === filterDay) })).filter(s => s.slots.length > 0) : sections}
          favorites={favorites}
          expandedSection={expandedSection}
          enrolledSectionId={enrollment?.sectionId}
          onToggleExpand={(id) => setExpandedSection(expandedSection === id ? null : id)}
          onToggleFavorite={toggleFavorite}
          onEnroll={enroll}
        />
      ) : tab === 'schedule' ? (
        <ScheduleGrid
          sections={filterDay ? sections.map(s => ({ ...s, slots: s.slots.filter(sl => sl.dayOfWeek === filterDay) })).filter(s => s.slots.length > 0) : sections}
          filterDay={filterDay}
          enrolledSectionId={enrollment?.sectionId}
        />
      ) : (
        <AttendanceHistory records={attendance} />
      )}
    </div>
  );
}

/* ==========================================================
   ПРЕПОДАВАТЕЛЬ — своё расписание, быстрый старт сессии
   ========================================================== */
function TeacherSportsView() {
  const { user } = useAuth();
  const teachingSections = user?.teachingSections || [];
  const [sections, setSections] = useState<SportSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SportSessionInfo | null>(null);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [checkedStudents, setCheckedStudents] = useState<Set<number>>(new Set());
  const [pastSessions, setPastSessions] = useState<any[]>([]);
  const [teacherTab, setTeacherTab] = useState<'session' | 'schedule' | 'history'>('session');
  const [filterDay, setFilterDay] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sectionsData, teacherSession, sessions] = await Promise.all([
        api.get<SportSection[]>('/sports/sections'),
        api.get<any>('/sports/attendance/my-teacher-session').catch(() => null),
        api.get<any[]>('/sports/attendance/my-sessions').catch(() => []),
      ]);
      setSections(sectionsData);
      setPastSessions(sessions.filter((s: any) => s.status !== 'active'));

      if (teacherSession) {
        await loadSession(teacherSession.sessionId);
      }
    } catch (err) {
      console.error('Teacher load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSession = async (id: number) => {
    try {
      const data = await api.get<SportSessionInfo>(`/sports/attendance/session/${id}`);
      setSession(data);
      setCheckedStudents(new Set(data.students.map(s => s.id)));
    } catch (err) {
      console.error('Load session error:', err);
    }
  };

  // Polling для новых студентов
  useEffect(() => {
    if (session?.status === 'active') {
      pollRef.current = setInterval(async () => {
        try {
          const data = await api.get<SportSessionInfo>(`/sports/attendance/session/${session.sessionId}`);
          setSession(data);
          setCheckedStudents(prev => {
            const next = new Set(prev);
            data.students.forEach(s => next.add(s.id));
            return next;
          });
        } catch { }
      }, 5000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [session?.sessionId, session?.status]);

  const startSession = async (sectionId: number) => {
    setStarting(true);
    try {
      const data = await api.post<any>('/sports/attendance/start-session', { sectionId });
      await loadSession(data.sessionId);
    } catch (err: any) {
      alert(err?.message || 'Ошибка');
    } finally {
      setStarting(false);
    }
  };

  const endSession = async () => {
    if (!session) return;
    if (!confirm(`Завершить занятие?\nПодтвердить: ${checkedStudents.size} студентов`)) return;
    setEnding(true);
    try {
      await api.post(`/sports/attendance/session/${session.sessionId}/end`, {
        confirmedStudentIds: Array.from(checkedStudents),
      });
      setSession(null);
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Ошибка');
    } finally {
      setEnding(false);
    }
  };

  const cancelSession = async () => {
    if (!session) return;
    if (!confirm('Отменить занятие?')) return;
    try {
      await api.post(`/sports/attendance/session/${session.sessionId}/cancel`);
      setSession(null);
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Ошибка');
    }
  };

  const toggleStudent = (id: number) => {
    setCheckedStudents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Мои секции (только те, которые препод ведёт)
  const mySections = sections.filter(s => teachingSections.some(ts => ts.id === s.id));

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          <Shield className="w-5 h-5 inline mr-1.5 -mt-0.5 text-emerald-500" />
          Панель преподавателя
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {user?.firstName} {user?.lastName || ''} · {teachingSections.map(s => `${s.emoji || ''} ${s.name}`).join(', ')}
        </p>
      </div>

      {/* === АКТИВНАЯ СЕССИЯ (всегда показывается сверху если есть) === */}
      {session?.status === 'active' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border-2 border-emerald-300 dark:border-emerald-500/40 overflow-hidden mb-4">
          <div className="bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                {session.sectionEmoji || '🏃'} {session.section} — занятие идёт
              </p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                Начато: {new Date(session.startedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-emerald-600">LIVE</span>
            </div>
          </div>

          <div className="p-4">
            <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
              <Users className="w-4 h-4" /> Студенты ({session.studentCount})
            </h3>

            {session.students.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Users className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 animate-pulse">Ожидание студентов...</p>
                <p className="text-[10px] text-gray-400 mt-1">Они нажимают «✋ Я на месте» в приложении</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {session.students.map(s => {
                  const ok = checkedStudents.has(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleStudent(s.id)}
                      className={`w-full flex items-center gap-2 p-3 rounded-xl text-left text-sm transition-all ${ok
                        ? 'bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30'
                        : 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30'
                        }`}
                    >
                      {ok ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" /> : <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
                      <span className="flex-1 font-medium text-gray-900 dark:text-gray-100">
                        {s.firstName} {s.lastName || ''}
                        {s.username && <span className="text-gray-400 ml-1 text-xs font-normal">@{s.username}</span>}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.geoOk
                        ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                        }`}>
                        {s.geoOk ? `📍 ${s.geoDistM}м` : `🚩 ${s.geoDistM ?? '?'}м`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {session.students.some(s => !s.geoOk) && (
              <div className="mt-3 p-2.5 bg-red-50 dark:bg-red-500/10 rounded-xl text-xs text-red-500 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                🚩 = отметились далеко от зала. Проверьте лично!
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={endSession}
                disabled={ending}
                className="flex-1 py-3 bg-emerald-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 className="w-5 h-5" />
                {ending ? 'Завершаем...' : `Завершить (${checkedStudents.size} ✓)`}
              </button>
              <button
                onClick={cancelSession}
                className="py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-xl"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Вкладки: Занятие / Сетка расписания / История */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl mb-3">
        {([
          { key: 'session' as const, label: '🎯 Занятие' },
          { key: 'schedule' as const, label: '📅 Сетка' },
          { key: 'history' as const, label: '📊 История' },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTeacherTab(t.key)}
            className={`flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-all ${teacherTab === t.key
              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* === Вкладка «Занятие» — кнопки старта или информация === */}
      {teacherTab === 'session' && !session?.status && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Начните занятие — студенты смогут отметиться</p>

          <div className="space-y-2">
            {mySections.map(s => {
              const emoji = s.emoji || SPORT_EMOJIS[s.name] || '🏃';
              const todayDay = new Date().getDay() || 7;
              const todaySlots = s.slots.filter(sl => sl.dayOfWeek === todayDay);
              const now = new Date();
              const nowMin = now.getHours() * 60 + now.getMinutes();
              const nextSlot = todaySlots.find(sl => {
                const [h, m] = sl.timeEnd.split(':').map(Number);
                return h * 60 + m > nowMin;
              });

              return (
                <div key={s.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{emoji} {s.name}</p>
                      {nextSlot ? (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          Сегодня: {nextSlot.timeStart} — {nextSlot.timeEnd}
                        </p>
                      ) : todaySlots.length > 0 ? (
                        <p className="text-xs text-gray-400">Сегодня занятий больше нет</p>
                      ) : (
                        <p className="text-xs text-gray-400">Сегодня нет занятий</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => startSession(s.id)}
                    disabled={starting}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
                  >
                    <Play className="w-5 h-5" />
                    {starting ? 'Создаём...' : 'Начать занятие'}
                  </button>

                  {/* Мини-расписание секции */}
                  <div className="mt-3 grid grid-cols-5 gap-1">
                    {DAYS.map(day => {
                      const daySlots = s.slots.filter(sl => sl.dayOfWeek === day);
                      const isToday = day === todayDay;
                      return (
                        <div key={day} className={`text-center p-1.5 rounded-lg ${isToday ? 'bg-indigo-50 dark:bg-indigo-500/10 ring-1 ring-indigo-300 dark:ring-indigo-500/30' : 'bg-gray-50 dark:bg-gray-800'}`}>
                          <p className={`text-[10px] font-bold ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500'}`}>{DAY_NAMES_SHORT[day]}</p>
                          {daySlots.length > 0 ? daySlots.map(sl => (
                            <p key={sl.id} className="text-[9px] text-gray-600 dark:text-gray-400">{sl.timeStart}</p>
                          )) : (
                            <p className="text-[9px] text-gray-300 dark:text-gray-600">—</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Антифрод-инфо */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <p className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1.5">🛡️ 5 уровней антифрод:</p>
            <div className="grid grid-cols-5 gap-1 text-[9px] text-gray-500 text-center">
              {['📋 Запись', '📍 Гео 1км', '📱 Device', '👁 Визуал', '🔗 SHA-256'].map(l => (
                <span key={l} className="bg-white dark:bg-gray-800 rounded px-1 py-1">{l}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {teacherTab === 'session' && session?.status === 'active' && !session && null}

      {/* === Вкладка «Сетка» — полное расписание всех секций === */}
      {teacherTab === 'schedule' && (
        <div>
          {/* Фильтр по дням */}
          <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
            <button
              onClick={() => setFilterDay(null)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${filterDay === null
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
            >
              Все дни
            </button>
            {DAYS.map(day => (
              <button
                key={day}
                onClick={() => setFilterDay(filterDay === day ? null : day)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${filterDay === day
                  ? 'bg-indigo-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
              >
                {DAY_NAMES_SHORT[day]}
              </button>
            ))}
          </div>
          <ScheduleGrid
            sections={filterDay ? sections.map(s => ({ ...s, slots: s.slots.filter(sl => sl.dayOfWeek === filterDay) })).filter(s => s.slots.length > 0) : sections}
            filterDay={filterDay}
          />
        </div>
      )}

      {/* === Вкладка «История» — прошедшие занятия === */}
      {teacherTab === 'history' && (
        <div>
          {pastSessions.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
              <p className="text-sm text-gray-500">Нет прошедших занятий</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {pastSessions.slice(0, 20).map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 p-2.5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                  <span className="text-lg">{s.sectionEmoji || '🏃'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{s.section}</p>
                    <p className="text-[10px] text-gray-500">
                      {new Date(s.startedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      {' · '}{s.studentCount} студ.
                    </p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${s.status === 'completed' ? 'bg-green-100 dark:bg-green-500/20 text-green-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                    }`}>
                    {s.status === 'completed' ? '✓' : s.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ==========================================================
   АДМИН — статистика, управление преподами, поиск студентов
   ========================================================== */
function AdminSportsView() {
  const [stats, setStats] = useState<any>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [sections, setSections] = useState<SportSection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [tab, setTab] = useState<'stats' | 'teachers' | 'students'>('stats');
  const [loading, setLoading] = useState(true);
  const [integrityResult, setIntegrityResult] = useState<any>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, teachersData, sectionsData] = await Promise.all([
        api.get<any>('/sports/attendance/admin/stats').catch(() => null),
        api.get<any[]>('/sports/attendance/admin/teachers').catch(() => []),
        api.get<SportSection[]>('/sports/sections').catch(() => []),
      ]);
      setStats(statsData);
      setTeachers(teachersData);
      setSections(sectionsData);
    } catch (err) {
      console.error('Admin load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchStudents = async () => {
    if (searchQuery.length < 2) return;
    setSearching(true);
    try {
      const results = await api.get<any[]>(`/sports/attendance/admin/student-search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(results);
    } catch (err: any) {
      alert(err?.message || 'Ошибка поиска');
    } finally {
      setSearching(false);
    }
  };

  const checkIntegrity = async (studentId: number) => {
    try {
      const result = await api.get<any>(`/sports/attendance/admin/integrity/${studentId}`);
      setIntegrityResult(result);
    } catch (err: any) {
      alert(err?.message || 'Ошибка проверки');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          <Shield className="w-5 h-5 inline mr-1.5 -mt-0.5 text-indigo-500" />
          Физкультура — Админ
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl mb-4">
        {([
          { key: 'stats' as const, label: '📊 Статистика' },
          { key: 'teachers' as const, label: '👥 Преподаватели' },
          { key: 'students' as const, label: '🔍 Студенты' },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all ${tab === t.key
              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      {tab === 'stats' && stats && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Секций', value: sections.length, icon: '📋' },
              { label: 'Преподавателей', value: stats.teacherCount, icon: '👨‍🏫' },
              { label: 'Записано студ.', value: stats.enrollmentCount, icon: '✍️' },
              { label: 'Всего сессий', value: stats.totalSessions, icon: '🏷️' },
              { label: 'Активных', value: stats.activeSessions, icon: '🟢' },
              { label: 'Подтв. посещений', value: stats.confirmedAttendances, icon: '✅' },
              { label: 'Закрыли семестр', value: stats.completedStudents, icon: '🎓' },
              { label: 'Норма', value: `${stats.requiredClasses} зан.`, icon: '📏' },
            ].map((s, i) => (
              <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                <p className="text-[10px] text-gray-500">{s.icon} {s.label}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Sections list */}
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-4 mb-2">Секции и расписание</h3>
          <div className="space-y-1.5">
            {sections.map(s => {
              const emoji = s.emoji || SPORT_EMOJIS[s.name] || '🏃';
              const uniqueDays = [...new Set(s.slots.map(sl => sl.dayOfWeek))];
              const teacher = s.slots[0]?.teacher || '—';
              return (
                <div key={s.id} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                  <span className="text-xl">{emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.name}</p>
                    <p className="text-[10px] text-gray-500">{teacher} · {uniqueDays.map(d => DAY_NAMES_SHORT[d]).join(', ')} · {s.slots.length} зан.</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Teachers */}
      {tab === 'teachers' && (
        <div className="space-y-2">
          {teachers.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Нет назначенных преподавателей</p>
            </div>
          ) : (
            teachers.map((t: any) => (
              <div key={t.id} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-lg">
                  {t.sectionEmoji || '🏃'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {t.firstName} {t.lastName || ''}
                    {t.username && <span className="text-gray-400 ml-1 text-xs">@{t.username}</span>}
                  </p>
                  <p className="text-[11px] text-gray-500">{t.section} · TG: {t.telegramId}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Students search */}
      {tab === 'students' && (
        <div>
          <div className="flex gap-2 mb-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Имя, фамилия или @username"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchStudents()}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
            <button
              onClick={searchStudents}
              disabled={searching || searchQuery.length < 2}
              className="px-4 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {searching ? '...' : 'Найти'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-1.5">
              {searchResults.map((s: any) => (
                <div key={s.id} className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {s.firstName} {s.lastName || ''}
                      {s.username && <span className="text-gray-400 ml-1 text-xs">@{s.username}</span>}
                    </p>
                    <button
                      onClick={() => checkIntegrity(s.id)}
                      className="text-[10px] text-indigo-500 hover:text-indigo-600 font-medium"
                    >
                      🔗 Проверить цепочку
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-gray-500">
                    {s.section && <span>{s.sectionEmoji || '🏃'} {s.section}</span>}
                    <span>✅ {s.confirmedClasses}/{s.required} ({s.percentage}%)</span>
                    {s.geoFlags > 0 && <span className="text-red-400">🚩 {s.geoFlags} гео</span>}
                    {s.group && <span>📚 {s.group}</span>}
                  </div>
                  {/* Progress mini bar */}
                  <div className="mt-1.5 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, s.percentage)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Integrity result */}
          {integrityResult && (
            <div className="mt-4 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-bold mb-2 flex items-center gap-1.5">
                🔗 Проверка хеш-цепочки
              </h3>
              <p className="text-sm text-gray-900 dark:text-gray-100 mb-1">{integrityResult.student}</p>
              <p className={`text-sm font-bold ${integrityResult.valid ? 'text-green-500' : 'text-red-500'}`}>
                {integrityResult.valid ? '✅ Цепочка валидна' : '❌ Цепочка нарушена!'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Записей: {integrityResult.totalRecords} · Проверено: {integrityResult.checkedRecords}
              </p>
              {!integrityResult.valid && integrityResult.brokenAt && (
                <p className="text-xs text-red-400 mt-1">Нарушение на записи #{integrityResult.brokenAt}</p>
              )}
              <button onClick={() => setIntegrityResult(null)} className="mt-2 text-xs text-gray-400 hover:text-gray-600">Закрыть</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ==========================================================
   SHARED COMPONENTS
   ========================================================== */

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/* ===== Enrollment Card ===== */
function EnrollmentCard({ enrollment, onUnenroll }: { enrollment: SportEnrollment; onUnenroll: () => void }) {
  const emoji = enrollment.section?.emoji || SPORT_EMOJIS[enrollment.section?.name || ''] || '🏃';
  return (
    <div className="mb-6 p-4 apple-glass rounded-[22px] border border-[var(--color-primary-apple)]/20 shadow-xl shadow-blue-500/5 animate-in slide-in-from-right duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary-apple)]/10 flex items-center justify-center text-2xl">
            {emoji}
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--color-text-main)] mb-0.5">{enrollment.section?.name}</p>
            <p className="text-[10px] font-bold text-[var(--color-primary-apple)] uppercase tracking-wider">Вы записаны</p>
          </div>
        </div>
        <button
          onClick={onUnenroll}
          className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] hover:text-red-500 smooth-transition"
        >
          Сменить
        </button>
      </div>
    </div>
  );
}

/* ===== Enrollment Prompt ===== */
function EnrollmentPrompt({ sections, onEnroll }: { sections: SportSection[]; onEnroll: (id: number) => void }) {
  return (
    <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-500/10 rounded-xl border border-yellow-200 dark:border-yellow-500/30">
      <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">📋 Выберите секцию</p>
      <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-3">Чтобы отмечаться, нужно записаться</p>
      <div className="grid grid-cols-2 gap-2">
        {sections.map(s => {
          const emoji = s.emoji || SPORT_EMOJIS[s.name] || '🏃';
          const days = [...new Set(s.slots.map(sl => sl.dayOfWeek))];
          return (
            <button key={s.id} onClick={() => onEnroll(s.id)} className="p-2.5 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-left hover:border-indigo-400 transition-colors">
              <span className="text-lg">{emoji}</span>
              <p className="text-xs font-semibold mt-0.5 text-gray-900 dark:text-gray-100">{s.name}</p>
              <p className="text-[10px] text-gray-400">{days.map(d => DAY_NAMES_SHORT[d]).join(', ')}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ===== Check-in Area ===== */
function CheckinArea({ activeSession, onCheckin }: { activeSession: SportActiveSession | null; onCheckin: () => void }) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ success: boolean; geoOk?: boolean; dist?: number; error?: string } | null>(null);

  if (!activeSession) return null; // Не показываем ничего если нет сессии

  if (activeSession.done) {
    const cfgs: Record<string, { bg: string; text: string; label: string }> = {
      confirmed: { bg: 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30', text: 'text-green-600', label: '✅ Подтверждено преподавателем' },
      rejected: { bg: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30', text: 'text-red-600', label: '❌ Отклонено' },
      pending: { bg: 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/30', text: 'text-yellow-600', label: '⏳ Ожидает подтверждения' },
    };
    const cfg = cfgs[activeSession.status || 'pending'] || cfgs.pending;
    return (
      <div className={`mb-4 p-3 rounded-xl border ${cfg.bg}`}>
        <p className={`text-sm font-semibold ${cfg.text}`}>{cfg.label}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {activeSession.emoji} {activeSession.section} · {activeSession.teacher}
          {activeSession.geoOk !== null && (activeSession.geoOk ? ' · 📍 В зоне' : ' · 🚩 Далеко')}
        </p>
      </div>
    );
  }

  const getDeviceHash = () => {
    const s = navigator.userAgent + navigator.language + screen.width + 'x' + screen.height + new Date().getTimezoneOffset();
    let h = 0;
    for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
    return 'dev_' + Math.abs(h).toString(36);
  };

  const doCheckin = async () => {
    setChecking(true);
    setResult(null);
    try {
      let geoLat: number | null = null;
      let geoLon: number | null = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, enableHighAccuracy: false })
        );
        geoLat = pos.coords.latitude;
        geoLon = pos.coords.longitude;
      } catch { }
      const r = await api.post<{ success: boolean; geoOk: boolean; dist: number | null }>('/sports/attendance/checkin', {
        sessionId: activeSession.sessionId,
        geoLat, geoLon,
        deviceHash: getDeviceHash(),
      });
      setResult({ success: true, geoOk: r.geoOk, dist: r.dist ?? undefined });
      setTimeout(onCheckin, 1500);
    } catch (err: any) {
      setResult({ success: false, error: err?.message || 'Ошибка' });
    } finally {
      setChecking(false);
    }
  };

  if (result?.success) {
    return (
      <div className={`mb-4 p-4 rounded-xl border text-center ${result.geoOk ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30' : 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/30'}`}>
        <p className="text-3xl mb-1">✅</p>
        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Отмечено!</p>
        <p className="text-xs text-gray-500 mt-1">{result.geoOk ? `📍 В зоне (${result.dist}м)` : `🚩 Далеко (${result.dist}м)`}</p>
        <p className="text-[10px] text-gray-400 mt-1">Убери телефон. Преподаватель подтвердит в конце.</p>
      </div>
    );
  }

  return (
    <div className="mb-4 p-4 bg-white dark:bg-gray-900 rounded-xl border-2 border-emerald-200 dark:border-emerald-500/30">
      <div className="text-center mb-2">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {activeSession.emoji} {activeSession.section} — занятие идёт!
        </p>
        <p className="text-xs text-gray-500">Преподаватель: {activeSession.teacher}</p>
      </div>
      <button
        onClick={doCheckin}
        disabled={checking}
        className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-lg rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
      >
        {checking ? (
          <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Отмечаемся...</>
        ) : (
          <>✋ Я на месте!</>
        )}
      </button>
      {result?.error && <p className="text-xs text-red-500 text-center mt-2">{result.error}</p>}
      <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-gray-400">
        <span className="flex items-center gap-1"><Navigation className="w-3 h-3" /> Гео 1км</span>
        <span className="flex items-center gap-1"><Fingerprint className="w-3 h-3" /> Device ID</span>
        <span className="flex items-center gap-1"><Link2 className="w-3 h-3" /> Hash chain</span>
      </div>
    </div>
  );
}

/* ===== Progress Bar ===== */
function ProgressBar({ progress }: { progress: SportProgress }) {
  const pct = Math.min(100, Math.round((progress.confirmed / progress.required) * 100));
  const pendingPct = Math.min(100 - pct, Math.round((progress.pending / progress.required) * 100));
  return (
    <div className="mb-10 p-6 apple-card shadow-sm border border-[var(--apple-border)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Ваш прогресс</p>
          <span className="text-3xl font-black text-[var(--color-text-main)] tracking-tight">
            {progress.confirmed} <span className="text-sm text-[var(--color-text-muted)] font-bold">/ {progress.required}</span>
          </span>
        </div>
        <div className={`px-4 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-wider ${progress.completed
          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
          : 'bg-zinc-100 dark:bg-zinc-800 text-[var(--color-text-muted)] border border-[var(--apple-border)]'
          }`}>
          {progress.completed ? '✅ Зачёт получен' : `Осталось ${progress.required - progress.confirmed} занятий`}
        </div>
      </div>
      <div className="h-4 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden flex p-0.5 border border-[var(--apple-border)]">
        <div
          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(16,185,129,0.3)]"
          style={{ width: `${pct}%` }}
        />
        {pendingPct > 0 && (
          <div
            className="h-full bg-amber-400/50 rounded-full transition-all duration-1000 ml-0.5"
            style={{ width: `${pendingPct}%` }}
          />
        )}
      </div>
      <div className="flex items-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">Подтверждено: {progress.confirmed}</span>
        </div>
        {progress.pending > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">Ожидает: {progress.pending}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== Attendance History ===== */
function AttendanceHistory({ records }: { records: SportAttendanceRecord[] }) {
  if (records.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
        <p className="text-sm font-medium text-gray-500">Нет посещений</p>
        <p className="text-xs text-gray-400 mt-1">Отметьтесь на занятии «Я на месте»</p>
      </div>
    );
  }
  const statusCfg: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
    confirmed: { icon: CheckCircle2, color: 'text-green-500', label: 'Подтверждено' },
    pending: { icon: Timer, color: 'text-yellow-500', label: 'Ожидание' },
    rejected: { icon: XCircle, color: 'text-red-500', label: 'Отклонено' },
  };
  return (
    <div className="space-y-2">
      {records.map(r => {
        const cfg = statusCfg[r.status] || statusCfg.pending;
        const Icon = cfg.icon;
        return (
          <div key={r.id} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <Icon className={`w-5 h-5 flex-shrink-0 ${cfg.color}`} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">
                {r.sectionEmoji || '🏃'} {r.section}
                {r.geoOk !== undefined && (
                  <span className={`ml-1.5 text-[10px] ${r.geoOk ? 'text-green-500' : 'text-red-400'}`}>
                    {r.geoOk ? '📍' : `🚩 ${r.geoDistM}м`}
                  </span>
                )}
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

/* ===== Section List ===== */
function SectionList({ sections, favorites, expandedSection, enrolledSectionId, onToggleExpand, onToggleFavorite, onEnroll }: {
  sections: SportSection[]; favorites: number[]; expandedSection: number | null; enrolledSectionId?: number;
  onToggleExpand: (id: number) => void; onToggleFavorite: (id: number) => void; onEnroll: (id: number) => void;
}) {
  if (sections.length === 0) {
    return (
      <div className="text-center py-20 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
          <Star className="w-10 h-10 text-zinc-300" />
        </div>
        <p className="text-lg font-bold text-[var(--color-text-muted)]">Нет доступных секций</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {sections.map(section => {
        const emoji = section.emoji || SPORT_EMOJIS[section.name] || '🏃';
        const isFav = favorites.includes(section.id);
        const isExpanded = expandedSection === section.id;
        const isEnrolled = enrolledSectionId === section.id;
        const uniqueDays = [...new Set(section.slots.map(s => s.dayOfWeek))];
        return (
          <div key={section.id} className={`apple-card overflow-hidden smooth-transition border ${isEnrolled ? 'border-[var(--color-primary-apple)] shadow-lg shadow-blue-500/10' : 'border-[var(--apple-border)]'
            }`}>
            <button onClick={() => onToggleExpand(section.id)} className="w-full p-5 flex items-center gap-5 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-3xl shadow-inner">
                {emoji}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-[var(--color-text-main)] mb-1 flex items-center gap-2">
                  {section.name}
                  {isEnrolled && <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[9px] font-black uppercase">Вы здесь</span>}
                </h3>
                <p className="text-xs font-semibold text-[var(--color-text-muted)]">{uniqueDays.map(d => DAY_NAMES_SHORT[d]).join(', ')} &bull; {section.slots[0]?.teacher || 'Инструктор'}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleFavorite(section.id); }}
                  className={`p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-500/10 smooth-transition ${isFav ? 'text-red-500' : 'text-zinc-300'}`}
                >
                  <Heart className={`w-6 h-6 ${isFav ? 'fill-current' : ''}`} />
                </button>
                {isExpanded ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
              </div>
            </button>
            {isExpanded && (
              <div className="px-5 pb-5 animate-in slide-in-from-top-2 duration-300">
                <div className="h-px bg-[var(--apple-border)] mb-4" />
                <div className="space-y-3 mb-6">
                  {section.slots.map(slot => (
                    <div key={slot.id} className="flex items-center justify-between p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-[var(--apple-border)]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-apple)]/10 text-[var(--color-primary-apple)] flex items-center justify-center text-[10px] font-black uppercase">
                          {DAY_NAMES_SHORT[slot.dayOfWeek]}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[var(--color-text-main)]">{slot.timeStart} — {slot.timeEnd}</p>
                          <p className="text-[10px] font-medium text-[var(--color-text-muted)]">{slot.teacher}</p>
                        </div>
                      </div>
                      {slot.location && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[9px] font-bold text-[var(--color-text-muted)]">
                          <MapPin className="w-3 h-3" /> {slot.location}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {!isEnrolled && (
                  <button
                    onClick={() => onEnroll(section.id)}
                    className="w-full py-4 bg-[var(--color-primary-apple)] text-white text-sm font-bold rounded-[18px] hover:shadow-2xl hover:shadow-blue-500/30 transition-all active:scale-95"
                  >
                    Записаться в секцию
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ===== Schedule Grid View (Сетка расписания) ===== */
function ScheduleGrid({ sections, filterDay, enrolledSectionId }: {
  sections: SportSection[]; filterDay: number | null; enrolledSectionId?: number;
}) {
  const [selectedSlot, setSelectedSlot] = useState<{ slot: SportSlot; section: SportSection } | null>(null);

  const allSlots: (SportSlot & { _section: SportSection })[] = sections.flatMap(s =>
    s.slots.map(slot => ({ ...slot, _section: s, section: { id: s.id, name: s.name, emoji: s.emoji, slots: [] } as SportSection }))
  );

  const days = filterDay ? [filterDay] : DAYS;

  // Group by time
  const byTime = new Map<string, Map<number, (SportSlot & { _section: SportSection })[]>>();
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
        <p className="text-sm text-gray-500 dark:text-gray-400">Нет занятий</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-[11px] border-collapse min-w-[500px]">
          <thead>
            <tr>
              <th className="py-2 px-1 text-gray-400 font-medium text-left w-[50px]">Время</th>
              {days.map(day => (
                <th key={day} className="py-2 px-1 text-indigo-500 font-bold text-center">
                  {DAY_NAMES_SHORT[day]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {times.map(time => {
              const dayMap = byTime.get(time)!;
              return (
                <tr key={time} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="py-2 px-1 font-bold text-gray-600 dark:text-gray-400 align-top">
                    {time}
                  </td>
                  {days.map(day => {
                    const slots = dayMap.get(day) || [];
                    return (
                      <td key={day} className="py-1 px-0.5 align-top">
                        <div className="space-y-0.5">
                          {slots.map(slot => {
                            const emoji = slot.section?.emoji || SPORT_EMOJIS[slot.section?.name || ''] || '';
                            const isMine = enrolledSectionId != null && slot.sectionId === enrolledSectionId;
                            const isSelected = selectedSlot?.slot.id === slot.id;
                            return (
                              <button
                                key={slot.id}
                                onClick={() => setSelectedSlot(isSelected ? null : { slot, section: slot._section })}
                                className={`w-full text-left rounded-md px-1.5 py-1 text-[10px] leading-tight transition-all ${isMine
                                  ? 'bg-emerald-100 dark:bg-emerald-500/20 ring-1 ring-emerald-400 dark:ring-emerald-500/50'
                                  : isSelected
                                    ? 'bg-indigo-100 dark:bg-indigo-500/20 ring-1 ring-indigo-400'
                                    : 'bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/15'
                                  } active:scale-95`}
                              >
                                <span className={`font-semibold ${isMine ? 'text-emerald-800 dark:text-emerald-200' : 'text-gray-800 dark:text-gray-200'}`}>
                                  {emoji} {slot.section?.name}
                                </span>
                                <div className={`truncate ${isMine ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                  {slot.teacher}
                                </div>
                                {isMine && <div className="text-[8px] text-emerald-500 font-bold mt-0.5">✓ моя</div>}
                              </button>
                            );
                          })}
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

      {/* Карточка выбранного занятия */}
      {selectedSlot && (
        <SlotDetailCard
          slot={selectedSlot.slot}
          section={selectedSlot.section}
          isMine={enrolledSectionId === selectedSlot.section.id}
          onClose={() => setSelectedSlot(null)}
        />
      )}
    </>
  );
}

/* ===== Карточка деталей занятия ===== */
function SlotDetailCard({ slot, section, isMine, onClose }: {
  slot: SportSlot; section: SportSection; isMine: boolean; onClose: () => void;
}) {
  const emoji = section.emoji || SPORT_EMOJIS[section.name] || '🏃';
  // Все слоты этой секции (для отображения полного расписания)
  const sectionSlots = section.slots || [];
  const uniqueDays = [...new Set(sectionSlots.map(s => s.dayOfWeek))].sort();

  return (
    <div className="mt-3 bg-white dark:bg-gray-900 rounded-xl border-2 border-indigo-200 dark:border-indigo-500/30 overflow-hidden shadow-lg animate-in slide-in-from-bottom-2">
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between ${isMine ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-indigo-50 dark:bg-indigo-500/10'
        }`}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{emoji}</span>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
              {section.name}
              {isMine && <span className="ml-1.5 text-[10px] text-emerald-500 font-medium">✓ моя секция</span>}
            </p>
            <p className="text-[11px] text-gray-500">
              {uniqueDays.map(d => DAY_NAMES_SHORT[d]).join(', ')} · {sectionSlots.length} занятий
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <XCircle className="w-5 h-5" />
        </button>
      </div>

      {/* Выбранное занятие */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-2">Выбранное занятие</p>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${isMine
            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600'
            : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600'
            }`}>
            {DAY_NAMES_SHORT[slot.dayOfWeek]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-100">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-semibold">{slot.timeStart} — {slot.timeEnd}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5">
              <span className="flex items-center gap-1"><User className="w-3 h-3" /> {slot.teacher}</span>
              {slot.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {slot.location}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Полное расписание секции */}
      {sectionSlots.length > 1 && (
        <div className="p-4">
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-2">Все занятия секции</p>
          <div className="grid grid-cols-5 gap-1">
            {DAYS.map(day => {
              const daySlots = sectionSlots.filter(sl => sl.dayOfWeek === day);
              const isCurrentDay = slot.dayOfWeek === day;
              return (
                <div key={day} className={`text-center p-1.5 rounded-lg ${isCurrentDay
                  ? isMine
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 ring-1 ring-emerald-300 dark:ring-emerald-500/30'
                    : 'bg-indigo-50 dark:bg-indigo-500/10 ring-1 ring-indigo-300 dark:ring-indigo-500/30'
                  : 'bg-gray-50 dark:bg-gray-800'
                  }`}>
                  <p className={`text-[10px] font-bold ${isCurrentDay ? (isMine ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400') : 'text-gray-500'}`}>
                    {DAY_NAMES_SHORT[day]}
                  </p>
                  {daySlots.length > 0 ? daySlots.map(sl => (
                    <p key={sl.id} className={`text-[9px] ${sl.id === slot.id ? 'font-bold text-gray-900 dark:text-gray-100' : 'text-gray-500'
                      }`}>{sl.timeStart}</p>
                  )) : (
                    <p className="text-[9px] text-gray-300 dark:text-gray-600">—</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
