import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import type { User } from '../../types';
import { ArrowLeft, Users, ChevronLeft, ChevronRight, Search, Download } from 'lucide-react';

interface FullUser extends User {
  createdAt: string;
  updatedAt: string;
  group?: {
    id: number;
    name: string;
    number: number;
    course: number;
    studyForm: string;
    educationLevel: string;
    program?: {
      name: string;
      direction?: {
        name: string;
        institute?: {
          name: string;
        };
      };
    };
  };
}

interface UsersResponse {
  items: FullUser[];
  total: number;
}

export default function AdminUsers() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const limit = 30;

  useEffect(() => {
    setLoading(true);
    api.get<UsersResponse>(`/admin/users?page=${page}&limit=${limit}`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  // Client-side search filter
  const filteredItems = data?.items.filter(user => {
    if (!search) return true;
    const q = search.toLowerCase();
    const fullName = `${user.firstName} ${user.lastName || ''}`.toLowerCase();
    const username = (user.username || '').toLowerCase();
    const groupName = user.group?.name || '';
    const institute = user.group?.program?.direction?.institute?.name || '';
    return fullName.includes(q) || username.includes(q) || groupName.includes(q) || institute.includes(q);
  }) || [];

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/admin" className="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Данные пользователей</h1>
            {data && (
              <p className="text-sm text-gray-500">Всего: {data.total} пользователей</p>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Поиск по имени, username, группе, институту..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
        />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredItems.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1200px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-500 uppercase whitespace-nowrap">ID</th>
                    <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-500 uppercase whitespace-nowrap">Username</th>
                    <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-500 uppercase whitespace-nowrap">Форма обучения</th>
                    <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-500 uppercase whitespace-nowrap">Уровень</th>
                    <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-500 uppercase whitespace-nowrap">Курс</th>
                    <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-500 uppercase whitespace-nowrap">Институт</th>
                    <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-500 uppercase whitespace-nowrap">Направление</th>
                    <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-500 uppercase whitespace-nowrap">Программа</th>
                    <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-500 uppercase whitespace-nowrap">Группа</th>
                    <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-500 uppercase whitespace-nowrap">Дата регистрации</th>
                    <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-500 uppercase whitespace-nowrap">Обновлено</th>
                    <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-500 uppercase whitespace-nowrap">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(user => (
                    <tr key={user.id} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-3 py-3 text-gray-500 font-mono text-xs">
                        {user.telegramId}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                            {user.firstName[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100 text-xs whitespace-nowrap">
                              {user.firstName} {user.lastName || ''}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              {user.username ? `@${user.username}` : '—'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {user.group?.studyForm || '—'}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {user.group?.educationLevel || '—'}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-400 text-center">
                        {user.group?.course || '—'}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-[150px]">
                        <span className="block truncate" title={user.group?.program?.direction?.institute?.name || ''}>
                          {user.group?.program?.direction?.institute?.name || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-[140px]">
                        <span className="block truncate" title={user.group?.program?.direction?.name || ''}>
                          {user.group?.program?.direction?.name || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-[150px]">
                        <span className="block truncate" title={user.group?.program?.name || ''}>
                          {user.group?.program?.name || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {user.group ? (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                            {user.group.course} курс {user.group.number} гр.
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {user.createdAt ? formatDate(user.createdAt) : '—'}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {user.updatedAt ? formatDateTime(user.updatedAt) : '—'}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          user.role === 'admin'
                            ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}>
                          {user.role === 'admin' ? 'Админ' : 'Студент'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800">
                <p className="text-xs text-gray-500">
                  Показано {(page - 1) * limit + 1} — {Math.min(page * limit, data?.total || 0)} из {data?.total || 0}
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                          page === pageNum
                            ? 'bg-indigo-500 text-white'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
            <p className="text-gray-500">{search ? 'Ничего не найдено' : 'Пользователи не найдены'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
