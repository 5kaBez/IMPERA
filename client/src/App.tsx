import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import SchedulePage from './pages/SchedulePage';
import ProfilePage from './pages/ProfilePage';
import SelectGroupPage from './pages/SelectGroupPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminSchedule from './pages/admin/AdminSchedule';
import AdminImport from './pages/admin/AdminImport';
import AdminUsers from './pages/admin/AdminUsers';
import FeedbackPage from './pages/FeedbackPage';
import SportsPage from './pages/SportsPage';
import { Component, useEffect, useState, type ReactNode } from 'react';
import { api } from './api/client';
import MaintenanceBanner from './components/MaintenanceBanner';

// Error Boundary to catch runtime crashes
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--color-bg-apple)] flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="text-5xl mb-4">😵</div>
            <h2 className="text-lg font-black text-[var(--color-text-main)] mb-2">Что-то пошло не так</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-6">
              {this.state.error?.message || 'Неизвестная ошибка'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
              className="px-6 py-3 rounded-2xl bg-[var(--color-primary-apple)] text-white text-sm font-bold"
            >
              Перезагрузить
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const { user, loading } = useAuth();
  const [maintenance, setMaintenance] = useState<{ enabled: boolean; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchStatus = async () => {
      try {
        const res = await api.get<{ maintenance: { enabled: boolean; message: string } }>('/app/status', {
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
        });
        if (!cancelled) setMaintenance(res.maintenance);
      } catch {
        // ignore
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 20000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const maintenanceBanner = maintenance?.enabled ? <MaintenanceBanner message={maintenance.message} /> : null;

  if (loading) {
    return (
      <>
        {maintenanceBanner}
        <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-6">
        <div className="text-center animate-in fade-in duration-1000">
          <div className="w-16 h-16 border-4 border-zinc-100 dark:border-zinc-900 border-t-[var(--color-primary-apple)] rounded-full animate-spin mx-auto mb-6 shadow-2xl" />
          <p className="text-sm font-black text-[var(--color-text-main)] tracking-widest uppercase">Загрузка IMPERA</p>
          <p className="text-[10px] font-bold text-[var(--color-text-muted)] mt-1 uppercase tracking-[0.2em]">Crafting your experience</p>
        </div>
      </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        {maintenanceBanner}
        <LoginPage />
      </>
    );
  }

  // Banned user screen
  if (user.banned) {
    return (
      <>
        {maintenanceBanner}
        <div className="min-h-screen bg-[var(--color-bg-apple)] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🚫</div>
          <h2 className="text-lg font-black text-[var(--color-text-main)] mb-2">Аккаунт заблокирован</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            Ваш аккаунт был заблокирован администратором. Если вы считаете, что это ошибка, обратитесь к администратору.
          </p>
        </div>
      </div>
      </>
    );
  }

  // Maintenance mode — block all non-admin users
  if (maintenance?.enabled && user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[var(--color-bg-apple)] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔧</div>
          <h2 className="text-2xl font-black text-[var(--color-text-main)] mb-3 tracking-tight">Идут технические работы</h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-6 leading-relaxed">
            {maintenance?.message || 'В приложении проводятся плановые технические работы. Приносим извинения за неудобство.'}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest font-bold">Попробуйте позже</p>
        </div>
      </div>
    );
  }

  if (!user.groupId && !user.isSportTeacher && !localStorage.getItem('impera_skip_group')) {
    return (
      <>
        {maintenanceBanner}
        <SelectGroupPage />
      </>
    );
  }

  return (
    <>
      {maintenanceBanner}
      <ErrorBoundary>
        <Layout>
          <Routes>
            <Route path="/" element={<SchedulePage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/sports" element={<SportsPage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            {user.role === 'admin' && (
              <>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/schedule" element={<AdminSchedule />} />
                <Route path="/admin/import" element={<AdminImport />} />
                <Route path="/admin/users" element={<AdminUsers />} />
              </>
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </ErrorBoundary>
    </>
  );
}

export default App;
