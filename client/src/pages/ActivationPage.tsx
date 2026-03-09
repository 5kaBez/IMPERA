import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';
import { Lock, Sparkles, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ActivationPage() {
  const { user, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Автофокус на первый инпут
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    // Только цифры
    const digit = value.replace(/\D/g, '').slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setError('');

    // Автопереход на следующий
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Автосабмит когда все 6 цифр введены
    if (digit && index === 5) {
      const fullCode = newCode.join('');
      if (fullCode.length === 6) {
        submitCode(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newCode = pasted.split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();
      submitCode(pasted);
    }
  };

  const submitCode = async (fullCode: string) => {
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/activate', { code: fullCode });
      setSuccess(true);
      // Обновляем юзера
      setTimeout(() => {
        if (user) {
          updateUser({ ...user, activated: true });
        }
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Неверный код');
      setCode(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-apple)] flex flex-col smooth-transition relative overflow-hidden">
      {/* Фоновые акценты */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[var(--color-primary-apple)]/5 blur-[150px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-zinc-400/5 blur-[180px] rounded-full" />

      {/* Theme toggle */}
      <div className="absolute top-6 right-6 z-50">
        <button
          onClick={toggleTheme}
          className="p-3 rounded-2xl apple-glass shadow-xl hover:scale-110 active:scale-95 smooth-transition"
        >
          {theme === 'dark' ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-700" />}
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-28 h-28 squircle iron-metal-bg mb-8 shadow-2xl overflow-hidden">
                  <Sparkles className="w-14 h-14 text-white" />
                </div>
                <h1 className="text-4xl font-black metallic-text tracking-[-0.06em] mb-3 lowercase">
                  добро пожаловать
                </h1>
                <p className="text-[var(--color-text-muted)] text-sm font-bold">
                  Ты в закрытой бете IMPERA
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                {/* Иконка + Заголовок */}
                <div className="text-center mb-12">
                  <div className="inline-flex items-center justify-center w-24 h-24 squircle iron-metal-bg mb-8 shadow-2xl -rotate-3 hover:rotate-0 transition-all duration-700 overflow-hidden">
                    <Lock className="w-12 h-12 text-white" />
                  </div>
                  <h1 className="text-5xl font-black metallic-text tracking-[-0.08em] mb-3 lowercase">
                    бета-тест
                  </h1>
                  <p className="text-[var(--color-text-muted)] text-[10px] font-black tracking-[0.3em] uppercase opacity-70">
                    Закрытый доступ &bull; только по приглашению
                  </p>
                </div>

                {/* Приветствие */}
                <div className="text-center mb-8">
                  <p className="text-[var(--color-text-main)] text-sm font-bold">
                    Привет, {user?.firstName}! 👋
                  </p>
                  <p className="text-[var(--color-text-muted)] text-xs mt-1">
                    Введи 6-значный код доступа
                  </p>
                </div>

                {/* Поле ввода кода */}
                <div className="apple-glass p-8 rounded-[32px] shadow-gold-glow border border-[var(--apple-border)] backdrop-blur-3xl bg-white/5 dark:bg-white/5 mb-6">
                  <div className="flex justify-center gap-2.5 mb-6" onPaste={handlePaste}>
                    {code.map((digit, index) => (
                      <input
                        key={index}
                        ref={el => { inputRefs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleChange(index, e.target.value)}
                        onKeyDown={e => handleKeyDown(index, e)}
                        disabled={loading}
                        className={`w-12 h-14 md:w-14 md:h-16 text-center text-2xl font-black rounded-2xl border-2 transition-all duration-300 outline-none bg-black/[0.03] dark:bg-white/[0.06] text-[var(--color-text-main)] ${
                          error
                            ? 'border-red-500/50 shake'
                            : digit
                              ? 'border-[var(--color-primary-apple)]/50 shadow-gold-glow'
                              : 'border-[var(--apple-border)] focus:border-[var(--color-primary-apple)]/50'
                        } ${loading ? 'opacity-50' : ''}`}
                      />
                    ))}
                  </div>

                  {/* Ошибка */}
                  <AnimatePresence>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-center text-red-500 text-xs font-bold mb-4"
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  {/* Лоадер */}
                  {loading && (
                    <div className="flex justify-center">
                      <div className="w-6 h-6 border-2 border-zinc-200 dark:border-zinc-700 border-t-[var(--color-primary-apple)] rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Подпись */}
                <div className="text-center space-y-2">
                  <p className="text-[var(--color-text-muted)] text-[10px] font-bold uppercase tracking-widest opacity-50">
                    15 мест &bull; осталось ограниченное количество
                  </p>
                  <p className="text-[var(--color-text-muted)] text-[9px] font-bold uppercase tracking-widest opacity-30">
                    impera &bull; closed beta
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
