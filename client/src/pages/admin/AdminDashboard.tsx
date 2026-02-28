import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import type { Feedback, Teacher } from '../../types';
import { Users, BookOpen, Calendar, Building2, Upload, ArrowRight, TrendingUp, Activity, GraduationCap, Layers, Bell, MessageSquare, CheckCircle, Clock, Eye, Star } from 'lucide-react';

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
      <div className="flex justify-center py-16">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Админ-панель</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Управление платформой IMPERA</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl mb-6 max-w-md">
        {([
          { key: 'dashboard', label: 'Дашборд' },
          { key: 'analytics', label: 'Аналитика' },
          { key: 'feedback', label: 'Обратная связь' },
          { key: 'teachers', label: 'Преподаватели' },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t.label}
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
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            <b>{stats.feedbackNew}</b> новых обращений в разделе обратной связи
          </p>
        </div>
      )}

      {/* Quick Actions */}
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Быстрые действия</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <ActionCard
          to="/admin/import"
          icon={Upload}
          title="Загрузка расписания"
          description="Загрузить Excel/CSV файл с расписанием"
        />
        <ActionCard
          to="/admin/schedule"
          icon={Calendar}
          title="Управление расписанием"
          description="Просмотр и редактирование занятий"
        />
        <ActionCard
          to="/admin/users"
          icon={Users}
          title="Пользователи"
          description="Список и управление пользователями"
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
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Структура данных</h3>
        <div className="space-y-4">
          <DistributionBar label="Институты" value={stats.institutes} max={totalStructure} color="bg-purple-500" />
          <DistributionBar label="Направления" value={stats.directions} max={totalStructure} color="bg-blue-500" />
          <DistributionBar label="Программы" value={stats.programs} max={totalStructure} color="bg-orange-500" />
          <DistributionBar label="Группы" value={stats.groups} max={totalStructure} color="bg-green-500" />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Активность пользователей</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.dau}</p>
            <p className="text-xs text-gray-500 mt-1">Сегодня (DAU)</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.mau}</p>
            <p className="text-xs text-gray-500 mt-1">За 30 дней (MAU)</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {stats.users > 0 ? Math.round((stats.mau / stats.users) * 100) : 0}%
            </p>
            <p className="text-xs text-gray-500 mt-1">Retention</p>
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
  const typeColors: Record<string, string> = {
    suggestion: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
    complaint: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400',
    bug: 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400',
    other: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  };
  const statusLabels: Record<string, string> = { new: 'Новое', read: 'Прочитано', resolved: 'Решено' };
  const statusColors: Record<string, string> = {
    new: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
    read: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
    resolved: 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400',
  };

  return (
    <div>
      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { key: 'all', label: 'Все' },
          { key: 'new', label: 'Новые' },
          { key: 'read', label: 'Прочитано' },
          { key: 'resolved', label: 'Решено' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === f.key
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
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
        <div className="space-y-3">
          {feedbacks.map(fb => (
            <div key={fb.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeColors[fb.type] || typeColors.other}`}>
                    {typeLabels[fb.type] || fb.type}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[fb.status] || statusColors.new}`}>
                    {statusLabels[fb.status] || fb.status}
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 whitespace-nowrap">
                  {new Date(fb.createdAt).toLocaleDateString('ru-RU')}
                </span>
              </div>

              {/* User info */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-[9px] font-bold">
                  {fb.user?.firstName?.[0] || '?'}
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {fb.user?.firstName} {fb.user?.lastName || ''} {fb.user?.username ? `(@${fb.user.username})` : ''}
                </span>
                {fb.user?.group && (
                  <span className="text-[10px] text-gray-400">
                    {fb.user.group.course}к {fb.user.group.number}гр
                  </span>
                )}
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
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center">
        <GraduationCap className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
        <p className="text-gray-500">Преподаватели ещё не добавлены</p>
        <p className="text-xs text-gray-400 mt-1">Они появятся когда студенты оставят первый отзыв</p>
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
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{teachers.length}</p>
          <p className="text-xs text-gray-500">Преподавателей</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {teachers.reduce((s, t) => s + t.reviewCount, 0)}
          </p>
          <p className="text-xs text-gray-500">Отзывов всего</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">
            {teachers.length > 0
              ? (teachers.reduce((s, t) => s + t.avgRating, 0) / teachers.filter(t => t.avgRating > 0).length || 0).toFixed(1)
              : '—'}
          </p>
          <p className="text-xs text-gray-500">Средняя оценка</p>
        </div>
      </div>

      {/* Teachers list */}
      <div className="space-y-3">
        {teachers.sort((a, b) => b.reviewCount - a.reviewCount).map(teacher => (
          <div key={teacher.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === teacher.id ? null : teacher.id)}
              className="w-full p-4 flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {teacher.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{teacher.name}</p>
                {teacher.department && (
                  <p className="text-xs text-gray-400 truncate">{teacher.department}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {renderStars(teacher.avgRating)}
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{teacher.avgRating.toFixed(1)}</span>
                <span className="text-xs text-gray-400">({teacher.reviewCount})</span>
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
    blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
    green: 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400',
    orange: 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400',
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value.toLocaleString()}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function GradientStatCard({ icon: Icon, label, value, gradient }: { icon: any; label: string; value: number; gradient: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} text-white p-4`}>
      <div className="absolute top-2 right-2 opacity-10">
        <Icon className="w-16 h-16" />
      </div>
      <div className="relative">
        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3">
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-3xl font-bold">{value.toLocaleString()}</p>
        <p className="text-xs text-white/80 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function DistributionBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
        <span className="text-xs text-gray-500">{value}</span>
      </div>
      <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ActionCard({ to, icon: Icon, title, description }: { to: string; icon: any; title: string; description: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all group"
    >
      <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
    </Link>
  );
}
