import React, { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../api/client';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [type, setType] = useState<'suggestion' | 'complaint' | 'bug' | 'other'>('suggestion');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Пожалуйста, напишите сообщение');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post('/feedback', { type, message });
      setSuccess(true);
      setMessage('');
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      setError('Ошибка при отправке обратной связи');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full md:w-full md:max-w-md bg-[var(--color-bg-apple)] rounded-t-3xl md:rounded-3xl shadow-2xl md:shadow-2xl p-6 md:p-8 space-y-4 animate-in slide-in-from-bottom-5 duration-300">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {success ? (
          <div className="text-center space-y-4 py-8">
            <div className="text-4xl">✅</div>
            <h2 className="text-lg font-bold">Спасибо!</h2>
            <p className="text-sm text-[var(--color-text-muted)]">Ваше сообщение отправлено</p>
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-xl font-bold text-[var(--color-text-main)] mb-1">Обратная связь</h2>
              <p className="text-sm text-[var(--color-text-muted)]">Помогите нам улучшить приложение</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Тип сообщения
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'suggestion' as const, label: '💡 Идея' },
                    { value: 'complaint' as const, label: '😞 Жалоба' },
                    { value: 'bug' as const, label: '🐛 Ошибка' },
                    { value: 'other' as const, label: '💬 Другое' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setType(option.value)}
                      className={`py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                        type === option.value
                          ? 'iron-metal-bg text-white'
                          : 'bg-black/5 dark:bg-white/5 text-[var(--color-text-main)] border border-[var(--apple-border)]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Сообщение
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Расскажите нам больше..."
                  className="w-full p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-[var(--apple-border)] text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-apple)] resize-none min-h-24"
                />
              </div>

              {error && (
                <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-3 text-sm text-red-800 dark:text-red-200">
                  {error}
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-lg iron-metal-bg text-white font-bold transition-all disabled:opacity-50 active:scale-95"
              >
                {loading ? 'Отправка...' : 'Отправить'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
