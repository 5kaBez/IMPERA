import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, GraduationCap, Zap, Shield, Clock } from 'lucide-react';

export default function LoginPage() {
  const { login, devLogin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDevLogin = async (role: string) => {
    setLoading(true);
    setError('');
    try {
      await devLogin(role === 'admin' ? 'Администратор' : 'Студент', role);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Telegram Login Widget callback
  (window as any).onTelegramAuth = async (user: any) => {
    setLoading(true);
    setError('');
    try {
      await login(user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Theme toggle */}
      <div className="absolute top-4 right-4">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-all shadow-sm"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Logo & Title */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-6 shadow-lg shadow-indigo-500/25">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-2">
              IMPERA
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              Цифровая платформа ГУУ
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { icon: Clock, label: 'Расписание', desc: 'Всегда актуальное' },
              { icon: Zap, label: 'Быстро', desc: 'Мгновенный доступ' },
              { icon: Shield, label: 'Надёжно', desc: 'Стабильная работа' },
            ].map((f) => (
              <div key={f.label} className="text-center p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                <f.icon className="w-6 h-6 mx-auto mb-2 text-indigo-500" />
                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{f.label}</p>
                <p className="text-[10px] text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Login Card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-xl shadow-black/5">
            <h2 className="text-lg font-semibold text-center mb-6">Войти в систему</h2>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            {/* Telegram Login Placeholder */}
            <div className="mb-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-center">
              <p className="text-sm text-blue-600 dark:text-blue-400 mb-2">
                Авторизация через Telegram
              </p>
              <p className="text-xs text-blue-500/70">
                Добавьте BOT_TOKEN в .env для активации
              </p>
            </div>

            {/* Dev login buttons */}
            <div className="space-y-3">
              <button
                onClick={() => handleDevLogin('student')}
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium hover:from-indigo-600 hover:to-purple-600 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/25"
              >
                {loading ? 'Вход...' : 'Войти как студент'}
              </button>
              <button
                onClick={() => handleDevLogin('admin')}
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-50 border border-gray-200 dark:border-gray-700"
              >
                {loading ? 'Вход...' : 'Войти как администратор'}
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Государственный университет управления
          </p>
        </div>
      </div>
    </div>
  );
}
