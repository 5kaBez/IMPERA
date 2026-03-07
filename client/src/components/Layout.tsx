import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Calendar, User, Sun, Moon, LogOut, Menu, X, Shield, LayoutDashboard, Upload, Users, MessageSquare, Dumbbell } from 'lucide-react';
import CurrentLessonBanner from './CurrentLessonBanner';

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navItems = [
    { path: '/', icon: Calendar, label: 'Расписание' },
    { path: '/sports', icon: Dumbbell, label: 'Спорт' },
    { path: '/feedback', icon: MessageSquare, label: 'Связь' },
    { path: '/profile', icon: User, label: 'Профиль' },
  ];

  const adminItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Дашборд' },
    { path: '/admin/schedule', icon: Calendar, label: 'Расписание' },
    { path: '/admin/import', icon: Upload, label: 'Импорт' },
    { path: '/admin/users', icon: Users, label: 'Пользователи' },
  ];

  const isAdmin = user?.role === 'admin';

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-bg-apple)] text-[var(--color-text-main)] transition-colors duration-700 font-sans selection:bg-[var(--color-primary-apple)]/20">
      {/* Mobile top bar - minimal, only md screens (tablets). Hidden on phones (handled by bottom nav) */}
      <header className="hidden md:flex lg:hidden fixed top-0 left-0 right-0 z-50 apple-glass border-b border-[var(--apple-border)]">
        <div className="flex items-center justify-between px-6 h-12 w-full">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-all">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-black text-lg tracking-tighter metallic-text lowercase">impera.</span>
          <button onClick={toggleTheme} className="p-2 -mr-2 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-all">
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-zinc-500" />}
          </button>
        </div>
      </header>

      {/* Bottom Navigation (Mobile) - Compact */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 apple-glass border-t border-[var(--apple-border)] flex items-center justify-around px-2 z-40 bg-[var(--color-bg-apple)] safe-bottom">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-colors duration-300 ${active ? '' : 'text-[var(--color-text-muted)]'
                }`}
            >
              <div className={`p-1.5 rounded-xl transition-colors duration-300 ${active ? 'iron-metal-bg text-white' : ''
                }`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[9px] font-bold mt-0.5 ${active ? 'text-[var(--color-primary-apple)]' : 'opacity-60'}`}>{item.label}</span>
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            to="/admin"
            className={`relative flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-colors duration-300 ${location.pathname.startsWith('/admin') ? '' : 'text-[var(--color-text-muted)]'
              }`}
          >
            <div className={`p-1.5 rounded-xl transition-colors duration-300 ${location.pathname.startsWith('/admin') ? 'iron-metal-bg text-white' : ''
              }`}>
              <Shield className="w-5 h-5" />
            </div>
            <span className={`text-[9px] font-bold mt-0.5 ${location.pathname.startsWith('/admin') ? 'text-[var(--color-primary-apple)]' : 'opacity-60'}`}>Админ</span>
          </Link>
        )}
      </nav>

      {/* Sidebar overlay - for all users, hidden by default */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <nav className="relative w-72 h-full bg-[var(--color-bg-apple)] border-r border-[var(--apple-border)] flex flex-col apple-glass overflow-hidden">
            <div className="flex items-center justify-between px-5 h-14 border-b border-[var(--apple-border)] flex-shrink-0">
              <span className="font-black text-lg tracking-tight metallic-text lowercase">меню.</span>
              <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5">
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarContent navItems={navItems} adminItems={isAdmin ? adminItems : []} isActive={isActive} onClose={() => setSidebarOpen(false)} />
            <SidebarFooter user={user} theme={theme} toggleTheme={toggleTheme} logout={logout} />
          </nav>
        </div>
      )}

      {/* Sidebar Navigation (Desktop only) */}
      <aside className="hidden lg:flex flex-col w-80 apple-glass border-r border-[var(--apple-border)] h-full fixed left-0 top-0 z-50 shadow-2xl group">
        <div className="p-12">
          <h1 className="text-3xl font-black tracking-tighter text-[var(--color-text-main)] flex items-center gap-4 lowercase">
            <div className="w-14 h-14 squircle iron-metal-bg flex items-center justify-center shadow-2xl border border-white/10 overflow-hidden">
              <span className="metallic-text scale-125">i.</span>
            </div>
            <span className="metallic-text">impera.</span>
          </h1>
        </div>

        <nav className="flex-1 px-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-5 px-6 py-4 rounded-[22px] text-sm font-black tracking-tight transition-all duration-500 group relative ${active
                  ? 'iron-metal-bg text-white shadow-gold-glow scale-[1.02]'
                  : 'text-[var(--color-text-muted)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--color-text-main)] hover:scale-[1.02] active:scale-[0.98]'
                  }`}
              >
                <div className="relative">
                  <Icon className={`w-6 h-6 transition-all duration-500 ${active ? 'scale-110' : 'group-hover:scale-125 group-hover:rotate-6 group-hover:text-[var(--color-primary-apple)]'}`} />
                  {active && (
                    <motion.div
                      layoutId="icon-aura"
                      className="absolute inset-0 bg-[var(--color-primary-apple)]/20 blur-xl rounded-full -z-10"
                    />
                  )}
                </div>
                {item.label}
                {active && (
                  <motion.div
                    layoutId="desktop-active-pill"
                    className="absolute left-1 w-1 h-8 metallic-bg rounded-full shadow-gold-glow"
                  />
                )}
              </Link>
            );
          })}
          {isAdmin && (
            <>
              <div className="mt-10 mb-4 px-4">
                <div className="flex items-center gap-2 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] opacity-60">
                  <Shield className="w-3.5 h-3.5" />
                  administrator
                </div>
              </div>
              <div className="space-y-2">
                {adminItems.map(item => {
                  const active = location.pathname.startsWith(item.path);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-5 px-6 py-4 rounded-[22px] text-sm font-black tracking-tight transition-all duration-500 group relative ${active
                        ? 'metallic-bg text-black shadow-gold-glow scale-[1.02]'
                        : 'text-[var(--color-text-muted)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--color-text-main)]'
                        }`}
                    >
                      <Icon className={`w-6 h-6 ${active ? 'scale-110' : 'group-hover:scale-110 transition-transform'}`} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </nav>
        <SidebarFooter user={user} theme={theme} toggleTheme={toggleTheme} logout={logout} />
      </aside>

      {/* Main content */}
      <main className="lg:ml-80 flex-1 flex flex-col pb-18 lg:pb-0 pt-1 md:pt-12 lg:pt-0">
        <div className="w-full flex flex-col px-3 md:px-6 lg:px-16 pt-0 md:pt-0 lg:pt-11">
          <CurrentLessonBanner />
          <div className="mt-2 md:mt-6">
            {children}
          </div>
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
    <div className="flex-1 overflow-y-auto py-3 md:py-4 px-2 md:px-3">
      <div className="space-y-1">
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl text-xs md:text-sm font-black transition-all duration-500 group relative ${isActive(item.path)
              ? 'iron-metal-bg text-white shadow-gold-glow'
              : 'text-[var(--color-text-muted)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--color-text-main)]'
              }`}
          >
            <item.icon className="w-4 md:w-5 h-4 md:h-5 flex-shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
      </div>

      {adminItems.length > 0 && (
        <>
          <div className="mt-6 md:mt-8 mb-3 md:mb-4 px-2 md:px-3">
            <div className="flex items-center gap-2 text-[8px] md:text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.1em] md:tracking-[0.2em] opacity-60">
              <Shield className="w-3 md:w-3.5 h-3 md:h-3.5 flex-shrink-0" />
              administrator
            </div>
          </div>
          <div className="space-y-1">
            {adminItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-black transition-all duration-500 ${isActive(item.path)
                  ? 'iron-metal-bg text-white shadow-gold-glow'
                  : 'text-[var(--color-text-muted)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--color-text-main)]'
                  }`}
              >
                <item.icon className="w-4 md:w-5 h-4 md:h-5 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
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
    <div className="p-4 md:p-6 space-y-3 md:space-y-4 flex-shrink-0 border-t border-[var(--apple-border)]">
      <button
        onClick={toggleTheme}
        className="w-full flex items-center justify-between px-4 md:px-6 py-3 md:py-4 rounded-lg md:rounded-[22px] text-[10px] font-black uppercase tracking-widest bg-black/5 dark:bg-white/5 hover:bg-black/10 transition-all group"
      >
        <div className="flex items-center gap-2 md:gap-3">
          {theme === 'dark' ? <Sun className="w-4 md:w-5 h-4 md:h-5 text-amber-300" /> : <Moon className="w-4 md:w-5 h-4 md:h-5 text-zinc-500" />}
          <span className="text-[var(--color-text-main)] text-xs md:text-sm">{theme === 'dark' ? 'Light' : 'Carbon'}</span>
        </div>
        <div className={`w-8 md:w-10 h-4 md:h-5 rounded-full relative transition-colors duration-500 ${theme === 'dark' ? 'metallic-bg' : 'bg-zinc-300'}`}>
          <div className={`absolute top-0.5 md:top-1 w-2.5 md:w-3 h-2.5 md:h-3 rounded-full bg-white transition-all duration-500 ${theme === 'dark' ? 'left-5 md:left-6' : 'left-0.5 md:left-1'}`} />
        </div>
      </button>

      <div className="flex items-center gap-2 md:gap-4 p-2.5 md:p-4 apple-glass rounded-lg md:rounded-[28px] border border-[var(--apple-border)] bg-black/5 dark:bg-white/5">
        <div className="w-8 md:w-12 h-8 md:h-12 squircle iron-metal-bg flex items-center justify-center text-white text-sm md:text-xl font-black shadow-2xl border border-white/10 flex-shrink-0">
          {user?.firstName?.[0] || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs md:text-sm font-black text-[var(--color-text-main)] truncate tracking-tight lowercase">{user?.firstName}.</p>
          <p className="text-[9px] md:text-[10px] font-black text-[var(--color-text-muted)] truncate uppercase tracking-widest opacity-60">{user?.username || 'STUDENT'}</p>
        </div>
        <button
          onClick={logout}
          className="p-2 md:p-3 rounded-lg md:rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all duration-500 group flex-shrink-0"
          title="Выйти"
        >
          <LogOut className="w-4 md:w-5 h-4 md:h-5 group-hover:rotate-12 transition-transform" />
        </button>
      </div>
    </div>
  );
}
