import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Feedback } from '../types';
import {
  MessageSquare,
  Send,
  CheckCircle,
  Bug,
  Lightbulb,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import { useDelayedLoading } from '../hooks/useDelayedLoading';

const FEEDBACK_TYPES = [
  { value: 'suggestion', label: 'Предложение', icon: Lightbulb, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { value: 'complaint', label: 'Жалоба', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
  { value: 'bug', label: 'Баг', icon: Bug, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { value: 'other', label: 'Другое', icon: HelpCircle, color: 'text-gray-500', bg: 'bg-gray-500/10' },
] as const;

type FeedbackType = (typeof FEEDBACK_TYPES)[number]['value'];

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  new: { label: 'Новое', className: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' },
  in_progress: { label: 'В работе', className: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' },
  resolved: { label: 'Решено', className: 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400' },
  rejected: { label: 'Отклонено', className: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' },
};

function getTypeConfig(type: string) {
  return FEEDBACK_TYPES.find(t => t.value === type) ?? FEEDBACK_TYPES[3];
}

export default function FeedbackPage() {
  const [type, setType] = useState<FeedbackType>('suggestion');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const showListLoader = useDelayedLoading(loadingList, 1500);

  const loadFeedback = () => {
    setLoadingList(true);
    api
      .get<Feedback[]>('/feedback')
      .then(setFeedbackList)
      .catch(() => setFeedbackList([]))
      .finally(() => setLoadingList(false));
  };

  useEffect(() => {
    loadFeedback();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSubmitting(true);
    setError('');
    try {
      await api.post('/feedback', { type, message: message.trim() });
      setSubmitted(true);
      setMessage('');
      loadFeedback();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewFeedback = () => {
    setSubmitted(false);
    setType('suggestion');
    setMessage('');
    setError('');
  };

  return (
    <div className="pb-12">
      <div className="mb-6 md:mb-10 animate-in fade-in slide-in-from-top duration-700">
        <h1 className="text-2xl md:text-4xl font-black text-[var(--color-text-main)] tracking-[-0.04em]">Обратная связь</h1>
        <p className="text-sm md:text-lg font-medium text-[var(--color-text-muted)] tracking-tight mt-1">
          Помогите нам стать лучше
        </p>
      </div>

      {/* Submit Form / Success */}
      <div className="apple-glass rounded-[24px] md:rounded-[28px] border border-[var(--apple-border)] p-6 md:p-8 mb-8 md:mb-10 shadow-xl shadow-black/5 dark:shadow-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
        {submitted ? (
          <div className="text-center py-6 md:py-8">
            <div className="w-16 md:w-20 h-16 md:h-20 mx-auto mb-4 md:mb-6 rounded-[20px] md:rounded-[24px] bg-emerald-500/10 flex items-center justify-center shadow-inner">
              <CheckCircle className="w-8 md:w-10 h-8 md:h-10 text-emerald-500" />
            </div>
            <h2 className="text-xl md:text-2xl font-black text-[var(--color-text-main)] tracking-tight mb-2">
              Спасибо!
            </h2>
            <p className="text-sm md:text-base font-medium text-[var(--color-text-muted)] mb-6 md:mb-8 max-w-xs mx-auto">
              Ваше обращение отправлено. Мы рассмотрим его в ближайшее время.
            </p>
            <button
              onClick={handleNewFeedback}
              className="inline-flex items-center gap-2 px-6 md:px-8 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold text-white bg-[var(--color-primary-apple)] shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              Написать ещё
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Type Selector */}
            <label className="block text-[9px] md:text-[11px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-3 px-1">
              Тип обращения
            </label>
            <div className="grid grid-cols-2 gap-2 md:gap-3 mb-6 md:mb-8">
              {FEEDBACK_TYPES.map(ft => {
                const Icon = ft.icon;
                const selected = type === ft.value;
                return (
                  <button
                    key={ft.value}
                    type="button"
                    onClick={() => setType(ft.value)}
                    className={`flex flex-col md:flex-row items-center gap-2 px-3 md:px-5 py-3 md:py-4 rounded-lg md:rounded-2xl text-xs md:text-sm font-bold transition-all border ${selected
                        ? 'border-[var(--color-primary-apple)] bg-[var(--color-primary-apple)] text-white shadow-lg shadow-blue-500/20'
                        : 'border-[var(--apple-border)] bg-black/5 dark:bg-white/5 text-[var(--color-text-muted)] hover:border-zinc-400'
                      }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${selected ? 'text-white' : ft.color}`} />
                    <span className="text-[7px] md:text-xs">{ft.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Message */}
            <label className="block text-[9px] md:text-[11px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-3 px-1">
              Сообщение
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Опишите подробнее..."
              rows={4}
              className="w-full px-4 md:px-5 py-3 md:py-4 rounded-xl md:rounded-2xl border border-[var(--apple-border)] bg-black/5 dark:bg-white/5 text-[var(--color-text-main)] placeholder-zinc-400 text-sm md:text-base font-medium resize-none focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
            />

            {/* Error */}
            {error && (
              <p className="text-xs md:text-sm text-red-500 mt-2">{error}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !message.trim()}
              className="w-full mt-6 md:mt-8 flex items-center justify-center gap-3 py-3 md:py-4 rounded-xl md:rounded-2xl text-sm md:text-base font-bold text-white bg-[var(--color-primary-apple)] shadow-2xl shadow-blue-500/30 transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.98]"
            >
              {submitting ? (
                <div className="w-5 md:w-6 h-5 md:h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 md:w-5 h-4 md:h-5" />
                  Отправить
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Previous Feedback */}
      <div>
        <h2 className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-4 md:mb-5 px-1 flex items-center gap-3">
          <MessageSquare className="w-4 h-4" />
          Мои обращения
        </h2>

        {loadingList ? (
          showListLoader ? (
            <div className="flex justify-center py-16 md:py-20">
              <div className="w-8 md:w-10 h-8 md:h-10 border-4 border-[var(--color-primary-apple)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : null
        ) : feedbackList.length === 0 ? (
          <div className="text-center py-12 md:py-20 bg-black/5 dark:bg-white/5 rounded-[24px] md:rounded-[32px] border border-dashed border-[var(--apple-border)]">
            <MessageSquare className="w-12 md:w-16 h-12 md:h-16 mx-auto mb-3 md:mb-4 text-zinc-300" />
            <p className="text-base md:text-lg font-bold text-[var(--color-text-muted)]">
              У вас пока нет обращений
            </p>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {feedbackList.map(fb => {
              const cfg = getTypeConfig(fb.type);
              const Icon = cfg.icon;
              const status = STATUS_MAP[fb.status] ?? STATUS_MAP['new'];
              const date = new Date(fb.createdAt).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });

              return (
                <div
                  key={fb.id}
                  className="apple-card border border-[var(--apple-border)] p-4 md:p-6 transition-all hover:shadow-xl"
                >
                  {/* Header */}
                  <div className="flex items-start md:items-center justify-between gap-2 mb-3 md:mb-4">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className={`w-8 md:w-10 h-8 md:h-10 rounded-lg md:rounded-xl ${cfg.bg} flex items-center justify-center shadow-inner flex-shrink-0`}>
                        <Icon className={`w-4 md:w-5 h-4 md:h-5 ${cfg.color}`} />
                      </div>
                      <span className="text-sm md:text-base font-bold text-[var(--color-text-main)]">
                        {cfg.label}
                      </span>
                    </div>
                    <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-wider px-2 md:px-3 py-0.5 md:py-1 rounded-full ${status.className} border border-current opacity-70 flex-shrink-0 whitespace-nowrap`}>
                      {status.label}
                    </span>
                  </div>

                  {/* Message */}
                  <p className="text-xs md:text-sm font-medium text-[var(--color-text-main)] leading-relaxed mb-3 md:mb-4 opacity-80">
                    {fb.message}
                  </p>

                  {/* Reply */}
                  {fb.reply && (
                    <div className="mt-3 md:mt-4 p-3 md:p-5 rounded-[16px] md:rounded-[20px] bg-blue-500/5 border border-blue-500/10">
                      <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-[var(--color-primary-apple)] mb-2">
                        Ответ администрации
                      </p>
                      <p className="text-xs md:text-sm font-bold text-[var(--color-text-main)] leading-relaxed">
                        {fb.reply}
                      </p>
                    </div>
                  )}

                  {/* Date */}
                  <p className="text-[8px] md:text-[10px] font-bold text-[var(--color-text-muted)] mt-3 md:mt-4 uppercase tracking-wider">{date}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
