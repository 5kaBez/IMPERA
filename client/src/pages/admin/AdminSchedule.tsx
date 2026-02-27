import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import type { Lesson } from '../../types';
import { DAY_NAMES } from '../../types';
import { ArrowLeft, Search, ChevronLeft, ChevronRight, Trash2, Edit3 } from 'lucide-react';

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
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin" className="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Управление расписанием</h1>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="ID группы..."
            value={groupId}
            onChange={e => setGroupId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>
        <button onClick={handleSearch} className="px-4 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-all">
          Поиск
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data && data.items.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">День</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Пара</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Время</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Предмет</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Тип</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Преподаватель</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ауд.</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Чётн.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map(lesson => (
                    <tr key={lesson.id} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{DAY_NAMES[lesson.dayOfWeek]?.slice(0, 2)}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{lesson.pairNumber}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{lesson.timeStart}-{lesson.timeEnd}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 max-w-[200px] truncate">{lesson.subject}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{lesson.lessonType}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[150px] truncate">{lesson.teacher}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{lesson.room}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {lesson.parity === 0 ? 'Ч' : lesson.parity === 1 ? 'Н' : 'Все'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800">
              <p className="text-xs text-gray-500">
                {data.total} записей — страница {data.page} из {data.totalPages}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(data!.totalPages, p + 1))}
                  disabled={page >= (data?.totalPages || 1)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">Записи не найдены</p>
          </div>
        )}
      </div>
    </div>
  );
}
