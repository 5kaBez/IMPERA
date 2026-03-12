import React, { useEffect, useState } from 'react';
import { Download, RotateCcw, Trash2 } from 'lucide-react';
import { api } from '../api/client';

interface Backup {
  id: number;
  name: string;
  fileSize: number;
  userCount: number | null;
  groupCount: number | null;
  lessonCount: number | null;
  createdAt: string;
  source: string;
  restoredCount: number;
}

type StatusType = 'error' | 'success';

export function AdminBackup() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: StatusType; message: string } | null>(null);
  const [authInvalid, setAuthInvalid] = useState(false);

  useEffect(() => {
    loadBackups();
  }, []);

  const handleApiError = (error: any, fallback: string) => {
    const message = error?.message || fallback;
    if (error?.status === 401) {
      setAuthInvalid(true);
      setStatus({
        type: 'error',
        message: 'Недействительный токен. Перезапустите авторизацию через главную страницу.',
      });
      return;
    }
    setStatus({ type: 'error', message });
  };

  const loadBackups = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const data = await api.get<{ backups: Backup[] }>('/admin/backup/list');
      setBackups(data.backups || []);
    } catch (error) {
      handleApiError(error, 'Не удалось загрузить список бекапов');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setBusy('create');
    setStatus(null);
    try {
      await api.post('/admin/backup/create');
      setStatus({ type: 'success', message: 'Резервная копия создана' });
      await loadBackups();
    } catch (error) {
      handleApiError(error, 'Не удалось создать бекап');
    } finally {
      setBusy(null);
    }
  };

  const handleRestore = async (backup: Backup) => {
    if (!window.confirm(`⚠️ Это перезапишет данные из ${backup.name}. Продолжить?`)) {
      return;
    }
    if (!window.confirm('🔥 Последний шанс — все текущие данные будут заменены. Продолжить?')) {
      return;
    }

    setBusy(`restore-${backup.id}`);
    setStatus(null);
    try {
      const response = await api.post<{ message: string; requiresRestart?: boolean }>(
        `/admin/backup/restore/${backup.id}`,
        { confirm: true },
      );
      setStatus({ type: 'success', message: response.message || 'Данные восстановлены' });
      if (response.requiresRestart) {
        setStatus(prev => (prev ? { ...prev, message: prev.message + '. Перезапустите сервер' } : prev));
      }
    } catch (error) {
      handleApiError(error, 'Не удалось восстановить бекап');
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (backup: Backup) => {
    if (!window.confirm(`Удалить бекап "${backup.name}"?`)) {
      return;
    }

    setBusy(`delete-${backup.id}`);
    setStatus(null);
    try {
      await api.delete(`/admin/backup/${backup.id}`);
      setStatus({ type: 'success', message: 'Бекап удалён' });
      await loadBackups();
    } catch (error) {
      handleApiError(error, 'Не удалось удалить бекап');
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = async (backup: Backup) => {
    const token = api.getToken();
    if (!token) {
      setStatus({ type: 'error', message: 'Требуется авторизация' });
      return;
    }

    setBusy(`download-${backup.id}`);
    try {
      const response = await fetch(`/api/admin/backup/download/${backup.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Не удалось скачать файл' }));
        const error = new Error(payload.error || `HTTP ${response.status}`);
        (error as any).status = response.status;
        throw error;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = backup.name;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      handleApiError(error, 'Не удалось скачать файл');
    } finally {
      setBusy(null);
    }
  };

  const resetSession = () => {
    api.setToken(null);
    window.location.href = '/';
  };

  const isBusy = (key: string) => busy === key;

  const formatDate = (value: string) =>
    new Date(value).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const formatSize = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

  return (
    <div className="space-y-5">
      <div className="apple-card border border-[var(--apple-border)] rounded-[32px] p-5 md:p-8 shadow-xl bg-white/5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.4em] text-[var(--color-text-muted)] mb-1">
              Database Backups
            </p>
            <h3 className="text-lg md:text-2xl font-black text-[var(--color-text-main)]">Резервные копии</h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-1 md:max-w-xl">
              Ручной бекап сохраняет пользователей, расписание и все зависимые таблицы, а система автоматически снимает
              дамп каждый день в 12:00 и 00:00 МСК.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleCreateBackup}
              disabled={Boolean(authInvalid) || isBusy('create')}
              className="iron-metal-bg text-white px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-lg disabled:opacity-60"
            >
              {isBusy('create') ? 'Создание...' : 'Создать бекап'}
            </button>
            <p className="text-[9px] uppercase tracking-[0.3em] text-[var(--color-text-muted)]">Авто: 00:00 / 12:00 МСК</p>
          </div>
        </div>

        {authInvalid && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-red-500">
            <p>Недействительный токен. Переавторизуйтесь через главную страницу.</p>
            <button onClick={resetSession} className="text-blue-500 font-black underline">
              Сбросить сессию
            </button>
          </div>
        )}
      </div>

      {status && (
        <div
          className={`flex items-center justify-between gap-4 px-4 py-3 rounded-2xl border text-sm font-black ${
            status.type === 'error'
              ? 'bg-red-500/10 border-red-500/20 text-red-600'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
          }`}
        >
          <span>{status.message}</span>
          <button onClick={() => setStatus(null)} className="text-[var(--color-text-muted)]">
            ×
          </button>
        </div>
      )}

      <div className="apple-card border border-[var(--apple-border)] rounded-[28px] shadow-lg bg-white/5 overflow-hidden">
        {loading && backups.length === 0 ? (
          <div className="p-6 text-center text-[var(--color-text-muted)] uppercase tracking-[0.3em] text-[10px]">
            Загрузка...
          </div>
        ) : backups.length === 0 ? (
          <div className="p-10 text-center text-[var(--color-text-muted)] uppercase tracking-[0.35em] text-[10px]">
            Нет бекапов
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-text-muted)] bg-black/5">
                <tr>
                  <th className="px-4 py-3 text-left">Имя</th>
                  <th className="px-4 py-3 text-left">Создан</th>
                  <th className="px-4 py-3 text-center">Тип</th>
                  <th className="px-4 py-3 text-right">Размер</th>
                  <th className="px-4 py-3 text-center">Польз.</th>
                  <th className="px-4 py-3 text-center">Групп</th>
                  <th className="px-4 py-3 text-center">Пар</th>
                  <th className="px-4 py-3 text-center">Восстановлений</th>
                  <th className="px-4 py-3 text-center">Действия</th>
                </tr>
              </thead>
              <tbody>
                {backups.map(backup => (
                  <tr key={backup.id} className="border-t border-black/5">
                    <td className="px-4 py-3 text-xs font-mono text-[var(--color-text-main)]">{backup.name}</td>
                    <td className="px-4 py-3 text-[10px] text-[var(--color-text-muted)]">{formatDate(backup.createdAt)}</td>
                    <td className="px-4 py-3 text-center text-[10px]">{backup.source === 'auto' ? 'Авто' : 'Ручной'}</td>
                    <td className="px-4 py-3 text-right text-[10px]">{formatSize(backup.fileSize)}</td>
                    <td className="px-4 py-3 text-center">{backup.userCount || '—'}</td>
                    <td className="px-4 py-3 text-center">{backup.groupCount || '—'}</td>
                    <td className="px-4 py-3 text-center">{backup.lessonCount || '—'}</td>
                    <td className="px-4 py-3 text-center">{backup.restoredCount}x</td>
                    <td className="px-4 py-3 flex flex-wrap items-center justify-center gap-2">
                      <button
                        onClick={() => handleDownload(backup)}
                        disabled={Boolean(authInvalid) || isBusy(`download-${backup.id}`)}
                        className="rounded-full bg-blue-500/10 text-blue-500 p-2 transition-colors disabled:opacity-40"
                        aria-label="Скачать"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRestore(backup)}
                        disabled={Boolean(authInvalid) || isBusy(`restore-${backup.id}`)}
                        className="rounded-full bg-amber-500/10 text-amber-500 p-2 transition-colors disabled:opacity-40"
                        aria-label="Восстановить"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(backup)}
                        disabled={Boolean(authInvalid) || isBusy(`delete-${backup.id}`)}
                        className="rounded-full bg-red-500/10 text-red-500 p-2 transition-colors disabled:opacity-40"
                        aria-label="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminBackup;
