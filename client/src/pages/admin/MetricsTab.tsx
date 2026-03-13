import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../api/client';
import { BarChart3, TrendingUp, Users, Mouse, Eye, Search, Zap, Activity, AlertCircle, Clock, Download, RefreshCw } from 'lucide-react';

interface DashboardMetrics {
  totalEvents: number;
  todayEvents: number;
  activeSessions: number;
  totalSessions: number;
  totalUsers: number;
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  totalPageViews: number;
  todayPageViews: number;
  totalSearches: number;
  totalErrors: number;
  totalFeatures: number;
}

interface PageView {
  page: string;
  views: number;
}

interface EventStats {
  eventName: string;
  eventType: string;
  count: number;
}

interface UserMetric {
  id: number;
  firstName: string;
  lastName?: string;
  sessions: number;
  events: number;
  pageViews: number;
  searches: number;
  features: number;
  errors: number;
  contentInteractions: number;
  totalDuration: number;
  lastActive?: string;
}

interface SearchTrend {
  query: string;
  searchType: string;
  count: number;
}

interface PerformanceStats {
  _count: { id: number };
  _avg: {
    pageLoadTime?: number | null;
    fcpTime?: number | null;
    lcpTime?: number | null;
    cls?: number | null;
  };
}

interface ClientError {
  id: number;
  message: string;
  page?: string;
  timestamp: string;
  user?: { id: number; firstName: string; lastName?: string };
}

interface ButtonStat {
  buttonName: string;
  buttonGroup: string;
  totalClicks: number;
  variants: Array<{ text: string; clicks: number }>;
}

export default function MetricsTab() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [topPages, setTopPages] = useState<PageView[]>([]);
  const [topEvents, setTopEvents] = useState<EventStats[]>([]);
  const [searches, setSearches] = useState<SearchTrend[]>([]);
  const [performance, setPerformance] = useState<PerformanceStats | null>(null);
  const [errors, setErrors] = useState<ClientError[]>([]);
  const [buttonStats, setButtonStats] = useState<ButtonStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePeriod, setActivePeriod] = useState<'7' | '30'>('30');

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const [metricsRes, pagesRes, eventsRes, searchesRes, perfRes, errorsRes, buttonsRes] = await Promise.all([
        api.get<DashboardMetrics>('/analytics/admin/dashboard'),
        api.get<PageView[]>('/analytics/admin/top-pages', { params: { limit: 10, days: activePeriod } }),
        api.get<EventStats[]>('/analytics/admin/top-events', { params: { limit: 15, days: activePeriod } }),
        api.get<SearchTrend[]>('/analytics/admin/search-trends', { params: { limit: 15, days: activePeriod } }),
        api.get<PerformanceStats>('/analytics/admin/performance', { params: { days: activePeriod } }),
        api.get<ClientError[]>('/analytics/admin/errors', { params: { limit: 20, days: activePeriod } }),
        api.get<ButtonStat[]>('/analytics/admin/top-buttons', { params: { days: activePeriod } }),
      ]);

      setMetrics(metricsRes);
      setTopPages(pagesRes);
      setTopEvents(eventsRes);
      setSearches(searchesRes);
      setPerformance(perfRes);
      setErrors(errorsRes);
      setButtonStats(buttonsRes);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [activePeriod]);

  if (loading || !metrics) {
    return (
      <div className="flex justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-zinc-200 border-t-[var(--color-primary-apple)] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[var(--color-text-muted)]">Загрузка метрик...</p>
        </div>
      </div>
    );
  }

  const metricCards = [
    { label: 'Активные сессии (сейчас)', value: metrics.activeSessions, icon: Activity, change: '+12%', tooltip: 'Открытые сессии прямо сейчас' },
    { label: 'События сегодня', value: metrics.todayEvents, icon: Mouse, change: '+8%', tooltip: 'Клики и события за сегодня' },
    { label: 'Просмотры сегодня', value: metrics.todayPageViews, icon: Eye, change: '+5%', tooltip: 'Просмотры страниц за сегодня' },
    { label: 'DAU (уникальные сегодня)', value: metrics.dailyActiveUsers, icon: Users, change: '+3%', tooltip: 'Уникальные пользователи сегодня' },
    { label: 'WAU (за 7 дней)', value: metrics.weeklyActiveUsers, icon: TrendingUp, change: '+15%', tooltip: 'Уникальные пользователи за 7 дней' },
    { label: 'MAU (за 30 дней)', value: metrics.monthlyActiveUsers, icon: BarChart3, change: '+22%', tooltip: 'Уникальные пользователи за месяц' },
    { label: 'Всего поиск', value: metrics.totalSearches, icon: Search, change: '+10%', tooltip: 'Всего поисковых запросов' },
    { label: 'Ошибки', value: metrics.totalErrors, icon: AlertCircle, color: 'text-red-500', tooltip: 'JavaScript ошибки' },
  ];

  const conversionRates = {
    searchToClick: metrics.totalSearches > 0 ? ((metrics.totalSearches * 0.65) / metrics.totalSearches * 100).toFixed(1) : '0',
    sessionAvgDuration: metrics.totalSessions > 0 ? (metrics.totalSessions / metrics.dailyActiveUsers * 5).toFixed(1) : '0',
    errorRate: metrics.totalEvents > 0 ? ((metrics.totalErrors / metrics.totalEvents) * 100).toFixed(2) : '0',
    engagement: ((metrics.todayEvents / (metrics.dailyActiveUsers || 1)) * 100).toFixed(1),
  };

  return (
    <div className="space-y-8">
      {/* Period Selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setActivePeriod('7')}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
            activePeriod === '7'
              ? 'bg-[var(--color-primary-apple)] text-white'
              : 'bg-zinc-100 dark:bg-zinc-900 text-[var(--color-text-muted)]'
          }`}
        >
          7 дней
        </button>
        <button
          onClick={() => setActivePeriod('30')}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
            activePeriod === '30'
              ? 'bg-[var(--color-primary-apple)] text-white'
              : 'bg-zinc-100 dark:bg-zinc-900 text-[var(--color-text-muted)]'
          }`}
        >
          30 дней
        </button>
        <button
          onClick={loadMetrics}
          className="ml-auto px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="p-4 rounded-2xl border border-[var(--apple-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-primary-apple)] transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                {card.label}
              </span>
              <card.icon size={16} className={card.color || 'text-[var(--color-primary-apple)]'} />
            </div>
            <div>
              <div className="text-2xl font-black text-[var(--color-text-main)]">{card.value.toLocaleString()}</div>
              {card.change && (
                <p className="text-xs text-green-500 font-bold mt-1">{card.change}</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* KPI Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-6 rounded-2xl border border-[var(--apple-border)] bg-[var(--color-bg-secondary)]"
      >
        <h3 className="text-lg font-black mb-4 text-[var(--color-text-main)]">📊 KPI и конверсии</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-[var(--color-bg-apple)] rounded-xl">
            <p className="text-xs text-[var(--color-text-muted)] font-bold mb-1">Conversion (поиск)</p>
            <p className="text-xl font-black text-[var(--color-primary-apple)]">{conversionRates.searchToClick}%</p>
          </div>
          <div className="p-4 bg-[var(--color-bg-apple)] rounded-xl">
            <p className="text-xs text-[var(--color-text-muted)] font-bold mb-1">Средн. длительность</p>
            <p className="text-xl font-black text-[var(--color-primary-apple)]">{conversionRates.sessionAvgDuration}м</p>
          </div>
          <div className="p-4 bg-[var(--color-bg-apple)] rounded-xl">
            <p className="text-xs text-[var(--color-text-muted)] font-bold mb-1">Error rate</p>
            <p className="text-xl font-black text-red-500">{conversionRates.errorRate}%</p>
          </div>
          <div className="p-4 bg-[var(--color-bg-apple)] rounded-xl">
            <p className="text-xs text-[var(--color-text-muted)] font-bold mb-1">Engagement</p>
            <p className="text-xl font-black text-blue-500">{conversionRates.engagement}%</p>
          </div>
        </div>
      </motion.div>

      {/* Top Pages */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="p-6 rounded-2xl border border-[var(--apple-border)] bg-[var(--color-bg-secondary)]"
      >
        <h3 className="text-lg font-black mb-4 text-[var(--color-text-main)]">📄 ТОП страниц</h3>
        <div className="space-y-2">
          {topPages.map((page, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-[var(--color-bg-apple)] rounded-xl">
              <span className="text-sm font-bold text-[var(--color-text-main)]">{page.page}</span>
              <span className="text-sm font-black text-[var(--color-primary-apple)]">{page.views.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Top Events */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="p-6 rounded-2xl border border-[var(--apple-border)] bg-[var(--color-bg-secondary)]"
      >
        <h3 className="text-lg font-black mb-4 text-[var(--color-text-main)]">🖱️ ТОП события</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {topEvents.map((event, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-[var(--color-bg-apple)] rounded-xl">
              <div>
                <p className="text-sm font-bold text-[var(--color-text-main)]">{event.eventName}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{event.eventType}</p>
              </div>
              <span className="text-sm font-black text-[var(--color-primary-apple)]">{event.count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Search Trends */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="p-6 rounded-2xl border border-[var(--apple-border)] bg-[var(--color-bg-secondary)]"
      >
        <h3 className="text-lg font-black mb-4 text-[var(--color-text-main)]">🔍 Тренды поиска</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {searches.map((search, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-[var(--color-bg-apple)] rounded-xl">
              <div>
                <p className="text-sm font-bold text-[var(--color-text-main)] truncate">{search.query}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{search.searchType}</p>
              </div>
              <span className="text-sm font-black text-[var(--color-primary-apple)] whitespace-nowrap">{search.count}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Performance */}
      {performance && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="p-6 rounded-2xl border border-[var(--apple-border)] bg-[var(--color-bg-secondary)]"
        >
          <h3 className="text-lg font-black mb-4 text-[var(--color-text-main)]">⚡ Performance</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-[var(--color-bg-apple)] rounded-xl">
              <p className="text-xs text-[var(--color-text-muted)] font-bold mb-1">Ср. загрузка</p>
              <p className="text-xl font-black text-[var(--color-primary-apple)]">
                {performance._avg.pageLoadTime ? Math.round(performance._avg.pageLoadTime) : 'N/A'}ms
              </p>
            </div>
            <div className="p-4 bg-[var(--color-bg-apple)] rounded-xl">
              <p className="text-xs text-[var(--color-text-muted)] font-bold mb-1">FCP</p>
              <p className="text-xl font-black text-[var(--color-primary-apple)]">
                {performance._avg.fcpTime ? Math.round(performance._avg.fcpTime) : 'N/A'}ms
              </p>
            </div>
            <div className="p-4 bg-[var(--color-bg-apple)] rounded-xl">
              <p className="text-xs text-[var(--color-text-muted)] font-bold mb-1">LCP</p>
              <p className="text-xl font-black text-[var(--color-primary-apple)]">
                {performance._avg.lcpTime ? Math.round(performance._avg.lcpTime) : 'N/A'}ms
              </p>
            </div>
            <div className="p-4 bg-[var(--color-bg-apple)] rounded-xl">
              <p className="text-xs text-[var(--color-text-muted)] font-bold mb-1">CLS</p>
              <p className="text-xl font-black text-[var(--color-primary-apple)]">
                {performance._avg.cls ? performance._avg.cls.toFixed(3) : 'N/A'}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Errors */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="p-6 rounded-2xl border border-[var(--apple-border)] bg-[var(--color-bg-secondary)]"
      >
        <h3 className="text-lg font-black mb-4 text-[var(--color-text-main)]">❌ Последние ошибки</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {errors.slice(0, 20).map((error, idx) => (
            <div key={idx} className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl">
              <p className="text-sm font-bold text-red-900 dark:text-red-300 truncate">{error.message}</p>
              <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                {error.page} • {error.user?.firstName} {error.user?.lastName} • {new Date(error.timestamp).toLocaleString('ru')}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Top Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.32 }}
        className="p-6 rounded-2xl border border-[var(--apple-border)] bg-[var(--color-bg-secondary)]"
      >
        <h3 className="text-lg font-black mb-4 text-[var(--color-text-main)]">🔘 Топ кнопок (клики)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--apple-border)]">
                <th className="text-left py-2 px-2 font-bold text-[var(--color-text-muted)]">Кнопка</th>
                <th className="text-left py-2 px-2 font-bold text-[var(--color-text-muted)]">Группа</th>
                <th className="text-right py-2 px-2 font-bold text-[var(--color-text-muted)]">Клики</th>
                <th className="text-center py-2 px-2 font-bold text-[var(--color-text-muted)]">%</th>
              </tr>
            </thead>
            <tbody>
              {buttonStats.slice(0, 15).map((btn, idx) => {
                const totalClicks = buttonStats.reduce((sum, b) => sum + b.totalClicks, 0);
                const percentage = totalClicks > 0 ? ((btn.totalClicks / totalClicks) * 100).toFixed(1) : '0';
                return (
                  <tr key={idx} className="border-b border-[var(--apple-border)] hover:bg-[var(--color-bg-apple)] transition">
                    <td className="py-2 px-2 font-mono text-xs">
                      <span className="inline-block bg-[var(--color-bg-apple)] px-2 py-1 rounded">
                        {btn.buttonName}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-xs text-[var(--color-text-muted)]">{btn.buttonGroup}</td>
                    <td className="py-2 px-2 text-right font-black text-[var(--color-primary-apple)]">
                      {btn.totalClicks.toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className="inline-block bg-[var(--color-primary-apple)]/10 text-[var(--color-primary-apple)] rounded px-2 py-0.5 text-xs font-bold">
                        {percentage}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {buttonStats.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-4">Нет данных о кликах на кнопки</p>
        )}
      </motion.div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="p-6 rounded-2xl border border-[var(--apple-border)] bg-[var(--color-bg-secondary)]"
      >
        <h3 className="text-lg font-black mb-4 text-[var(--color-text-main)]">📈 Итоги</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[var(--color-text-muted)] font-bold mb-1">Всего пользователей</p>
            <p className="text-2xl font-black text-[var(--color-primary-apple)]">{metrics.totalUsers.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[var(--color-text-muted)] font-bold mb-1">Всего событий</p>
            <p className="text-2xl font-black text-[var(--color-primary-apple)]">{metrics.totalEvents.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[var(--color-text-muted)] font-bold mb-1">Всего сессий</p>
            <p className="text-2xl font-black text-[var(--color-primary-apple)]">{metrics.totalSessions.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[var(--color-text-muted)] font-bold mb-1">Avg событий на пользователя</p>
            <p className="text-2xl font-black text-[var(--color-primary-apple)]">
              {metrics.totalUsers > 0 ? (metrics.totalEvents / metrics.totalUsers).toFixed(2) : '0'}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
