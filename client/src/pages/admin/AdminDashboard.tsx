import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Users, BookOpen, Calendar, Building2, Upload, ArrowRight, TrendingUp, Activity, GraduationCap, Layers } from 'lucide-react';

interface Stats {
  users: number;
  groups: number;
  lessons: number;
  institutes: number;
  directions: number;
  programs: number;
  dau: number;
  mau: number;
}

type Tab = 'dashboard' | 'analytics' | 'feedback';

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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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
      </div>

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
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
        <BookOpen className="w-8 h-8 text-indigo-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Обратная связь</h3>
      <p className="text-sm text-gray-500 max-w-md mx-auto">
        Раздел обратной связи находится в разработке. Здесь будут отображаться отзывы и предложения пользователей.
      </p>
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
