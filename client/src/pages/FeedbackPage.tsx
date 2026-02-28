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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Обратная связь</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Помогите нам стать лучше
        </p>
      </div>

      {/* Submit Form / Success */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 mb-6">
        {submitted ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-green-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
              Спасибо!
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Ваше обращение отправлено. Мы рассмотрим его в ближайшее время.
            </p>
            <button
              onClick={handleNewFeedback}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              Написать ещё
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Type Selector */}
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Тип обращения
            </label>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {FEEDBACK_TYPES.map(ft => {
                const Icon = ft.icon;
                const selected = type === ft.value;
                return (
                  <button
                    key={ft.value}
                    type="button"
                    onClick={() => setType(ft.value)}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                      selected
                        ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 shadow-sm shadow-indigo-500/10'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${selected ? 'text-indigo-500' : ft.color}`} />
                    {ft.label}
                  </button>
                );
              })}
            </div>

            {/* Message */}
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Сообщение
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Опишите подробнее..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all"
            />

            {/* Error */}
            {error && (
              <p className="text-sm text-red-500 mt-2">{error}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !message.trim()}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Отправить
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Previous Feedback */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 px-1 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-gray-400" />
          Мои обращения
        </h2>

        {loadingList ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : feedbackList.length === 0 ? (
          <div className="text-center py-10">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
            <p className="text-sm text-gray-400 dark:text-gray-500">
              У вас пока нет обращений
            </p>
          </div>
        ) : (
          <div className="space-y-3">
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
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 transition-all"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center`}>
                        <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {cfg.label}
                      </span>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${status.className}`}>
                      {status.label}
                    </span>
                  </div>

                  {/* Message */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-2">
                    {fb.message}
                  </p>

                  {/* Reply */}
                  {fb.reply && (
                    <div className="mt-2 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
                      <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">
                        Ответ администрации
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {fb.reply}
                      </p>
                    </div>
                  )}

                  {/* Date */}
                  <p className="text-[11px] text-gray-400 mt-2">{date}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
