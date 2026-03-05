import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../../api/client';
import type { Feedback, Teacher } from '../../types';
import { Users, BookOpen, Calendar, Building2, Upload, ArrowRight, TrendingUp, Activity, GraduationCap, Layers, Bell, MessageSquare, CheckCircle, Eye, Star } from 'lucide-react';
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

type Tab = 'dashboard' | 'analytics' | 'feedback' | 'teachers';

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
      <div className="mb-12">
        <h1 className="text-5xl font-black metallic-text tracking-[-0.06em] mb-3 lowercase">
          админ-панель.
        </h1>
        <p className="text-[var(--color-text-muted)] font-black uppercase tracking-widest text-[11px] opacity-70">
          Управление платформой IMPERA &bull; Core Control
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 apple-glass rounded-[24px] mb-12 border border-[var(--apple-border)] max-w-xl relative overflow-hidden backdrop-blur-3xl shadow-xl">
        {([
          { key: 'dashboard', label: 'Дашборд' },
          { key: 'analytics', label: 'Аналитика' },
          { key: 'feedback', label: 'Фидбек' },
          { key: 'teachers', label: 'Учителя' },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-4 px-6 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-700 relative z-10 ${tab === t.key
              ? 'text-[var(--color-text-main)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
              }`}
          >
            {t.label}
            {tab === t.key && (
              <motion.div
                layoutId="admin-tab-bg"
                className="absolute inset-0 iron-metal-bg rounded-[20px] -z-10 shadow-gold-glow"
                transition={{ type: "spring", bounce: 0.1, duration: 0.6 }}
              />
            )}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && stats && <DashboardTab stats={stats} />}
      {tab === 'analytics' && stats && <AnalyticsTab stats={stats} />}
      {tab === 'feedback' && <FeedbackTab />}
      {tab === 'teachers' && <TeachersTab />}
    </div>
  );
}

function DashboardTab({ stats }: { stats: Stats }) {
  return (
    <>
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={Calendar}
          label="Записей расписания"
          value={stats.lessons}
          color="blue"
        />
        <StatCard
          icon={Building2}
          label="Институтов"
          value={stats.institutes}
          color="purple"
        />
        <StatCard
          icon={Layers}
          label="Программ подготовки"
          value={stats.programs}
          color="orange"
        />
      </div>

      {/* Users & Activity */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Users}
          label="Всего пользователей"
          value={stats.users}
          color="green"
        />
        <GradientStatCard
          icon={Activity}
          label="DAU (Сегодня)"
          value={stats.dau}
          gradient="from-emerald-500 to-teal-600"
        />
        <GradientStatCard
          icon={TrendingUp}
          label="MAU (30 дней)"
          value={stats.mau}
          gradient="from-blue-500 to-indigo-600"
        />
        <StatCard
          icon={Bell}
          label="Оповещения вкл."
          value={stats.notifyEnabled}
          color="orange"
        />
      </div>

      {/* Feedback summary */}
      {stats.feedbackNew > 0 && (
        <div className="mb-10 p-6 apple-glass rounded-[28px] border border-amber-500/20 shadow-xl shadow-amber-500/5 flex items-center gap-5 animate-pulse">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-amber-500" />
          </div>
          <p className="text-base font-bold text-amber-600 dark:text-amber-400">
            {stats.feedbackNew} новых обращений ожидает вашего внимания
          </p>
        </div>
      )}

      {/* Quick Actions */}
      <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-text-muted)] mb-8 px-2 opacity-70 mt-12">Быстрые действия</h2>
      <div className="grid sm:grid-cols-3 gap-8 mb-16">
        <ActionCard
          to="/admin/import"
          icon={Upload}
          title="Import Center"
          description="Excel & Data Processing"
        />
        <ActionCard
          to="/admin/schedule"
          icon={Calendar}
          title="Schedule Lab"
          description="Manual Overrides & Control"
        />
        <ActionCard
          to="/admin/users"
          icon={Users}
          title="Identity Vault"
          description="User Accounts & Roles"
        />
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
      <div className="grid grid-cols-3 gap-6 mb-10">
        <div className="apple-card border border-[var(--apple-border)] p-6 text-center">
          <p className="text-4xl font-black text-[var(--color-text-main)] tracking-tighter">{teachers.length}</p>
          <p className="text-[10px] font-bold text-[var(--color-text-muted)] mt-2 uppercase tracking-widest">Активно</p>
        </div>
        <div className="apple-card border border-[var(--apple-border)] p-6 text-center">
          <p className="text-4xl font-black text-[var(--color-text-main)] tracking-tighter">
            {teachers.reduce((s, t) => s + t.reviewCount, 0)}
          </p>
          <p className="text-[10px] font-bold text-[var(--color-text-muted)] mt-2 uppercase tracking-widest">Отзывов</p>
        </div>
        <div className="apple-card border border-[var(--apple-border)] p-6 text-center">
          <p className="text-4xl font-black text-amber-500 tracking-tighter">
            {teachers.length > 0
              ? (teachers.reduce((s, t) => s + t.avgRating, 0) / teachers.filter(t => t.avgRating > 0).length || 0).toFixed(1)
              : '—'}
          </p>
          <p className="text-[10px] font-bold text-[var(--color-text-muted)] mt-2 uppercase tracking-widest">Рейтинг</p>
        </div>
      </div>

      {/* Teachers list */}
      <div className="grid gap-4">
        {teachers.sort((a, b) => b.reviewCount - a.reviewCount).map(teacher => (
          <div key={teacher.id} className="apple-card border border-[var(--apple-border)] overflow-hidden shadow-sm hover:shadow-xl smooth-transition">
            <button
              onClick={() => setExpanded(expanded === teacher.id ? null : teacher.id)}
              className="w-full p-5 flex items-center gap-4 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-500"
            >
              <div className="w-12 h-12 rounded-[18px] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-base font-black flex-shrink-0 shadow-lg shadow-blue-500/20">
                {teacher.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-[var(--color-text-main)] truncate tracking-tight">{teacher.name}</p>
                {teacher.department && (
                  <p className="text-[10px] font-bold text-[var(--color-text-muted)] truncate uppercase tracking-widest mt-0.5">{teacher.department}</p>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 bg-black/5 dark:bg-white/5 px-4 py-2 rounded-2xl">
                {renderStars(teacher.avgRating)}
                <span className="text-sm font-black text-[var(--color-text-main)]">{teacher.avgRating.toFixed(1)}</span>
                <span className="text-[10px] font-bold text-[var(--color-text-muted)]">({teacher.reviewCount})</span>
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

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-500',
    purple: 'bg-indigo-500/10 text-indigo-500',
    green: 'bg-emerald-500/10 text-emerald-500',
    orange: 'bg-amber-500/10 text-amber-500',
  };

  return (
    <div className="apple-card border border-[var(--apple-border)] p-8 shadow-xl hover:shadow-2xl smooth-transition group bg-white/10 dark:bg-white/5 squircle overflow-hidden">
      <div className={`w-16 h-16 squircle flex items-center justify-center mb-6 group-hover:iron-metal-bg group-hover:text-white group-hover:scale-110 smooth-transition shadow-lg overflow-hidden ${colors[color]}`}>
        <Icon className="w-8 h-8" />
      </div>
      <p className="text-5xl font-black metallic-text tracking-tighter mb-2">{value.toLocaleString()}</p>
      <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] opacity-60">{label}</p>
    </div>
  );
}

function GradientStatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number; gradient: string }) {
  return (
    <div className={`relative overflow-hidden rounded-[36px] iron-metal-bg text-white p-8 shadow-2xl transition-all duration-700 hover:scale-[1.02] active:scale-[0.98] group`}>
      <div className="absolute top-0 right-0 w-48 h-48 bg-white/20 blur-[80px] rounded-full group-hover:bg-white/30 transition-all duration-700" />
      <div className="relative z-10">
        <div className="w-16 h-16 squircle bg-white/20 backdrop-blur-xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform shadow-lg overflow-hidden">
          <Icon className="w-8 h-8" />
        </div>
        <p className="text-5xl font-black tracking-tighter mb-2">{value.toLocaleString()}</p>
        <p className="text-[9px] font-black text-white/70 uppercase tracking-[0.2em]">{label}</p>
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
      className="flex flex-col items-start gap-6 p-8 apple-card border border-[var(--apple-border)] shadow-xl hover:shadow-2xl hover:-translate-y-2 smooth-transition group bg-white/5 dark:bg-white/5 relative overflow-hidden squircle"
    >
      <div className="w-16 h-16 squircle bg-black/5 dark:bg-white/5 text-[var(--color-primary-apple)] flex items-center justify-center flex-shrink-0 group-hover:iron-metal-bg group-hover:text-white group-hover:scale-110 transition-all duration-700 shadow-inner overflow-hidden">
        <Icon className="w-8 h-8" />
      </div>
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h3 className="text-lg font-black text-[var(--color-text-main)] group-hover:text-[var(--color-primary-apple)] transition-colors tracking-tighter lowercase">{title}.</h3>
          <ArrowRight className="w-5 h-5 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-700 text-[var(--color-primary-apple)]" />
        </div>
        <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60 leading-relaxed">{description}</p>
      </div>
      <div className="absolute top-0 right-0 p-4 border-l border-b border-[var(--apple-border)] rounded-bl-2xl bg-black/5 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Activity className="w-4 h-4 text-[var(--color-primary-apple)]" />
      </div>
    </Link>
  );
}
