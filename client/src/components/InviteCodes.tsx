import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Copy, CheckCircle, QrCode, X } from 'lucide-react';
import QRCode from 'qrcode.react';

interface InviteCode {
  id: number;
  code: string;
  createdAt: string;
  usedAt: string | null;
  usedById: number | null;
}

interface InviteStats {
  totalCreated: number;
  activeUnused: number;
  alreadyUsed: number;
}

export function InviteCodes() {
  const { user, loading: authLoading } = useAuth();
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [stats, setStats] = useState<InviteStats>({ totalCreated: 0, activeUnused: 0, alreadyUsed: 0 });
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [canGenerateNow, setCanGenerateNow] = useState(true); // Start as true, will update after load
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newCode, setNewCode] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);

  // Fetch user's codes
  const fetchCodes = async () => {
    try {
      const data = await api.get<{ codes: InviteCode[], stats: InviteStats }>('/invites/my-codes');
      setCodes(data.codes);
      setStats(data.stats);
      setError('');
    } catch (err: any) {
      console.error('Failed to fetch codes:', err);
      setError(`Ошибка загрузки кодов: ${err.message || 'Неизвестная ошибка'}`);
    }
  };

  // Check remaining time
  const checkRemainingTime = async () => {
    try {
      const data = await api.get<{ canGenerateNow: boolean, secondsRemaining: number }>('/invites/remaining-time');
      setCanGenerateNow(data.canGenerateNow);
      setRemainingSeconds(data.secondsRemaining || 0);
      setError('');
    } catch (err: any) {
      console.error('Failed to check remaining time:', err);
      setError(`Ошибка проверки таймера: ${err.message || 'Неизвестная ошибка'}`);
    }
  };

  // Initial load
  useEffect(() => {
    // Wait for auth to complete
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setLoading(false);
      setError('Требуется авторизация');
      return;
    }
    
    setLoading(true);
    const loadData = async () => {
      try {
        await Promise.all([fetchCodes(), checkRemainingTime()]);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user?.id, authLoading]); // Added authLoading dependency

  // Countdown timer
  useEffect(() => {
    if (remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds(s => {
        if (s <= 1) {
          setCanGenerateNow(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingSeconds]);

  const generateCode = async () => {
    try {
      setGenerating(true);
      setError('');
      setSuccess('');
      setNewCode('');

      const data = await api.post<{ code: string }>('/invites/generate');
      setNewCode(data.code);
      setSuccess('Код успешно создан!');
      setCanGenerateNow(false);
      checkRemainingTime();
      fetchCodes();
    } catch (err: any) {
      if (err.status === 429) {
        setError('Вы можете создавать коды только один раз в 24 часа');
      } else if (err.status === 409) {
        setError('Вы достигли максимального количества активных кодов');
      } else {
        setError(err.message || 'Ошибка при создании кода');
      }
      console.error('Generate code error:', err);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const generateQRLink = (inviteCode: string): string => {
    const botUsername = import.meta.env.VITE_BOT_USERNAME || 'your_bot';
    return `https://t.me/${botUsername}?start=${inviteCode}`;
  };

  const openQRModal = (code: string) => {
    setQrCode(code);
  };

  const closeQRModal = () => {
    setQrCode(null);
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}ч ${minutes}м`;
    }
    return `${minutes}м`;
  };

  if (authLoading) {
    return <div className="text-center text-[var(--color-text-muted)] py-8">⏳ Загрузка...</div>;
  }

  if (!user) {
    return <div className="text-center text-[var(--color-text-muted)]">Требуется авторизация</div>;
  }

  return (
    <div className="pb-4 space-y-3 md:space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {/* Total Created */}
        <div className="rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--apple-border)] p-3 md:p-5 text-center">
          <div className="text-2xl md:text-3xl font-black metallic-text">{stats.totalCreated}</div>
          <p className="text-[9px] md:text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider opacity-50 mt-1">Создано кодов</p>
        </div>

        {/* Friends Invited */}
        <div className="rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--apple-border)] p-3 md:p-5 text-center">
          <div className="text-2xl md:text-3xl font-black" style={{ color: 'var(--color-primary-apple)' }}>{stats.alreadyUsed}</div>
          <p className="text-[9px] md:text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider opacity-50 mt-1">Друзей при.</p>
        </div>

        {/* Active Codes */}
        <div className="rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--apple-border)] p-3 md:p-5 text-center">
          <div className="text-2xl md:text-3xl font-black" style={{ color: 'var(--color-primary-apple)' }}>{stats.activeUnused}</div>
          <p className="text-[9px] md:text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider opacity-50 mt-1">Активных</p>
        </div>
      </div>

      {/* Generate Code Section */}
      <div className="rounded-2xl md:rounded-[40px] bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--apple-border)] p-4 md:p-10">
        <h3 className="text-lg md:text-xl font-black text-[var(--color-text-main)] mb-4 md:mb-6 tracking-tight">Создать код</h3>

        {/* New Code Display */}
        {newCode && (
          <div className="mb-4 md:mb-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border border-emerald-500/30 p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] md:text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2">Ваш код</p>
                <div className="text-3xl md:text-4xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-widest break-all">{newCode}</div>
                <p className="text-xs md:text-sm text-[var(--color-text-muted)] mt-2">Скопируйте и поделитесь с друзьями!</p>
              </div>
              <button
                onClick={() => copyToClipboard(newCode)}
                className={`flex-shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center transition-all ${
                  copied === newCode
                    ? 'iron-metal-bg text-white'
                    : 'bg-black/5 dark:bg-white/5 text-[var(--color-text-muted)] hover:iron-metal-bg hover:text-white'
                }`}
              >
                {copied === newCode ? <CheckCircle className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 p-4 md:p-5">
            <p className="text-sm md:text-base font-bold text-rose-600 dark:text-rose-400">{error}</p>
          </div>
        )}

        {/* Generate Button or Timer */}
        {canGenerateNow ? (
          <button
            onClick={generateCode}
            disabled={generating}
            className={`w-full py-3 md:py-4 px-6 rounded-2xl md:rounded-[28px] font-black text-sm md:text-base tracking-tight transition-all active:scale-[0.98] ${
              generating
                ? 'iron-metal-bg text-white opacity-70'
                : 'iron-metal-bg text-white hover:shadow-lg'
            }`}
          >
            {generating ? '⏳ Создание кода...' : '✨ Создать инвайт-код'}
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm md:text-base text-[var(--color-text-muted)] font-bold">Следующий код через:</p>
            <div className="flex items-center justify-center p-6 md:p-8 rounded-2xl bg-black/5 dark:bg-white/5 border border-[var(--apple-border)]">
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-black metallic-text">{formatTime(remainingSeconds)}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Codes List */}
      {codes.length > 0 && (
        <div className="rounded-2xl md:rounded-[40px] bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--apple-border)] p-4 md:p-10">
          <h3 className="text-lg md:text-xl font-black text-[var(--color-text-main)] mb-4 md:mb-6 tracking-tight">Ваши коды</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {codes.map((code) => (
              <div
                key={code.id}
                className={`flex items-center gap-3 md:gap-5 p-3 md:p-4 rounded-2xl border transition-all ${
                  code.usedAt
                    ? 'bg-black/5 dark:bg-white/5 border-[var(--apple-border)] opacity-60'
                    : 'bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--apple-border)]'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-mono font-black text-lg md:text-xl text-[var(--color-text-main)]">{code.code}</div>
                  <p className="text-xs md:text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wider opacity-50 mt-1">
                    {code.usedAt
                      ? `Использован ${new Date(code.usedAt).toLocaleDateString('ru-RU')}`
                      : '✓ Активный'}
                  </p>
                </div>
                {!code.usedAt && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => openQRModal(code.code)}
                      className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all active:scale-90 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400"
                      title="Показать QR код"
                    >
                      <QrCode className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => copyToClipboard(code.code)}
                      className={`flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all active:scale-90 ${
                        copied === code.code
                          ? 'iron-metal-bg text-white'
                          : 'bg-black/5 dark:bg-white/5 text-[var(--color-text-muted)] hover:iron-metal-bg hover:text-white'
                      }`}
                    >
                      {copied === code.code ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && <div className="text-center py-8 text-[var(--color-text-muted)]">Загрузка кодов...</div>}

      {/* QR Code Modal */}
      {qrCode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 md:p-10 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg md:text-xl font-black text-[var(--color-text-main)]">QR Код</h3>
              <button
                onClick={closeQRModal}
                className="w-10 h-10 rounded-xl flex items-center justify-center bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-white p-6 rounded-2xl flex justify-center mb-6">
              <QRCode
                value={generateQRLink(qrCode)}
                size={256}
                level="H"
                includeMargin
              />
            </div>

            <div className="space-y-3">
              <p className="text-xs md:text-sm text-[var(--color-text-muted)] text-center">
                Код: <span className="font-mono font-black text-[var(--color-text-main)]">{qrCode}</span>
              </p>
              <p className="text-xs md:text-sm text-[var(--color-text-muted)] text-center">
                Отсканируйте QR или поделитесь этой ссылкой:
              </p>
              <div className="bg-black/5 dark:bg-white/5 p-3 rounded-xl break-all text-xs md:text-sm font-mono text-[var(--color-text-main)]">
                {generateQRLink(qrCode)}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generateQRLink(qrCode));
                  setCopied(qrCode);
                  setTimeout(() => setCopied(null), 2000);
                }}
                className="w-full py-2 px-4 rounded-xl iron-metal-bg text-white font-bold transition-all active:scale-[0.98]"
              >
                {copied === qrCode ? '✓ Ссылка скопирована' : 'Копировать ссылку'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
