import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import BetaGatePage from './pages/BetaGatePage';
import { AnimatePresence, motion } from 'framer-motion';
import { Component, type ReactNode } from 'react';

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
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-6">
        <div className="text-center animate-in fade-in duration-1000">
          <div className="w-16 h-16 border-4 border-zinc-100 dark:border-zinc-900 border-t-[var(--color-primary-apple)] rounded-full animate-spin mx-auto mb-6 shadow-2xl" />
          <p className="text-sm font-black text-[var(--color-text-main)] tracking-widest uppercase">Загрузка IMPERA</p>
          <p className="text-[10px] font-bold text-[var(--color-text-muted)] mt-1 uppercase tracking-[0.2em]">Crafting your experience</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // Beta gate: require invite code activation
  if (!user.activated && user.role !== 'admin') {
    return <BetaGatePage />;
  }

  if (!user.groupId && !user.isSportTeacher && !localStorage.getItem('impera_skip_group')) {
    return <SelectGroupPage />;
  }

  return (
    <ErrorBoundary>
      <Layout>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-full"
          >
            <Routes location={location}>
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
          </motion.div>
        </AnimatePresence>
      </Layout>
    </ErrorBoundary>
  );
}

export default App;
