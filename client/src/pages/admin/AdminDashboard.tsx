import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../../api/client';
import type { Feedback, Teacher } from '../../types';
import { Users, BookOpen, Calendar, Building2, Upload, ArrowRight, TrendingUp, Activity, GraduationCap, Layers, Bell, MessageSquare, CheckCircle, Eye, Star, Ticket, Plus, Trash2, Copy, RotateCcw, Download, RefreshCw, Clock, AlertCircle } from 'lucide-react';
import EmojiLoader from '../../components/EmojiLoader';

interface Stats {
  users: number;
  groups: number;
  lessons: number;
  institutes: number;
  directions: number;
  programs: number;
  dau: number;
  mau: number;
  notifyEnabled: number;
  feedbackCount: number;
  feedbackNew: number;
}

type Tab = 'dashboard' | 'analytics' | 'feedback' | 'teachers' | 'codes' | 'autoimport' | 'broadcast';

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('dashboard');

  useEffect(() => {
    api.get<Stats>('/admin/stats').then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <EmojiLoader />
      </div>
    );
  }

  return (
    <div className="pb-12">
      <div className="mb-4 md:mb-12">
        <h1 className="text-2xl md:text-5xl font-black metallic-text tracking-[-0.06em] mb-1 md:mb-3 lowercase">
          админ-панель
        </h1>
        <p className="text-[var(--color-text-muted)] font-black uppercase tracking-widest text-[8px] md:text-[11px] opacity-70">
          Управление IMPERA
        </p>
      </div>

      {/* Tabs — horizontal scroll on mobile */}
      <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0 mb-4 md:mb-12 no-scrollbar">
        <div className="flex gap-1 md:gap-2 p-1 md:p-1.5 apple-glass rounded-2xl md:rounded-[24px] border border-[var(--apple-border)] min-w-max md:min-w-0 md:max-w-xl relative overflow-hidden shadow-lg md:shadow-xl">
          {([
            { key: 'dashboard', label: 'Дашборд' },
            { key: 'analytics', label: 'Аналитика' },
            { key: 'feedback', label: 'Фидбек' },
            { key: 'teachers', label: 'Учителя' },
            { key: 'codes', label: 'Коды' },
            { key: 'autoimport', label: 'Авто-импорт' },
            { key: 'broadcast', label: 'Рассылка' },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`py-2 md:py-4 px-3 md:px-6 rounded-xl md:rounded-[20px] text-[9px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] transition-all duration-500 relative z-10 whitespace-nowrap ${tab === t.key
                ? 'text-white'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                }`}
            >
              {t.label}
              {tab === t.key && (
                <motion.div
                  layoutId="admin-tab-bg"
                  className="absolute inset-0 iron-metal-bg rounded-xl md:rounded-[20px] -z-10 shadow-gold-glow"
                  transition={{ type: "spring", bounce: 0.1, duration: 0.6 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {tab === 'dashboard' && stats && <DashboardTab stats={stats} />}
      {tab === 'analytics' && stats && <AnalyticsTab stats={stats} />}
      {tab === 'feedback' && <FeedbackTab />}
      {tab === 'teachers' && <TeachersTab />}
      {tab === 'codes' && <CodesTab />}
      {tab === 'autoimport' && <AutoImportTab />}
      {tab === 'broadcast' && <BroadcastTab />}
    </div>
  );
}

function DashboardTab({ stats }: { stats: Stats }) {
  return (
    <>
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4 mb-3 md:mb-6">
        <StatCard icon={Calendar} label="Расписание" value={stats.lessons} color="blue" />
        <StatCard icon={Building2} label="Институтов" value={stats.institutes} color="purple" />
        <StatCard icon={Layers} label="Программ" value={stats.programs} color="orange" />
      </div>

      {/* Users & Activity */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-8">
        <StatCard icon={Users} label="Пользователей" value={stats.users} color="green" />
        <GradientStatCard icon={Activity} label="DAU" value={stats.dau} gradient="" />
        <GradientStatCard icon={TrendingUp} label="MAU" value={stats.mau} gradient="" />
        <StatCard icon={Bell} label="Уведомления" value={stats.notifyEnabled} color="orange" />
      </div>

      {/* Feedback summary */}
      {stats.feedbackNew > 0 && (
        <div className="mb-4 md:mb-10 p-3 md:p-6 apple-glass rounded-2xl md:rounded-[28px] border border-amber-500/20 shadow-lg flex items-center gap-3 md:gap-5">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-amber-500" />
          </div>
          <p className="text-xs md:text-base font-bold text-amber-600 dark:text-amber-400">
            {stats.feedbackNew} новых обращений
          </p>
        </div>
      )}

      {/* Quick Actions */}
      <h2 className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-[var(--color-text-muted)] mb-3 md:mb-8 px-1 md:px-2 opacity-70 mt-4 md:mt-12">Быстрые действия</h2>
      <div className="grid grid-cols-3 gap-2 md:gap-8 mb-8 md:mb-16">
        <ActionCard to="/admin/import" icon={Upload} title="Импорт" description="Excel & Data" />
        <ActionCard to="/admin/schedule" icon={Calendar} title="Расписание" description="Управление" />
        <ActionCard to="/admin/users" icon={Users} title="Юзеры" description="Аккаунты" />
      </div>
    </>
  );
}

function AnalyticsTab({ stats }: { stats: Stats }) {
  const totalStructure = stats.institutes + stats.directions + stats.programs + stats.groups;

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Building2} label="Институтов" value={stats.institutes} color="purple" />
        <StatCard icon={GraduationCap} label="Направлений" value={stats.directions} color="blue" />
        <StatCard icon={Layers} label="Программ" value={stats.programs} color="orange" />
        <StatCard icon={BookOpen} label="Групп" value={stats.groups} color="green" />
      </div>

      {/* Distribution bars */}
      <div className="apple-card border border-[var(--apple-border)] p-12 mb-12 shadow-2xl bg-white/10 dark:bg-white/5">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-text-muted)] mb-10 opacity-70">Структура данных</h3>
        <div className="space-y-6">
          <DistributionBar label="Институты" value={stats.institutes} max={totalStructure} color="bg-indigo-500" />
          <DistributionBar label="Направления" value={stats.directions} max={totalStructure} color="bg-blue-500" />
          <DistributionBar label="Программы" value={stats.programs} max={totalStructure} color="bg-amber-500" />
          <DistributionBar label="Группы" value={stats.groups} max={totalStructure} color="bg-emerald-500" />
        </div>
      </div>

      <div className="apple-card border border-[var(--apple-border)] p-12 shadow-2xl bg-white/10 dark:bg-white/5">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-text-muted)] mb-10 opacity-70">Активность пользователей</h3>
        <div className="grid grid-cols-3 gap-8 text-center">
          <div className="animate-in fade-in slide-in-from-bottom duration-500 delay-100">
            <p className="text-4xl font-black text-[var(--color-text-main)] tracking-tighter">{stats.dau}</p>
            <p className="text-[10px] font-bold text-[var(--color-text-muted)] mt-2 uppercase tracking-widest">Сегодня (DAU)</p>
          </div>
          <div className="animate-in fade-in slide-in-from-bottom duration-500 delay-200">
            <p className="text-4xl font-black text-[var(--color-text-main)] tracking-tighter">{stats.mau}</p>
            <p className="text-[10px] font-bold text-[var(--color-text-muted)] mt-2 uppercase tracking-widest">За 30 дней (MAU)</p>
          </div>
          <div className="animate-in fade-in slide-in-from-bottom duration-500 delay-300">
            <p className="text-4xl font-black text-blue-500 tracking-tighter">
              {stats.users > 0 ? Math.round((stats.mau / stats.users) * 100) : 0}%
            </p>
            <p className="text-[10px] font-bold text-[var(--color-text-muted)] mt-2 uppercase tracking-widest">Retention</p>
          </div>
        </div>
      </div>
    </>
  );
}

function FeedbackTab() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    api.get<{ items: Feedback[]; total: number }>(`/admin/feedback?limit=100&status=${filter}`)
      .then(d => setFeedbacks(d.items))
      .finally(() => setLoading(false));
  }, [filter]);

  const updateStatus = async (id: number, status: string) => {
    await api.put(`/admin/feedback/${id}`, { status });
    setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status } : f));
  };

  const typeLabels: Record<string, string> = { suggestion: 'Предложение', complaint: 'Жалоба', bug: 'Баг', other: 'Другое' };
  const statusLabels: Record<string, string> = { new: 'Новое', read: 'Прочитано', resolved: 'Решено' };

  return (
    <div>
      {/* Filter */}
      <div className="flex gap-2 mb-8 apple-glass p-1.5 rounded-2xl border border-[var(--apple-border)] max-w-fit">
        {[
          { key: 'all', label: 'Все' },
          { key: 'new', label: 'Новые' },
          { key: 'read', label: 'Прочитано' },
          { key: 'resolved', label: 'Решено' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-5 py-2 rounded-[12px] text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${filter === f.key
              ? 'bg-[var(--color-primary-apple)] text-white shadow-lg shadow-blue-500/30'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
          <p className="text-gray-500">Обращений нет</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {feedbacks.map(fb => (
            <div key={fb.id} className="apple-card border border-[var(--apple-border)] p-6 hover:shadow-xl smooth-transition">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${fb.type === 'bug' ? 'bg-red-500/10 text-red-500 border border-red-500/10' :
                    fb.type === 'complaint' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/10' :
                      'bg-blue-500/10 text-blue-500 border border-blue-500/10'
                    }`}>
                    {typeLabels[fb.type] || fb.type}
                  </span>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${fb.status === 'new' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' :
                    fb.status === 'read' ? 'bg-zinc-500/10 text-zinc-500' :
                      'bg-zinc-500/10 text-emerald-500 opacity-50'
                    }`}>
                    {statusLabels[fb.status] || fb.status}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                  {new Date(fb.createdAt).toLocaleDateString('ru-RU')}
                </span>
              </div>

              {/* User info */}
              <div className="flex items-center gap-3 mb-4 p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-transparent hover:border-[var(--apple-border)] transition-all">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[11px] font-black">
                  {fb.user?.firstName?.[0] || '?'}
                </div>
                <div>
                  <p className="text-xs font-black text-[var(--color-text-main)]">
                    {fb.user?.firstName} {fb.user?.lastName || ''}
                    {fb.user?.username && <span className="text-blue-500 ml-1">@{fb.user.username}</span>}
                  </p>
                  {fb.user?.group && (
                    <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mt-0.5">
                      {fb.user.group.course} КУРС · {fb.user.group.number} ГРУППА
                    </p>
                  )}
                </div>
              </div>

              {/* Message */}
              <p className="text-sm text-gray-900 dark:text-gray-100 mb-3 whitespace-pre-wrap">{fb.message}</p>

              {/* Actions */}
              <div className="flex gap-2">
                {fb.status === 'new' && (
                  <button
                    onClick={() => updateStatus(fb.id, 'read')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all"
                  >
                    <Eye className="w-3 h-3" /> Прочитано
                  </button>
                )}
                {fb.status !== 'resolved' && (
                  <button
                    onClick={() => updateStatus(fb.id, 'resolved')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-500/20 transition-all"
                  >
                    <CheckCircle className="w-3 h-3" /> Решено
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TeachersTab() {
  const [teachers, setTeachers] = useState<(Teacher & { avgRating: number; reviewCount: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    api.get<(Teacher & { avgRating: number; reviewCount: number })[]>('/admin/teachers')
      .then(setTeachers)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (teachers.length === 0) {
    return (
      <div className="apple-card border border-[var(--apple-border)] p-12 text-center">
        <div className="w-20 h-20 rounded-[28px] bg-zinc-500/10 flex items-center justify-center mx-auto mb-6">
          <GraduationCap className="w-10 h-10 text-zinc-300" />
        </div>
        <p className="text-xl font-black text-[var(--color-text-main)] tracking-tight">Преподаватели не найдены</p>
        <p className="text-sm font-medium text-[var(--color-text-muted)] mt-2">Они появятся здесь после первых отзывов студентов</p>
      </div>
    );
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <Star key={i} className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'}`} />
        ))}
      </div>
    );
  };

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 md:gap-6 mb-4 md:mb-10">
        <div className="apple-card border border-[var(--apple-border)] p-3 md:p-6 text-center">
          <p className="text-2xl md:text-4xl font-black text-[var(--color-text-main)] tracking-tighter">{teachers.length}</p>
          <p className="text-[8px] md:text-[10px] font-bold text-[var(--color-text-muted)] mt-1 md:mt-2 uppercase tracking-widest">Активно</p>
        </div>
        <div className="apple-card border border-[var(--apple-border)] p-3 md:p-6 text-center">
          <p className="text-2xl md:text-4xl font-black text-[var(--color-text-main)] tracking-tighter">
            {teachers.reduce((s, t) => s + t.reviewCount, 0)}
          </p>
          <p className="text-[8px] md:text-[10px] font-bold text-[var(--color-text-muted)] mt-1 md:mt-2 uppercase tracking-widest">Отзывов</p>
        </div>
        <div className="apple-card border border-[var(--apple-border)] p-3 md:p-6 text-center">
          <p className="text-2xl md:text-4xl font-black text-amber-500 tracking-tighter">
            {teachers.length > 0
              ? (teachers.reduce((s, t) => s + t.avgRating, 0) / teachers.filter(t => t.avgRating > 0).length || 0).toFixed(1)
              : '—'}
          </p>
          <p className="text-[8px] md:text-[10px] font-bold text-[var(--color-text-muted)] mt-1 md:mt-2 uppercase tracking-widest">Рейтинг</p>
        </div>
      </div>

      {/* Teachers list */}
      <div className="grid gap-2 md:gap-4">
        {teachers.sort((a, b) => b.reviewCount - a.reviewCount).map(teacher => (
          <div key={teacher.id} className="apple-card border border-[var(--apple-border)] overflow-hidden shadow-sm">
            <button
              onClick={() => setExpanded(expanded === teacher.id ? null : teacher.id)}
              className="w-full p-3 md:p-5 flex items-center gap-3 md:gap-4 text-left active:bg-black/5 dark:active:bg-white/5 transition-all"
            >
              <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-[18px] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs md:text-base font-black flex-shrink-0 shadow-lg shadow-blue-500/20">
                {teacher.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm font-black text-[var(--color-text-main)] truncate tracking-tight">{teacher.name}</p>
              </div>
              <div className="flex items-center gap-1.5 md:gap-3 flex-shrink-0 bg-black/5 dark:bg-white/5 px-2 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl">
                {renderStars(teacher.avgRating)}
                <span className="text-xs md:text-sm font-black text-[var(--color-text-main)]">{teacher.avgRating.toFixed(1)}</span>
                <span className="text-[8px] md:text-[10px] font-bold text-[var(--color-text-muted)]">({teacher.reviewCount})</span>
              </div>
            </button>

            {/* Expanded reviews */}
            {expanded === teacher.id && teacher.reviews.length > 0 && (
              <div className="border-t border-gray-100 dark:border-gray-800 px-4 pb-4">
                <p className="text-xs font-semibold text-gray-500 mt-3 mb-2">Отзывы:</p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {teacher.reviews.map(review => (
                    <div key={review.id} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {renderStars(review.rating)}
                          {!review.anonymous && review.user && (
                            <span className="text-xs text-gray-500">
                              {review.user.firstName} {review.user.lastName || ''}
                            </span>
                          )}
                          {review.anonymous && (
                            <span className="text-xs text-gray-400 italic">Анонимно</span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {new Date(review.createdAt).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                      {review.text && (
                        <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">{review.text}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface InviteCode {
  id: number;
  code: string;
  used: boolean;
  usedByTgId: string | null;
  usedAt: string | null;
  createdAt: string;
}

function CodesTab() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createCount, setCreateCount] = useState(1);
  const [copied, setCopied] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const fetchCodes = () => {
    setLoading(true);
    api.get<InviteCode[]>('/admin/invite-codes').then(setCodes).finally(() => setLoading(false));
  };

  useEffect(() => { fetchCodes(); }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await api.post('/admin/invite-codes', { count: createCount });
      fetchCodes();
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    await api.delete(`/admin/invite-codes/${id}`);
    setCodes(prev => prev.filter(c => c.id !== id));
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleResetUsers = async () => {
    if (!confirm('Сбросить activated у всех не-админов? Они снова увидят экран ввода кода.')) return;
    setResetting(true);
    try {
      const res = await api.post<{ updated: number }>('/admin/invite-codes/reset-users', {});
      alert(`Сброшено: ${res.updated} пользователей`);
      fetchCodes();
    } finally {
      setResetting(false);
    }
  };

  const usedCount = codes.filter(c => c.used).length;
  const activeCount = codes.filter(c => !c.used).length;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 md:gap-6 mb-4 md:mb-8">
        <div className="apple-card border border-[var(--apple-border)] p-3 md:p-6 text-center">
          <p className="text-2xl md:text-4xl font-black text-[var(--color-text-main)] tracking-tighter">{codes.length}</p>
          <p className="text-[8px] md:text-[10px] font-bold text-[var(--color-text-muted)] mt-1 md:mt-2 uppercase tracking-widest">Всего</p>
        </div>
        <div className="apple-card border border-[var(--apple-border)] p-3 md:p-6 text-center">
          <p className="text-2xl md:text-4xl font-black text-emerald-500 tracking-tighter">{activeCount}</p>
          <p className="text-[8px] md:text-[10px] font-bold text-[var(--color-text-muted)] mt-1 md:mt-2 uppercase tracking-widest">Активных</p>
        </div>
        <div className="apple-card border border-[var(--apple-border)] p-3 md:p-6 text-center">
          <p className="text-2xl md:text-4xl font-black text-red-500 tracking-tighter">{usedCount}</p>
          <p className="text-[8px] md:text-[10px] font-bold text-[var(--color-text-muted)] mt-1 md:mt-2 uppercase tracking-widest">Использовано</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 md:gap-3 mb-4 md:mb-8">
        <div className="flex items-center gap-2 apple-glass border border-[var(--apple-border)] rounded-2xl p-1.5 md:p-2">
          <select
            value={createCount}
            onChange={e => setCreateCount(Number(e.target.value))}
            className="bg-transparent text-xs md:text-sm font-bold text-[var(--color-text-main)] px-2 py-1 rounded-xl outline-none"
          >
            {[1, 3, 5, 10, 15, 20].map(n => (
              <option key={n} value={n}>{n} шт</option>
            ))}
          </select>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-xl iron-metal-bg text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-gold-glow active:scale-95 transition-all disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            {creating ? 'Создаю...' : 'Создать'}
          </button>
        </div>

        <button
          onClick={handleResetUsers}
          disabled={resetting}
          className="flex items-center gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {resetting ? 'Сброс...' : 'Сбросить юзеров'}
        </button>
      </div>

      {/* Codes list */}
      <div className="grid gap-2 md:gap-3">
        {codes.map(code => (
          <div
            key={code.id}
            className={`apple-card border p-3 md:p-4 flex items-center gap-3 md:gap-4 ${
              code.used
                ? 'border-red-500/20 opacity-60'
                : 'border-emerald-500/20'
            }`}
          >
            {/* Code */}
            <button
              onClick={() => handleCopy(code.code)}
              className="flex items-center gap-2 min-w-0"
              title="Скопировать"
            >
              <span className="text-lg md:text-2xl font-black tracking-[0.15em] text-[var(--color-text-main)] font-mono">
                {code.code}
              </span>
              <Copy className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${
                copied === code.code ? 'text-emerald-500' : 'text-[var(--color-text-muted)] opacity-40'
              }`} />
            </button>

            {/* Status */}
            <div className="ml-auto flex items-center gap-2 md:gap-3 flex-shrink-0">
              {code.used ? (
                <div className="text-right">
                  <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-red-500 bg-red-500/10 px-2 py-1 rounded-lg">
                    Использован
                  </span>
                  {code.usedByTgId && (
                    <p className="text-[8px] font-bold text-[var(--color-text-muted)] mt-1">
                      TG: {code.usedByTgId}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">
                    Активен
                  </span>
                  <button
                    onClick={() => handleDelete(code.id)}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"
                    title="Удалить"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== Auto-Import Tab =====
interface ImportRecord {
  id: number;
  status: string;
  importedRows: number;
  skippedRows: number;
  institutes: number;
  directions: number;
  programs: number;
  groups: number;
  source: string;
  error?: string;
  filePath?: string;
  startedAt: string;
  finishedAt?: string;
}

function AutoImportTab() {
  const [history, setHistory] = useState<ImportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

  const loadHistory = () => {
    api.get<ImportRecord[]>('/admin/import-history?limit=20')
      .then(setHistory)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadHistory(); }, []);

  const handleAutoImport = async () => {
    if (importing) return;
    setImporting(true);
    setImportResult(null);
    try {
      const result = await api.post<{ success: boolean; error?: string; stats?: any }>('/admin/auto-import', {});
      setImportResult({
        success: result.success,
        message: result.success
          ? `Импортировано ${result.stats?.imported || 0} строк`
          : `Ошибка: ${result.error}`,
      });
      loadHistory();
    } catch (err: any) {
      setImportResult({ success: false, message: err.message || 'Ошибка импорта' });
    } finally {
      setImporting(false);
    }
  };

  const handleDownload = (id: number) => {
    window.open(`/api/admin/import-history/${id}/download`, '_blank');
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (start: string, end?: string) => {
    if (!end) return '...';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const sec = Math.round(ms / 1000);
    return sec < 60 ? `${sec}с` : `${Math.floor(sec / 60)}м ${sec % 60}с`;
  };

  return (
    <div>
      {/* Trigger button */}
      <div className="mb-8">
        <div className="apple-card border border-[var(--apple-border)] p-6 md:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-[var(--color-text-main)] tracking-tight mb-1">Авто-импорт с guu.ru</h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                Автоматически скачивает расписание с сайта ГУУ, парсит и загружает в базу.
                Ежедневно в 7:00 МСК.
              </p>
            </div>
            <button
              onClick={handleAutoImport}
              disabled={importing}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl iron-metal-bg text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-black/20 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap"
            >
              {importing ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {importing ? 'Импорт...' : 'Запустить сейчас'}
            </button>
          </div>

          {importResult && (
            <div className={`mt-4 p-4 rounded-2xl border ${
              importResult.success
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
            }`}>
              <p className="text-xs font-bold flex items-center gap-2">
                {importResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {importResult.message}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <h3 className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-[var(--color-text-muted)] mb-4 px-1 opacity-70">
        История импортов
      </h3>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : history.length === 0 ? (
        <div className="apple-card border border-[var(--apple-border)] p-8 text-center">
          <Upload className="w-12 h-12 mx-auto mb-3 text-zinc-300 dark:text-zinc-700" />
          <p className="text-sm font-bold text-[var(--color-text-muted)]">Импортов пока нет</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {history.map(rec => (
            <div key={rec.id} className={`apple-card border p-4 md:p-6 ${
              rec.status === 'error' ? 'border-red-500/20' :
              rec.status === 'running' ? 'border-amber-500/20' :
              'border-[var(--apple-border)]'
            }`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Status badge */}
                  <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                    rec.status === 'success' ? 'bg-emerald-500/10 text-emerald-500' :
                    rec.status === 'error' ? 'bg-red-500/10 text-red-500' :
                    'bg-amber-500/10 text-amber-500'
                  }`}>
                    {rec.status === 'success' ? 'Успешно' : rec.status === 'error' ? 'Ошибка' : 'В процессе'}
                  </span>
                  {/* Source badge */}
                  <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                    rec.source === 'auto' ? 'bg-blue-500/10 text-blue-500' : 'bg-zinc-500/10 text-zinc-500'
                  }`}>
                    {rec.source === 'auto' ? 'Авто' : 'Ручной'}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] font-bold text-[var(--color-text-muted)] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDateTime(rec.startedAt)}
                  </span>
                </div>
              </div>

              {rec.status === 'success' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 text-center">
                    <p className="text-lg font-black text-[var(--color-text-main)]">{rec.importedRows.toLocaleString()}</p>
                    <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-wider">Строк</p>
                  </div>
                  <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 text-center">
                    <p className="text-lg font-black text-[var(--color-text-main)]">{rec.institutes}</p>
                    <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-wider">Институтов</p>
                  </div>
                  <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 text-center">
                    <p className="text-lg font-black text-[var(--color-text-main)]">{rec.groups}</p>
                    <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-wider">Групп</p>
                  </div>
                  <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 text-center">
                    <p className="text-lg font-black text-[var(--color-text-main)]">{formatDuration(rec.startedAt, rec.finishedAt)}</p>
                    <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-wider">Время</p>
                  </div>
                </div>
              )}

              {rec.error && (
                <p className="text-xs text-red-500 font-medium mb-3 bg-red-500/5 p-3 rounded-xl">
                  {rec.error}
                </p>
              )}

              {rec.filePath && rec.status === 'success' && (
                <button
                  onClick={() => handleDownload(rec.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-wider hover:bg-blue-500/20 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  Скачать Excel
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BroadcastTab() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; sent?: number; failed?: number; total?: number; error?: string } | null>(null);

  const handleSend = async () => {
    if (!message.trim()) {
      setResult({ success: false, error: 'Сообщение не может быть пустым' });
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/admin/broadcast', { message });
      setResult({ success: true, ...res });
      if (res.success) setMessage('');
    } catch (err: any) {
      setResult({ success: false, error: err.message || 'Ошибка отправки' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="apple-card border border-[var(--apple-border)] p-6 md:p-8 shadow-xl mb-6">
        <h3 className="text-lg font-black text-[var(--color-text-main)] tracking-tight mb-1">Рассылка в Telegram</h3>
        <p className="text-xs text-[var(--color-text-muted)] mb-6">
          Отправить сообщение всем пользователям, которые запустили бота
        </p>

        <div className="mb-4">
          <label className="block text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
            Сообщение (MarkdownV2)
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Введите текст сообщения..."
            disabled={loading}
            className="w-full h-[180px] p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-[var(--apple-border)] text-[var(--color-text-main)] placeholder-[var(--color-text-muted)]/50 font-medium resize-none focus:border-[var(--color-primary-apple)] outline-none transition-all disabled:opacity-50"
          />
          <p className="text-[10px] text-[var(--color-text-muted)] mt-2 opacity-60">
            Поддерживает MarkdownV2: *жирный* _курсив_ ~зачёркнутый~ `код` [ссылка](url)
          </p>
        </div>

        <button
          onClick={handleSend}
          disabled={loading || !message.trim()}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-2xl iron-metal-bg text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-black/20 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Отправляю...
            </>
          ) : (
            <>
              <MessageSquare className="w-4 h-4" />
              Отправить всем
            </>
          )}
        </button>
      </div>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`apple-card border ${
            result.success
              ? 'border-emerald-500/20 bg-emerald-500/10 dark:bg-emerald-500/5'
              : 'border-red-500/20 bg-red-500/10 dark:bg-red-500/5'
          } p-4 md:p-6 shadow-lg`}
        >
          <p className={`text-sm font-black ${result.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {result.success ? '✅ Рассылка отправлена!' : '❌ ' + (result.error || 'Ошибка')}
          </p>
          {result.sent !== undefined && (
            <p className="text-xs text-[var(--color-text-muted)] mt-2">
              Отправлено: {result.sent} / {result.total} {result.failed ? `(ошибок: ${result.failed})` : ''}
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-500',
    purple: 'bg-indigo-500/10 text-indigo-500',
    green: 'bg-emerald-500/10 text-emerald-500',
    orange: 'bg-amber-500/10 text-amber-500',
  };

  return (
    <div className="apple-card border border-[var(--apple-border)] p-4 md:p-8 shadow-lg md:shadow-xl smooth-transition group bg-white/10 dark:bg-white/5 squircle overflow-hidden">
      <div className={`w-10 h-10 md:w-16 md:h-16 squircle flex items-center justify-center mb-3 md:mb-6 shadow-lg overflow-hidden ${colors[color]}`}>
        <Icon className="w-5 h-5 md:w-8 md:h-8" />
      </div>
      <p className="text-2xl md:text-5xl font-black metallic-text tracking-tighter mb-1 md:mb-2">{value.toLocaleString()}</p>
      <p className="text-[7px] md:text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.15em] md:tracking-[0.2em] opacity-60">{label}</p>
    </div>
  );
}

function GradientStatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number; gradient: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl md:rounded-[36px] iron-metal-bg text-white p-4 md:p-8 shadow-xl md:shadow-2xl transition-all duration-500 active:scale-[0.98] group`}>
      <div className="hidden md:block absolute top-0 right-0 w-48 h-48 bg-white/20 blur-[80px] rounded-full" />
      <div className="relative z-10">
        <div className="w-10 h-10 md:w-16 md:h-16 squircle bg-white/20 flex items-center justify-center mb-3 md:mb-6 shadow-lg overflow-hidden">
          <Icon className="w-5 h-5 md:w-8 md:h-8" />
        </div>
        <p className="text-2xl md:text-5xl font-black tracking-tighter mb-1 md:mb-2">{value.toLocaleString()}</p>
        <p className="text-[7px] md:text-[9px] font-black text-white/70 uppercase tracking-[0.15em] md:tracking-[0.2em]">{label}</p>
      </div>
    </div>
  );
}

function DistributionBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">{label}</span>
        <span className="text-xs font-black text-[var(--color-text-main)]">{value}</span>
      </div>
      <div className="w-full h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} shadow-[0_0_10px_rgba(0,0,0,0.1)] transition-all duration-1000 ease-out`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ActionCard({ to, icon: Icon, title, description }: { to: string; icon: any; title: string; description: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center md:items-start gap-2 md:gap-6 p-3 md:p-8 apple-card border border-[var(--apple-border)] shadow-lg active:scale-95 transition-all group bg-white/5 dark:bg-white/5 relative overflow-hidden squircle"
    >
      <div className="w-10 h-10 md:w-16 md:h-16 squircle bg-black/5 dark:bg-white/5 text-[var(--color-primary-apple)] flex items-center justify-center flex-shrink-0 shadow-inner overflow-hidden">
        <Icon className="w-5 h-5 md:w-8 md:h-8" />
      </div>
      <div className="text-center md:text-left">
        <h3 className="text-[11px] md:text-lg font-black text-[var(--color-text-main)] tracking-tight md:tracking-tighter lowercase">{title}</h3>
        <p className="hidden md:block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">{description}</p>
      </div>
    </Link>
  );
}
