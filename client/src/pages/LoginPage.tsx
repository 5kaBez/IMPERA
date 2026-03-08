import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, GraduationCap, Zap, Shield, Clock, MessageCircle } from 'lucide-react';

const IS_PRODUCTION = import.meta.env.PROD;
const BOT_USERNAME = 'Imper4_bot';

export default function LoginPage() {
  const { devLogin } = useAuth();
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
    <div className="min-h-screen bg-[var(--color-bg-apple)] flex flex-col smooth-transition relative overflow-hidden">
      {/* Dynamic Background or Accents */}
      {/* Dynamic Background or Accents */}
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
          {/* Logo & Title */}
          <div className="text-center mb-16 animate-in fade-in zoom-in duration-1000">
            <div className="inline-flex items-center justify-center w-32 h-32 squircle iron-metal-bg mb-12 shadow-2xl scale-110 -rotate-3 hover:rotate-0 transition-all duration-700 group border border-white/10 overflow-hidden">
              <GraduationCap className="w-16 h-16 text-white group-hover:scale-110 transition-transform duration-700" />
            </div>
            <h1 className="text-8xl font-black tracking-[-0.08em] metallic-text mb-4 lowercase">
              impera
            </h1>
            <p className="text-[var(--color-text-muted)] text-[10px] font-black tracking-[0.4em] uppercase opacity-70">
              Your digital <span className="metallic-text">Masterpiece</span>
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-6 mb-16">
            {[
              { icon: Clock, label: 'Умное', desc: 'Smarter' },
              { icon: Zap, label: 'Мгновенно', desc: 'Instant' },
              { icon: Shield, label: 'Надежно', desc: 'Premium' },
            ].map((f) => (
              <div key={f.label} className="text-center p-6 apple-card border border-[var(--apple-border)] group bg-white/5 dark:bg-white/5 squircle overflow-hidden">
                <div className="w-12 h-12 mx-auto mb-4 squircle bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:iron-metal-bg group-hover:text-white transition-all duration-700 shadow-inner overflow-hidden">
                  <f.icon className="w-6 h-6" />
                </div>
                <p className="text-[9px] font-black text-[var(--color-text-main)] uppercase tracking-[0.2em]">{f.label}</p>
                <p className="text-[8px] font-bold text-[var(--color-text-muted)] mt-1 uppercase opacity-50 tracking-widest">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Login Card */}
          <div className="apple-glass p-12 rounded-[40px] shadow-gold-glow border border-[var(--apple-border)] backdrop-blur-3xl bg-white/5 dark:bg-white/5">
            <h2 className="text-lg font-black text-center mb-10 text-[var(--color-text-main)] tracking-widest uppercase opacity-70">
              Secure Access
            </h2>

            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-red-500/10 text-red-500 text-sm font-bold text-center border border-red-500/20">
                {error}
              </div>
            )}

            {IS_PRODUCTION ? (
              <div className="space-y-6">
                <div className="p-8 rounded-3xl bg-zinc-500/5 border border-[var(--apple-border)] text-center scale-95 hover:scale-100 transition-transform bg-white/5">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 text-[var(--color-primary-apple)] opacity-80" />
                  <p className="text-[10px] font-black text-[var(--color-text-main)] uppercase tracking-[0.3em] mb-2">
                    Telegram Vault
                  </p>
                  <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest leading-loose">
                    Authorized Entry Only
                  </p>
                </div>
                <a
                  href={`https://t.me/${BOT_USERNAME}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-6 px-8 rounded-[32px] iron-metal-bg text-white font-black text-xs uppercase tracking-[0.3em] text-center shadow-gold-glow hover:scale-[1.02] active:scale-[0.98] transition-all duration-700"
                >
                  Launch Gateway
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mb-10 text-center animate-pulse">
                  <p className="text-[9px] font-black text-[var(--color-primary-apple)] tracking-[0.4em] uppercase opacity-70">
                    CARBON SYSTEM &bull; v2.6.0
                  </p>
                </div>
                <button
                  onClick={() => handleDevLogin('student', '100001', 'Иван')}
                  disabled={loading}
                  className="w-full py-7 px-10 rounded-[36px] iron-metal-bg text-white font-black text-sm uppercase tracking-[0.25em] hover:shadow-2xl active:scale-[0.98] transition-all duration-700 shadow-2xl flex items-center justify-center gap-5 group overflow-hidden"
                >
                  {loading ? 'Processing...' : <><GraduationCap className="w-7 h-7 group-hover:rotate-12 transition-transform" /> sign in as student</>}
                </button>
                <button
                  onClick={() => handleDevLogin('admin', '1038062816', 'Admin')}
                  disabled={loading}
                  className="w-full py-5 px-8 rounded-[28px] bg-white/5 metallic-text font-black text-[10px] uppercase tracking-[0.3em] border border-[var(--apple-border)] hover:iron-metal-bg hover:text-white transition-all duration-700 active:scale-95 shadow-xl overflow-hidden"
                >
                  {loading ? 'Accessing...' : 'administrator access'}
                </button>
              </div>
            )}
          </div>

          <p className="text-center text-[11px] font-bold text-[var(--color-text-muted)] mt-12 tracking-[0.05em] uppercase opacity-50">
            State University of Management &bull; 2026
          </p>
        </div>
      </div>
    </div>
  );
}
