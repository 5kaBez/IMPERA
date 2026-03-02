import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, GraduationCap, Zap, Shield, Clock, MessageCircle } from 'lucide-react';

const IS_PRODUCTION = import.meta.env.PROD;
const BOT_USERNAME = 'Imper4_bot';

export default function LoginPage() {
  const { login, devLogin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDevLogin = async (role: string, telegramId?: string, firstName?: string) => {
    setLoading(true);
    setError('');
    try {
      const name = firstName || (role === 'admin' ? 'Администратор' : 'Студент');
      await devLogin(name, role, telegramId);
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

            {IS_PRODUCTION ? (
              /* Production: open via Telegram bot */
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-center">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                    Откройте через Telegram
                  </p>
                  <p className="text-xs text-blue-500/70">
                    Для входа используйте бота IMPERA в Telegram
                  </p>
                </div>
                <a
                  href={`https://t.me/${BOT_USERNAME}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium text-center hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg shadow-blue-500/25"
                >
                  Открыть бота @{BOT_USERNAME}
                </a>
              </div>
            ) : (
              /* Dev: test login buttons */
              <>
                <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-center">
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    🛠 Режим разработки — тестовый вход
                  </p>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={() => handleDevLogin('student', '100001', 'Иван')}
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium hover:from-indigo-600 hover:to-purple-600 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/25"
                  >
                    {loading ? 'Вход...' : '👨‍🎓 Студент — Иванов'}
                  </button>
                  <button
                    onClick={() => handleDevLogin('student', '200001', 'Дзигуа')}
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/25"
                  >
                    {loading ? 'Вход...' : '🏋️ Преподаватель — Дзигуа (Атлетизм)'}
                  </button>
                  <button
                    onClick={() => handleDevLogin('admin', '1038062816', 'Admin')}
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-50 border border-gray-200 dark:border-gray-700"
                  >
                    {loading ? 'Вход...' : '🛡️ Администратор'}
                  </button>
                </div>
              </>
            )}
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Государственный университет управления
          </p>
        </div>
      </div>
    </div>
  );
}
