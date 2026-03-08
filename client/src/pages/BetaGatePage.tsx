import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { User } from '../types';
import { Shield, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BetaGatePage() {
  const { updateUser } = useAuth();
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first input
  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 500);
  }, []);

  const handleChange = (index: number, value: string) => {
    // Only digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setError('');

    // Auto-advance
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      const newDigits = [...digits];
      newDigits[index - 1] = '';
      setDigits(newDigits);
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newDigits = [...digits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setDigits(newDigits);
      const focusIdx = Math.min(pasted.length, 5);
      inputRefs.current[focusIdx]?.focus();
    }
  };

  const handleSubmit = async () => {
    const code = digits.join('');
    if (code.length !== 6) {
      setError('Введите все 6 цифр');
      setShake(true);
      setTimeout(() => setShake(false), 600);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/auth/activate', { code });
      setSuccess(true);

      // Refresh user
      setTimeout(async () => {
        try {
          const data = await api.get<{ user: User }>('/auth/me');
          updateUser(data.user);
        } catch {
          // Fallback: just reload
          window.location.reload();
        }
      }, 1500);
    } catch (err: any) {
      const msg = err?.message || 'Ошибка активации';
      setError(msg);
      setShake(true);
      setTimeout(() => setShake(false), 600);
      // Clear digits on error
      setDigits(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const code = digits.join('');
  const isComplete = code.length === 6;

  return (
    <div className="min-h-screen bg-[var(--color-bg-apple)] flex flex-col relative overflow-hidden">
      <div className="flex-1 flex items-center justify-center px-5">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 squircle iron-metal-bg mb-6 shadow-2xl border border-white/10 overflow-hidden">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-black tracking-[-0.08em] metallic-text mb-2 lowercase">
              impera
            </h1>
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="h-px w-8 bg-[var(--color-primary-apple)] opacity-30" />
              <span className="text-[8px] font-black tracking-[0.5em] uppercase text-[var(--color-primary-apple)] opacity-80">
                closed beta
              </span>
              <div className="h-px w-8 bg-[var(--color-primary-apple)] opacity-30" />
            </div>
          </motion.div>

          {/* Code Input Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="apple-glass p-8 rounded-[32px] shadow-gold-glow border border-[var(--apple-border)] bg-white/5 dark:bg-white/5"
          >
            <div className="text-center mb-6">
              <Lock className="w-5 h-5 mx-auto mb-2 text-[var(--color-text-muted)] opacity-40" />
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--color-text-muted)] opacity-60">
                Код доступа
              </p>
            </div>

            {/* Success state */}
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <div className="text-5xl mb-4">🎉</div>
                  <p className="text-lg font-black text-[var(--color-text-main)] tracking-tight mb-1">
                    Добро пожаловать!
                  </p>
                  <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">
                    Загрузка приложения...
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {!success && (
              <>
                {/* 6 digit inputs */}
                <motion.div
                  animate={shake ? { x: [0, -12, 12, -8, 8, -4, 4, 0] } : {}}
                  transition={{ duration: 0.5 }}
                  className="flex gap-2.5 md:gap-3 justify-center mb-6"
                >
                  {digits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={el => { inputRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleChange(idx, e.target.value)}
                      onKeyDown={e => handleKeyDown(idx, e)}
                      onPaste={idx === 0 ? handlePaste : undefined}
                      disabled={loading}
                      className={`w-11 h-14 md:w-12 md:h-16 text-center text-xl md:text-2xl font-black rounded-2xl border-2 bg-black/[0.03] dark:bg-white/[0.05] outline-none transition-all duration-300 ${
                        digit
                          ? 'border-[var(--color-primary-apple)] text-[var(--color-text-main)] shadow-lg shadow-[var(--color-primary-apple)]/10'
                          : error
                            ? 'border-red-500/50 text-[var(--color-text-main)]'
                            : 'border-[var(--apple-border)] text-[var(--color-text-main)]'
                      } focus:border-[var(--color-primary-apple)] focus:shadow-lg focus:shadow-[var(--color-primary-apple)]/20 focus:scale-105 disabled:opacity-50`}
                    />
                  ))}
                </motion.div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-center text-[11px] font-bold text-red-500 mb-4"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Submit button */}
                <button
                  onClick={handleSubmit}
                  disabled={!isComplete || loading}
                  className={`w-full py-4 md:py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.25em] transition-all duration-500 ${
                    isComplete && !loading
                      ? 'iron-metal-bg text-white shadow-gold-glow hover:scale-[1.02] active:scale-[0.98]'
                      : 'bg-black/5 dark:bg-white/5 text-[var(--color-text-muted)] opacity-40 cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Проверка...
                    </span>
                  ) : (
                    'Активировать'
                  )}
                </button>
              </>
            )}
          </motion.div>

          {/* Footer note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center mt-8"
          >
            <p className="text-[9px] font-bold text-[var(--color-text-muted)] opacity-40 uppercase tracking-widest leading-relaxed">
              Коды распространяются лично<br />
              State University of Management &bull; 2026
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
