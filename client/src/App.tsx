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

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (!user.groupId && user.role !== 'admin') {
    return <SelectGroupPage />;
  }

  return (
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
  );
}

export default App;
