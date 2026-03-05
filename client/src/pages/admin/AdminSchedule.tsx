import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import type { Lesson } from '../../types';
import { DAY_NAMES } from '../../types';
import { ArrowLeft, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import EmojiLoader from '../../components/EmojiLoader';

interface LessonsResponse {
  items: Lesson[];
  total: number;
  page: number;
  totalPages: number;
}

export default function AdminSchedule() {
  const [data, setData] = useState<LessonsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [groupId, setGroupId] = useState('');

  const fetchLessons = async (p = page) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: '30' });
    if (groupId) params.set('groupId', groupId);
    const result = await api.get<LessonsResponse>(`/admin/lessons?${params}`);
    setData(result);
    setLoading(false);
  };

  useEffect(() => { fetchLessons(); }, [page]);

  const handleSearch = () => { setPage(1); fetchLessons(1); };

  return (
    <div className="pb-12">
      <div className="flex items-center gap-4 mb-10 animate-in fade-in slide-in-from-top duration-700">
        <Link to="/admin" className="p-3 -ml-3 rounded-2xl bg-black/5 dark:bg-white/5 hover:scale-110 active:scale-90 transition-all">
          <ArrowLeft className="w-5 h-5 text-[var(--color-text-muted)]" />
        </Link>
        <h1 className="text-4xl font-black text-[var(--color-text-main)] tracking-[-0.04em]">Редактор расписания</h1>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-10 max-w-2xl group">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-[var(--color-primary-apple)] transition-colors" />
          <input
            type="text"
            placeholder="Введите ID группы (например, 1234)..."
            value={groupId}
            onChange={e => setGroupId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="w-full pl-12 pr-6 py-4 rounded-[20px] bg-black/5 dark:bg-white/5 border border-[var(--apple-border)] text-base font-medium text-[var(--color-text-main)] placeholder-zinc-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-[var(--color-primary-apple)]/50 transition-all duration-500"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-8 py-4 rounded-[20px] bg-[var(--color-primary-apple)] text-white text-sm font-black uppercase tracking-widest hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/25 transition-all"
        >
          Найти
        </button>
      </div>

      {/* Table */}
      <div className="apple-glass rounded-[32px] border border-[var(--apple-border)] overflow-hidden shadow-2xl shadow-black/5 dark:shadow-white/5">
        {loading ? (
          <div className="py-20">
            <EmojiLoader />
          </div>
        ) : data && data.items.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--apple-border)] bg-gray-50/50 dark:bg-gray-800/20">
                    <th className="text-left px-5 py-4 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">День</th>
                    <th className="text-left px-5 py-4 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest text-center">Пара</th>
                    <th className="text-left px-5 py-4 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Время</th>
                    <th className="text-left px-5 py-4 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Предмет</th>
                    <th className="text-left px-5 py-4 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Тип</th>
                    <th className="text-left px-5 py-4 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Учитель</th>
                    <th className="text-left px-5 py-4 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Ауд.</th>
                    <th className="text-left px-5 py-4 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Чётн.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map(lesson => (
                    <tr key={lesson.id} className="border-b border-[var(--apple-border)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <td className="px-5 py-4 text-xs font-black text-blue-500 uppercase tracking-tighter">{DAY_NAMES[lesson.dayOfWeek]?.slice(0, 2)}</td>
                      <td className="px-5 py-4 text-xs font-bold text-[var(--color-text-main)] text-center">{lesson.pairNumber}</td>
                      <td className="px-5 py-4 text-[10px] font-bold text-[var(--color-text-muted)]">{lesson.timeStart}—{lesson.timeEnd}</td>
                      <td className="px-5 py-4 font-bold text-[var(--color-text-main)] max-w-[200px] truncate tracking-tight">{lesson.subject}</td>
                      <td className="px-5 py-4 text-xs font-medium text-[var(--color-text-muted)]">
                        <span className="px-2 py-0.5 rounded-full bg-zinc-500/10 border border-zinc-500/10 text-[10px] uppercase font-black tracking-widest">
                          {lesson.lessonType}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs font-medium text-[var(--color-text-muted)] max-w-[150px] truncate">{lesson.teacher}</td>
                      <td className="px-5 py-4 text-xs font-black text-[var(--color-text-main)]">{lesson.room}</td>
                      <td className="px-5 py-4">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${lesson.parity === 0
                          ? 'bg-blue-500/10 text-blue-500'
                          : lesson.parity === 1
                            ? 'bg-purple-500/10 text-purple-500'
                            : 'bg-zinc-500/10 text-zinc-500'
                          }`}>
                          {lesson.parity === 0 ? 'Парная' : lesson.parity === 1 ? 'Нечётная' : 'Всегда'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-5 border-t border-[var(--apple-border)]">
              <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">
                {data.total} записей · страница {data.page} из {data.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-3 rounded-xl apple-glass border border-[var(--apple-border)] disabled:opacity-20 transition-all hover:scale-110 active:scale-90"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                  disabled={page >= data.totalPages}
                  className="p-3 rounded-xl apple-glass border border-[var(--apple-border)] disabled:opacity-20 transition-all hover:scale-110 active:scale-90"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <Search className="w-16 h-16 mx-auto mb-4 text-zinc-300" />
            <p className="text-lg font-bold text-[var(--color-text-muted)]">Записи не найдены</p>
          </div>
        )}
      </div>
    </div>
  );
}
