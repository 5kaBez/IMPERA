import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Calendar, User, Sun, Moon, LogOut, Menu, X, Shield, LayoutDashboard, Upload, Users } from 'lucide-react';
import CurrentLessonBanner from './CurrentLessonBanner';

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const navItems = [
    { path: '/', icon: Calendar, label: 'Расписание' },
    { path: '/profile', icon: User, label: 'Профиль' },
  ];

  const adminItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Дашборд' },
    { path: '/admin/schedule', icon: Calendar, label: 'Расписание' },
    { path: '/admin/import', icon: Upload, label: 'Импорт' },
    { path: '/admin/users', icon: Users, label: 'Пользователи' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">IMPERA</span>
          <button onClick={toggleTheme} className="p-2 -mr-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <nav className="relative w-72 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
            <div className="flex items-center justify-between px-5 h-14 border-b border-gray-200 dark:border-gray-800">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">IMPERA</span>
              <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarContent navItems={navItems} adminItems={user?.role === 'admin' ? adminItems : []} isActive={isActive} onClose={() => setSidebarOpen(false)} />
            <SidebarFooter user={user} theme={theme} toggleTheme={toggleTheme} logout={logout} />
          </nav>
        </div>
      )}

      {/* Desktop sidebar */}
      <nav className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-col z-40">
        <div className="flex items-center px-5 h-16 border-b border-gray-200 dark:border-gray-800">
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">IMPERA</span>
        </div>
        <SidebarContent navItems={navItems} adminItems={user?.role === 'admin' ? adminItems : []} isActive={isActive} />
        <SidebarFooter user={user} theme={theme} toggleTheme={toggleTheme} logout={logout} />
      </nav>

      {/* Main content */}
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <CurrentLessonBanner />
          {children}
        </div>
      </main>
    </div>
  );
}

function SidebarContent({ navItems, adminItems, isActive, onClose }: {
  navItems: { path: string; icon: any; label: string }[];
  adminItems: { path: string; icon: any; label: string }[];
  isActive: (path: string) => boolean;
  onClose?: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto py-4 px-3">
      <div className="space-y-1">
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isActive(item.path)
                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </Link>
        ))}
      </div>

      {adminItems.length > 0 && (
        <>
          <div className="mt-6 mb-2 px-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5" />
              Администрирование
            </div>
          </div>
          <div className="space-y-1">
            {adminItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive(item.path)
                    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SidebarFooter({ user, theme, toggleTheme, logout }: {
  user: any;
  theme: string;
  toggleTheme: () => void;
  logout: () => void;
}) {
  return (
    <div className="border-t border-gray-200 dark:border-gray-800 p-3 space-y-2">
      <button
        onClick={toggleTheme}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
      >
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        {theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
      </button>
      <div className="flex items-center gap-3 px-3 py-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
          {user?.firstName?.[0] || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName || ''}</p>
          <p className="text-xs text-gray-500 truncate">@{user?.username || 'user'}</p>
        </div>
        <button onClick={logout} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
