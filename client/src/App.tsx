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
import { AnimatePresence, motion } from 'framer-motion';

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

  if (!user.groupId && user.role !== 'admin' && !user.isSportTeacher && !localStorage.getItem('impera_skip_group')) {
    return <SelectGroupPage />;
  }

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
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
  );
}

export default App;
