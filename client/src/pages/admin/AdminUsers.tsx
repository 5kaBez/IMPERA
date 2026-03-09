import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import type { User } from '../../types';
import { ArrowLeft, Users, ChevronLeft, ChevronRight, Search, Ban, ShieldCheck } from 'lucide-react';
import EmojiLoader from '../../components/EmojiLoader';

interface FullUser extends Omit<User, 'group'> {
  createdAt: string;
  updatedAt: string;
  banned?: boolean;
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
  const [banLoading, setBanLoading] = useState<number | null>(null);
  const limit = 30;

  const handleBan = async (userId: number, ban: boolean) => {
    setBanLoading(userId);
    try {
      await api.put(`/admin/users/${userId}/ban`, { banned: ban });
      setData(prev => prev ? {
        ...prev,
        items: prev.items.map(u => u.id === userId ? { ...u, banned: ban } : u),
      } : prev);
    } catch (err) {
      console.error('Ban error:', err);
    } finally {
      setBanLoading(null);
    }
  };

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
    <div className="pb-12">
      <div className="flex items-center justify-between mb-10 animate-in fade-in slide-in-from-top duration-700">
        <div className="flex items-center gap-4">
          <Link to="/admin" className="p-3 -ml-3 rounded-2xl bg-black/5 dark:bg-white/5 hover:scale-110 active:scale-90 transition-all">
            <ArrowLeft className="w-5 h-5 text-[var(--color-text-muted)]" />
          </Link>
          <div>
            <h1 className="text-4xl font-black text-[var(--color-text-main)] tracking-[-0.04em]">Пользователи</h1>
            {data && (
              <p className="text-base font-medium text-[var(--color-text-muted)] tracking-tight">Всего в базе: {data.total}</p>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-8 max-w-xl group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-[var(--color-primary-apple)] transition-colors" />
        <input
          type="text"
          placeholder="Поиск по имени, username, группе, институту..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-12 pr-6 py-4 rounded-[20px] bg-black/5 dark:bg-white/5 border border-[var(--apple-border)] text-base font-medium text-[var(--color-text-main)] placeholder-zinc-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-[var(--color-primary-apple)]/50 transition-all transition-duration-500"
        />
      </div>

      <div className="apple-glass rounded-[32px] border border-[var(--apple-border)] overflow-hidden shadow-2xl shadow-black/5 dark:shadow-white/5">
        {loading ? (
          <div className="py-20">
            <EmojiLoader />
          </div>
        ) : filteredItems.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1200px]">
                <thead>
                  <tr className="border-b border-[var(--apple-border)] bg-gray-50/50 dark:bg-gray-800/20">
                    <th className="text-left px-4 py-4 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest whitespace-nowrap">ID</th>
                    <th className="text-left px-4 py-4 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest whitespace-nowrap">Username</th>
                    <th className="text-left px-4 py-4 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest whitespace-nowrap">Форма обучения</th>
                    <th className="text-left px-4 py-4 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest whitespace-nowrap">Уровень</th>
                    <th className="text-left px-4 py-4 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest whitespace-nowrap">Курс</th>
                    <th className="text-left px-4 py-4 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest whitespace-nowrap">Институт</th>
                    <th className="text-left px-4 py-4 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest whitespace-nowrap">Направление</th>
                    <th className="text-left px-4 py-4 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest whitespace-nowrap">Программа</th>
                    <th className="text-left px-4 py-4 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest whitespace-nowrap">Группа</th>
                    <th className="text-left px-4 py-4 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest whitespace-nowrap">Дата регистрации</th>
                    <th className="text-left px-4 py-4 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest whitespace-nowrap">Обновлено</th>
                    <th className="text-left px-4 py-4 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest whitespace-nowrap">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(user => (
                    <tr key={user.id} className={`border-b border-[var(--apple-border)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${user.banned ? 'opacity-50 bg-red-500/5' : ''}`}>
                      <td className="px-4 py-4 text-[var(--color-text-muted)] font-mono text-[10px]">
                        {user.telegramId}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                            {user.firstName[0]}
                          </div>
                          <div>
                            <p className="font-bold text-[var(--color-text-main)] text-xs whitespace-nowrap">
                              {user.firstName} {user.lastName || ''}
                            </p>
                            <p className="text-[10px] font-medium text-[var(--color-text-muted)]">
                              {user.username ? `@${user.username}` : '—'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs font-medium text-[var(--color-text-main)] whitespace-nowrap">
                        {user.group?.studyForm || '—'}
                      </td>
                      <td className="px-4 py-4 text-xs font-medium text-[var(--color-text-main)] whitespace-nowrap">
                        {user.group?.educationLevel || '—'}
                      </td>
                      <td className="px-4 py-4 text-xs font-bold text-[var(--color-text-main)] text-center">
                        {user.group?.course || '—'}
                      </td>
                      <td className="px-4 py-4 text-xs font-medium text-[var(--color-text-main)] max-w-[150px]">
                        <span className="block truncate" title={user.group?.program?.direction?.institute?.name || ''}>
                          {user.group?.program?.direction?.institute?.name || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs font-medium text-[var(--color-text-main)] max-w-[140px]">
                        <span className="block truncate" title={user.group?.program?.direction?.name || ''}>
                          {user.group?.program?.direction?.name || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs font-medium text-[var(--color-text-main)] max-w-[150px]">
                        <span className="block truncate" title={user.group?.program?.name || ''}>
                          {user.group?.program?.name || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {user.group ? (
                          <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-500 whitespace-nowrap uppercase tracking-wider">
                            {user.group.course}к {user.group.number}гр
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--color-text-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-[10px] font-bold text-[var(--color-text-muted)] whitespace-nowrap uppercase tracking-wider">
                        {user.createdAt ? formatDate(user.createdAt) : '—'}
                      </td>
                      <td className="px-4 py-4 text-[10px] font-bold text-[var(--color-text-muted)] whitespace-nowrap uppercase tracking-wider">
                        {user.updatedAt ? formatDateTime(user.updatedAt) : '—'}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                            user.banned
                              ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                              : user.role === 'admin'
                                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                : 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'
                          }`}>
                            {user.banned ? 'Бан' : user.role === 'admin' ? 'Админ' : 'Студент'}
                          </span>
                          {user.role !== 'admin' && (
                            <button
                              onClick={() => handleBan(user.id, !user.banned)}
                              disabled={banLoading === user.id}
                              className={`p-1.5 rounded-lg transition-all hover:scale-110 active:scale-90 ${
                                user.banned
                                  ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                                  : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                              } disabled:opacity-30`}
                              title={user.banned ? 'Разбанить' : 'Забанить'}
                            >
                              {banLoading === user.id ? (
                                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : user.banned ? (
                                <ShieldCheck className="w-3.5 h-3.5" />
                              ) : (
                                <Ban className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--apple-border)]">
                <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">
                  {(page - 1) * limit + 1} — {Math.min(page * limit, data?.total || 0)} OF {data?.total || 0}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-2.5 rounded-xl apple-glass border border-[var(--apple-border)] disabled:opacity-20 transition-all hover:scale-105 active:scale-95"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex gap-1.5">
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
                          className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${page === pageNum
                            ? 'bg-[var(--color-primary-apple)] text-white shadow-lg shadow-blue-500/30'
                            : 'apple-glass border border-[var(--apple-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-2.5 rounded-xl apple-glass border border-[var(--apple-border)] disabled:opacity-20 transition-all hover:scale-105 active:scale-95"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <Users className="w-16 h-16 mx-auto mb-4 text-zinc-300" />
            <p className="text-lg font-bold text-[var(--color-text-muted)]">{search ? 'Ничего не найдено' : 'Пользователи не найдены'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
