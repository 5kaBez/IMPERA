import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../../api/client';
import type { Feedback, Teacher } from '../../types';
import { Users, BookOpen, Calendar, Building2, Upload, TrendingUp, Activity, GraduationCap, Layers, Bell, MessageSquare, CheckCircle, Eye, Star, Download, RefreshCw, Clock, AlertCircle, Trash2, BarChart3, FileText, Paperclip, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import EmojiLoader from '../../components/EmojiLoader';
import AdminBackup from '../../components/AdminBackup';
import MetricsTab from './MetricsTab';

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

type Tab = 'dashboard' | 'metrics' | 'analytics' | 'feedback' | 'teachers' | 'notes' | 'autoimport' | 'backup';

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
            { key: 'metrics', label: 'Метрики' },
            { key: 'analytics', label: 'Аналитика' },
            { key: 'feedback', label: 'Фидбек' },
            { key: 'teachers', label: 'Учителя' },
            { key: 'notes', label: 'Заметки' },
            { key: 'autoimport', label: 'Авто-импорт' },
            { key: 'backup', label: 'Бекап' },
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
      {tab === 'metrics' && <MetricsTab />}
      {tab === 'analytics' && stats && <AnalyticsTab stats={stats} />}
      {tab === 'feedback' && <FeedbackTab />}
      {tab === 'teachers' && <TeachersTab />}
      {tab === 'notes' && <NotesTab />}
      {tab === 'autoimport' && <AutoImportTab />}
      {tab === 'backup' && <AdminBackup />}
    </div>
  );
}

function DashboardTab({ stats }: { stats: Stats }) {
  const [maintenance, setMaintenance] = useState<{ enabled: boolean; message: string } | null>(null);
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);

  useEffect(() => {
    api.get<{ enabled: boolean; message: string }>('/admin/settings/maintenance')
      .then(setMaintenance)
      .catch((err) => {
        console.error('Failed to load maintenance settings:', err);
        setMaintenance({ enabled: false, message: 'ИДЯТ ТЕХНИЧЕСКИЕ РАБОТЫ' });
      });
  }, []);

  const toggleMaintenance = async () => {
    if (!maintenance || maintenanceSaving) return;
    const nextEnabled = !maintenance.enabled;

    setMaintenanceSaving(true);
    try {
      const updated = await api.post<{ enabled: boolean; message: string }>('/admin/settings/maintenance', { enabled: nextEnabled });
      setMaintenance(updated);
    } catch (err) {
      console.error('Failed to toggle maintenance:', err);
      alert('Ошибка при переключении техработ. Проверьте консоль.');
    } finally {
      setMaintenanceSaving(false);
    }
  };

  return (
    <>
      <div className="mb-3 md:mb-8 p-3 md:p-6 apple-glass rounded-2xl md:rounded-[28px] border border-[var(--apple-border)] shadow-lg flex items-center justify-between gap-3 md:gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`inline-flex w-2 h-2 rounded-full ${maintenance?.enabled ? 'bg-amber-400' : 'bg-zinc-400'}`} />
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
              Техработы
            </p>
          </div>
          <p className="text-[10px] md:text-sm font-black text-[var(--color-text-main)] truncate">
            {maintenance?.enabled ? 'Включено: сообщение видят все пользователи' : 'Выключено'}
          </p>
          <p className="text-[9px] md:text-[10px] font-bold text-[var(--color-text-muted)] mt-1 truncate">
            {maintenance?.message || 'ИДУТ ТЕХНИЧЕСКИЕ РАБОТЫ'}
          </p>
        </div>

        <button
          onClick={toggleMaintenance}
          disabled={!maintenance || maintenanceSaving}
          className={`px-3 md:px-5 py-2 md:py-3 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 whitespace-nowrap ${maintenance?.enabled
            ? 'bg-amber-500/15 text-amber-600 hover:bg-amber-500/25'
            : 'bg-black/5 dark:bg-white/5 text-[var(--color-text-main)] hover:bg-black/10 dark:hover:bg-white/10'
            } ${maintenanceSaving ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {maintenanceSaving ? '...' : maintenance?.enabled ? 'Выключить' : 'Включить'}
        </button>
      </div>

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
  const [deletingId, setDeletingId] = useState<number | null>(null);

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

  const handleDelete = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот отзыв?')) return;
    
    setDeletingId(id);
    try {
      await api.delete(`/admin/feedback/${id}`);
      setFeedbacks(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      alert('Ошибка при удалении отзыва');
      console.error(err);
    } finally {
      setDeletingId(null);
    }
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
              <div className="flex gap-2 flex-wrap">
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
                <button
                  onClick={() => handleDelete(fb.id)}
                  disabled={deletingId === fb.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingId === fb.id ? (
                    <>
                      <div className="w-3 h-3 border-2 border-red-600 dark:border-red-400 border-t-transparent rounded-full animate-spin" />
                      Удаление...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3 h-3" /> Удалить
                    </>
                  )}
                </button>
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
  const [deletingReviewId, setDeletingReviewId] = useState<number | null>(null);

  useEffect(() => {
    api.get<(Teacher & { avgRating: number; reviewCount: number })[]>('/admin/teachers')
      .then(data => {
        console.log('Teachers data:', data);
        setTeachers(data);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDeleteReview = async (reviewId: number, teacherId: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот отзыв?')) return;
    
    setDeletingReviewId(reviewId);
    try {
      await api.delete(`/admin/reviews/${reviewId}`);
      // Обновляем список учителей
      setTeachers(prev =>
        prev.map(t => {
          if (t.id === teacherId) {
            const updatedReviews = t.reviews.filter(r => r.id !== reviewId);
            return {
              ...t,
              reviews: updatedReviews,
              reviewCount: updatedReviews.length,
              avgRating: updatedReviews.length > 0
                ? updatedReviews.reduce((s, r) => s + r.rating, 0) / updatedReviews.length
                : 0,
            };
          }
          return t;
        })
      );
    } catch (err) {
      alert('Ошибка при удалении отзыва');
      console.error(err);
    } finally {
      setDeletingReviewId(null);
    }
  };

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
              onClick={() => {
                console.log(`Expanding teacher ${teacher.id}, reviews:`, teacher.reviews);
                setExpanded(expanded === teacher.id ? null : teacher.id);
              }}
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
            {expanded === teacher.id && (
              <div className="border-t border-gray-100 dark:border-gray-800 px-4 pb-4">
                <p className="text-xs font-semibold text-gray-500 mt-3 mb-2">Отзывы: ({teacher.reviews?.length || 0})</p>
                {teacher.reviews && teacher.reviews.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {teacher.reviews.map(review => (
                      <div key={review.id} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                        {/* Delete button at top */}
                        <div className="flex justify-end mb-2">
                          <button
                            onClick={() => handleDeleteReview(review.id, teacher.id)}
                            disabled={deletingReviewId === review.id}
                            className="flex items-center gap-1 px-2 py-1 text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/20 hover:bg-red-200 dark:hover:bg-red-500/30 rounded border border-red-300 dark:border-red-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Удалить этот отзыв"
                          >
                            {deletingReviewId === review.id ? (
                              <>
                                <div className="w-3 h-3 border-2 border-red-600 dark:border-red-400 border-t-transparent rounded-full animate-spin" />
                                <span className="text-[10px] font-bold">Удаляю...</span>
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase">УДАЛИТЬ</span>
                              </>
                            )}
                          </button>
                        </div>
                        {/* Review content */}
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
                ) : (
                  <div className="text-xs text-gray-400 py-4 text-center">Нет отзывов</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* Invite code system removed (open access)
interface InviteCode {
  id: number;
  code: string;
  usedAt: string | null;
  createdAt: string;
  creator?: {
    id: number;
    firstName?: string;
    lastName?: string;
  } | null;
  usedBy?: {
    id: number;
    firstName?: string;
    lastName?: string;
  } | null;
}

interface CodeStats {
  total: number;
  active: number;
  used: number;
  average_lifetime_hours: number;
}

function CodesTab() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [codeStats, setCodeStats] = useState<CodeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createCount, setCreateCount] = useState(1);
  const [copied, setCopied] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearStatus, setClearStatus] = useState('');
  const [cooldown, setCooldown] = useState(24);
  const [maxActive, setMaxActive] = useState(5);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');

  const fetchCodes = () => {
    setLoading(true);
    api
      .get<{ codes: InviteCode[]; stats: CodeStats }>('/admin/invite-codes')
      .then(data => {
        setCodes(data.codes);
        setCodeStats(data.stats);
      })
      .finally(() => setLoading(false));
  };

  const loadSettings = () => {
    setSettingsLoading(true);
    api
      .get<{ inviteCooldownHours: number; maxActiveCodesPerUser: number }>('/admin/settings/invites')
      .then(settings => {
        setCooldown(settings.inviteCooldownHours);
        setMaxActive(settings.maxActiveCodesPerUser);
      })
      .finally(() => setSettingsLoading(false));
  };

  useEffect(() => {
    fetchCodes();
    loadSettings();
  }, []);

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
    if (!confirm('Reset activated flag for all non-admins?')) return;
    setResetting(true);
    try {
      const res = await api.post<{ updated: number }>('/admin/invite-codes/reset-users', {});
      alert(`Reset ${res.updated} users`);
      fetchCodes();
    } finally {
      setResetting(false);
    }
  };

  const handleClearCodes = async () => {
    if (!confirm('Delete all invite codes and reset generation timers?')) return;
    setClearing(true);
    try {
      const res = await api.post<{ cleared: number; usersReset: number }>('/admin/invite-codes/clear');
      setClearStatus(`Deleted ${res.cleared} codes, reset ${res.usersReset} users`);
      fetchCodes();
    } catch (err: any) {
      setClearStatus(err?.message || 'Failed to clear codes');
    } finally {
      setClearing(false);
      setTimeout(() => setClearStatus(''), 5000);
    }
  };

  const handleSaveSettings = async () => {
    if (savingSettings) return;
    setSavingSettings(true);
    try {
      const payload = {
        inviteCooldownHours: Math.max(1, Math.round(cooldown)),
        maxActiveCodesPerUser: Math.max(1, Math.round(maxActive)),
      };
      await api.post('/admin/settings/invites', payload);
      setSettingsMessage('Saved');
      loadSettings();
    } catch (err: any) {
      setSettingsMessage(err?.message || 'Save failed');
    } finally {
      setSavingSettings(false);
      setTimeout(() => setSettingsMessage(''), 4000);
    }
  };

  const formatName = (user?: { firstName?: string; lastName?: string }) => {
    if (!user) return 'User';
    return `${user.firstName || 'User'}${user.lastName ? ` ${user.lastName}` : ''}`;
  };

  const formatDateTime = (value?: string) => {
    if (!value) return '-';
    return new Date(value).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getStatus = (code: InviteCode) => (code.usedAt ? 'Used' : 'Active');

  const totalCount = codeStats?.total ?? codes.length;
  const activeCount = codeStats?.active ?? codes.filter(c => !c.usedAt).length;
  const usedCount = codeStats?.used ?? codes.filter(c => !!c.usedAt).length;
  const averageLifetime = codeStats?.average_lifetime_hours ?? 0;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-8">
        <SummaryCard label="Total" value={totalCount} />
        <SummaryCard label="Active" value={activeCount} tone="emerald" />
        <SummaryCard label="Used" value={usedCount} tone="rose" />
        <SummaryCard label="Avg lifetime (h)" value={averageLifetime.toFixed(1)} tone="amber" />
      </div>

      <div className="grid gap-3 md:grid-cols-2 mb-6">
        <div className="apple-card border border-[var(--apple-border)] p-4 md:p-6 shadow-lg">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <select
              value={createCount}
              onChange={e => setCreateCount(Number(e.target.value))}
              className="bg-transparent text-xs md:text-sm font-bold text-[var(--color-text-main)] px-2 py-1 rounded-xl outline-none border border-white/10"
            >
              {[1, 3, 5, 10, 15, 20].map(n => (
                <option key={n} value={n}>{n} pcs</option>
              ))}
            </select>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl iron-metal-bg text-white text-xs font-black uppercase tracking-[0.2em] shadow-lg disabled:opacity-60 transition-all"
            >
              <Plus className="w-4 h-4" />
              {creating ? 'Creating...' : 'Create codes'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleResetUsers}
              disabled={resetting}
              className="flex-1 min-w-[180px] flex items-center gap-2 px-4 py-2 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] font-black uppercase tracking-[0.2em] disabled:opacity-50 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              {resetting ? 'Resetting...' : 'Reset activated'}
            </button>
            <button
              onClick={handleClearCodes}
              disabled={clearing}
              className="flex-1 min-w-[180px] flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/5 border border-[var(--apple-border)] text-[var(--color-text-main)] text-[9px] font-black uppercase tracking-[0.2em] disabled:opacity-50 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              {clearing ? 'Clearing...' : 'Clear all codes'}
            </button>
          </div>
          {clearStatus && (
            <p className="mt-3 text-xs font-semibold text-[var(--color-text-muted)]">{clearStatus}</p>
          )}
        </div>

        <div className="apple-card border border-[var(--apple-border)] p-4 md:p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[var(--color-text-muted)]">Generation settings</p>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-1">Cooldown & max active codes</p>
            </div>
            {settingsLoading && (
              <span className="text-[10px] font-bold text-[var(--color-text-muted)]">Loading...</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 text-[10px]">
            <label className="flex flex-col gap-1 text-[var(--color-text-muted)]">
              Cooldown (hrs)
              <input
                type="number"
                min={1}
                value={cooldown}
                onChange={e => setCooldown(Number(e.target.value) || 0)}
                className="bg-black/5 dark:bg-white/5 border border-[var(--apple-border)] p-2 rounded-xl text-sm font-bold text-[var(--color-text-main)] outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-[var(--color-text-muted)]">
              Max active
              <input
                type="number"
                min={1}
                value={maxActive}
                onChange={e => setMaxActive(Number(e.target.value) || 0)}
                className="bg-black/5 dark:bg-white/5 border border-[var(--apple-border)] p-2 rounded-xl text-sm font-bold text-[var(--color-text-main)] outline-none"
              />
            </label>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleSaveSettings}
              disabled={savingSettings || settingsLoading}
              className="px-4 py-2 rounded-2xl iron-metal-bg text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg transition-all disabled:opacity-50"
            >
              {savingSettings ? 'Saving...' : 'Save'}
            </button>
            {settingsMessage && (
              <span className="text-[10px] font-bold text-emerald-500">{settingsMessage}</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-2 md:gap-3">
        {codes.map(code => {
          const isUsed = Boolean(code.usedAt);
          return (
            <div
              key={code.id}
              className={`apple-card border p-3 md:p-4 flex flex-col gap-3 ${
                isUsed ? 'border-red-500/20 opacity-80' : 'border-emerald-500/20'
              }`}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => handleCopy(code.code)}
                  className="flex items-center gap-2 min-w-[220px]"
                  title="Copy"
                >
                  <span className="text-xl md:text-2xl font-black tracking-[0.15em] text-[var(--color-text-main)] font-mono">
                    {code.code}
                  </span>
                  <Copy className={`w-4 h-4 transition-colors ${copied === code.code ? 'text-emerald-500' : 'text-[var(--color-text-muted)]'}`} />
                </button>
                <div className="ml-auto flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em]">
                  <span className={`px-3 py-1 rounded-xl ${isUsed ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    {getStatus(code)}
                  </span>
                  {!isUsed && (
                    <button
                      onClick={() => handleDelete(code.id)}
                      className="p-1 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1 text-[11px] text-[var(--color-text-muted)]">
                <p>Creator: {formatName(code.creator)} · {formatDateTime(code.createdAt)}</p>
                {isUsed && (
                  <p>Used by: {formatName(code.usedBy)} · {formatDateTime(code.usedAt || undefined)}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone = 'blue' }: { label: string; value: number | string; tone?: 'blue' | 'emerald' | 'rose' | 'amber' }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-500',
    emerald: 'bg-emerald-500/10 text-emerald-500',
    rose: 'bg-rose-500/10 text-rose-500',
    amber: 'bg-amber-500/10 text-amber-500',
  };

  return (
    <div className="apple-card border border-[var(--apple-border)] p-3 md:p-6 text-center">
      <div className={`w-12 h-12 md:w-14 md:h-14 squircle flex items-center justify-center mx-auto mb-2 ${colorClasses[tone]}`}>
        <span className="text-lg font-black">{value}</span>
      </div>
      <p className="text-[8px] md:text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-[0.2em]">{label}</p>
    </div>
  );
}
*/
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

// ────────────────── Notes Tab ──────────────────
interface AdminNote {
  id: number;
  title: string;
  text: string | null;
  date: string;
  isPublic: boolean;
  authorRole: string;
  createdAt: string;
  user: { id: number; firstName: string; lastName: string | null; username: string | null; avatarId: number | null; telegramId: string };
  lesson: { id: number; subject: string; timeStart: string; pairNumber: number } | null;
  group: { id: number; name: string; course: number; number: string } | null;
  attachments: { id: number; fileName: string; fileSize: number; mimeType: string }[];
}

interface AdminGroup {
  id: number;
  name: string;
  course: number;
  number: string;
  _count: { notes: number };
}

function NotesTab() {
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const LIMIT = 30;

  const fetchNotes = async (groupId: number | null, pg: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pg), limit: String(LIMIT) });
      if (groupId) params.set('groupId', String(groupId));
      const data = await api.get<{ notes: AdminNote[]; total: number; groups: AdminGroup[]; page: number }>(`/admin/notes?${params}`);
      setNotes(data.notes);
      setTotal(data.total);
      setGroups(data.groups);
    } catch (err) {
      console.error('Failed to fetch admin notes:', err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchNotes(selectedGroupId, page); }, [selectedGroupId, page]);

  const handleDelete = async (noteId: number) => {
    if (!confirm('Удалить эту заметку?')) return;
    try {
      await api.delete(`/admin/notes/${noteId}`);
      setNotes(prev => prev.filter(n => n.id !== noteId));
      setTotal(prev => prev - 1);
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const filteredNotes = search.trim()
    ? notes.filter(n =>
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.text?.toLowerCase().includes(search.toLowerCase()) ||
        n.user.firstName.toLowerCase().includes(search.toLowerCase()) ||
        n.user.lastName?.toLowerCase().includes(search.toLowerCase())
      )
    : notes;

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}.${dt.getFullYear()}`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-[var(--color-primary-apple)]" />
          <h2 className="text-lg font-black text-[var(--color-text-main)] tracking-tight lowercase">заметки</h2>
          <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] bg-black/5 dark:bg-white/5 px-2 py-1 rounded-lg">
            {total}
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)] opacity-40" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск..."
            className="pl-9 pr-4 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--apple-border)] text-xs font-medium text-[var(--color-text-main)] outline-none focus:ring-2 focus:ring-[var(--color-primary-apple)]/20 w-48"
          />
        </div>
      </div>

      {/* Group filter chips */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => { setSelectedGroupId(null); setPage(1); }}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
            selectedGroupId === null
              ? 'iron-metal-bg text-white shadow-md'
              : 'bg-black/[0.04] dark:bg-white/[0.06] text-[var(--color-text-muted)] border border-[var(--apple-border)]'
          }`}
        >
          Все группы
        </button>
        {groups.map(g => (
          <button
            key={g.id}
            onClick={() => { setSelectedGroupId(g.id); setPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
              selectedGroupId === g.id
                ? 'iron-metal-bg text-white shadow-md'
                : 'bg-black/[0.04] dark:bg-white/[0.06] text-[var(--color-text-muted)] border border-[var(--apple-border)]'
            }`}
          >
            {g.name} ({g._count.notes})
          </button>
        ))}
      </div>

      {/* Notes list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="apple-card border border-[var(--apple-border)] p-8 text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 text-zinc-300 dark:text-zinc-700" />
          <p className="text-sm font-bold text-[var(--color-text-muted)]">Заметок нет</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNotes.map(note => (
            <div key={note.id} className="apple-card border border-[var(--apple-border)] p-4 relative group">
              <div className="flex items-start gap-3">
                {/* User info */}
                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-[var(--color-primary-apple)]/10 flex items-center justify-center text-[10px] font-black text-[var(--color-primary-apple)]">
                  {note.user.firstName.charAt(0)}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Title + badges row */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[12px] font-bold text-[var(--color-text-main)] truncate">
                      {note.title}
                    </span>
                    {note.isPublic && (
                      <span className="text-[7px] font-black uppercase tracking-wider text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded-md">
                        Public
                      </span>
                    )}
                    {note.authorRole === 'teacher' && (
                      <span className="text-[7px] font-black uppercase tracking-wider text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                        ДЗ
                      </span>
                    )}
                    {note.attachments.length > 0 && (
                      <span className="flex items-center gap-0.5 text-[8px] font-bold text-[var(--color-text-muted)]">
                        <Paperclip className="w-2.5 h-2.5" /> {note.attachments.length}
                      </span>
                    )}
                  </div>

                  {/* Text preview */}
                  {note.text && (
                    <p className="text-[10px] text-[var(--color-text-muted)] opacity-60 truncate mb-1.5">
                      {note.text}
                    </p>
                  )}

                  {/* Meta row */}
                  <div className="flex items-center gap-2 flex-wrap text-[9px] text-[var(--color-text-muted)] opacity-50">
                    <span className="font-bold">
                      {note.user.firstName}{note.user.lastName ? ` ${note.user.lastName}` : ''}
                      {note.user.username ? ` @${note.user.username}` : ''}
                    </span>
                    <span>·</span>
                    <span>{formatDate(note.date)}</span>
                    {note.lesson && (
                      <>
                        <span>·</span>
                        <span>{note.lesson.pairNumber}п {note.lesson.subject}</span>
                      </>
                    )}
                    {note.group && (
                      <>
                        <span>·</span>
                        <span className="font-bold text-[var(--color-primary-apple)]">{note.group.name}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Delete button */}
                <button
                  onClick={() => handleDelete(note.id)}
                  className="flex-shrink-0 p-2 rounded-xl bg-red-500/5 hover:bg-red-500/15 text-red-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                  title="Удалить заметку"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-xl bg-black/5 dark:bg-white/5 disabled:opacity-30 active:scale-90 transition-all"
          >
            <ChevronLeft className="w-4 h-4 text-[var(--color-text-muted)]" />
          </button>
          <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-wider">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-xl bg-black/5 dark:bg-white/5 disabled:opacity-30 active:scale-90 transition-all"
          >
            <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
          </button>
        </div>
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
