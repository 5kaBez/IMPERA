import { useState, useRef } from 'react';
import { api } from '../../api/client';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, ArrowLeft, Trash2, RotateCcw, UserX } from 'lucide-react';
import { Link } from 'react-router-dom';
import EmojiLoader from '../../components/EmojiLoader';

interface ImportResult {
  imported: number;
  skipped: number;
  total: number;
  stats?: Record<string, Record<string, number>>;
}

export default function AdminImport() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [cleaningGhosts, setCleaningGhosts] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [deleteResult, setDeleteResult] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [ghostResult, setGhostResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await api.upload<ImportResult>('/admin/import', file);
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanGhosts = async () => {
    setCleaningGhosts(true);
    setGhostResult(null);
    try {
      const data = await api.delete<{ deleted: number }>('/admin/teachers/ghost');
      setGhostResult(data.deleted > 0 ? `Удалено ${data.deleted} пустых записей` : 'Пустых записей нет');
    } catch (err: any) {
      setError(err.message);
    }
    setCleaningGhosts(false);
  };

  return (
    <div className="pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-10 animate-in fade-in slide-in-from-top duration-700">
        <Link to="/admin" className="p-2.5 md:p-3 -ml-2 md:-ml-3 rounded-xl md:rounded-2xl bg-black/5 dark:bg-white/5 hover:scale-110 active:scale-90 transition-all">
          <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-[var(--color-text-muted)]" />
        </Link>
        <h1 className="text-2xl md:text-4xl font-black text-[var(--color-text-main)] tracking-[-0.04em]">Импорт</h1>
      </div>

      {/* Upload card */}
      <div className="apple-glass rounded-2xl md:rounded-[32px] border border-[var(--apple-border)] p-4 md:p-8 shadow-xl md:shadow-2xl shadow-black/5 dark:shadow-white/5">
        {/* Upload area */}
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl md:rounded-[24px] p-6 md:p-12 text-center cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group duration-500"
        >
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={e => { setFile(e.target.files?.[0] || null); setResult(null); setError(''); }}
            className="hidden"
          />
          {file ? (
            <div className="animate-in zoom-in duration-500">
              <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-[24px] bg-emerald-500/10 flex items-center justify-center mx-auto mb-3 md:mb-5 shadow-xl shadow-emerald-500/10">
                <FileSpreadsheet className="w-7 h-7 md:w-10 md:h-10 text-emerald-500" />
              </div>
              <p className="text-sm md:text-lg font-black text-[var(--color-text-main)] tracking-tight">{file.name}</p>
              <p className="text-[9px] md:text-xs font-bold text-[var(--color-text-muted)] mt-1 uppercase tracking-widest">{(file.size / 1024).toFixed(1)} KB · READY</p>
            </div>
          ) : (
            <>
              <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-[24px] bg-zinc-500/10 flex items-center justify-center mx-auto mb-3 md:mb-5 group-hover:scale-110 group-hover:bg-blue-500/10 transition-all duration-500">
                <Upload className="w-7 h-7 md:w-10 md:h-10 text-zinc-400 group-hover:text-blue-500 transition-colors" />
              </div>
              <p className="text-sm md:text-lg font-black text-[var(--color-text-main)] tracking-tight">
                Выберите файл
              </p>
              <p className="text-[9px] md:text-xs font-bold text-[var(--color-text-muted)] mt-1 uppercase tracking-widest">
                XLSX, XLS, CSV · MAX 10MB
              </p>
            </>
          )}
        </div>

        {/* Format info */}
        <div className="mt-4 md:mt-8 p-4 md:p-6 rounded-2xl md:rounded-[24px] bg-blue-500/5 border border-blue-500/10">
          <p className="text-[9px] md:text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 md:mb-3">Структура колонок (17 шт.)</p>
          <p className="text-[10px] md:text-xs font-medium text-blue-600/80 dark:text-blue-400/80 leading-relaxed tracking-tight">
            Форма обучения, Уровень, Курс, Институт, Направление, Программа,
            Группа, Номер группы, День недели, Номер пары, Время, Чётность, Предмет,
            Вид пары, Преподаватель, Аудитория, Недели
          </p>
        </div>

        {/* Import button */}
        <button
          onClick={handleImport}
          disabled={!file || loading}
          className="mt-4 md:mt-8 w-full py-4 md:py-5 rounded-2xl md:rounded-[20px] bg-[var(--color-primary-apple)] text-white text-xs md:text-sm font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 shadow-xl md:shadow-2xl shadow-blue-500/25 transition-all disabled:opacity-30 disabled:scale-100"
        >
          {loading ? (
            <div className="flex flex-col items-center gap-2">
              <EmojiLoader />
            </div>
          ) : (
            'НАЧАТЬ ИМПОРТ'
          )}
        </button>

        {/* Result */}
        {result && (
          <div className="mt-4 md:mt-8 p-4 md:p-6 rounded-2xl md:rounded-[24px] bg-emerald-500/5 border border-emerald-500/10 animate-in slide-in-from-bottom duration-700">
            <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-5">
              <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-emerald-500" />
              <span className="text-sm md:text-base font-black text-emerald-600 dark:text-emerald-400 tracking-tight">Импорт завершён</span>
            </div>
            <div className="grid grid-cols-3 gap-2 md:gap-6">
              <div className="bg-emerald-500/10 p-3 md:p-4 rounded-xl md:rounded-2xl text-center">
                <p className="text-xl md:text-2xl font-black text-emerald-600 tracking-tighter">{result.imported}</p>
                <p className="text-[8px] md:text-[9px] font-bold text-emerald-500 uppercase tracking-[0.1em]">УСПЕШНО</p>
              </div>
              <div className="bg-amber-500/10 p-3 md:p-4 rounded-xl md:rounded-2xl text-center">
                <p className="text-xl md:text-2xl font-black text-amber-600 tracking-tighter">{result.skipped}</p>
                <p className="text-[8px] md:text-[9px] font-bold text-amber-500 uppercase tracking-[0.1em]">ПРОПУЩЕНО</p>
              </div>
              <div className="bg-zinc-500/10 p-3 md:p-4 rounded-xl md:rounded-2xl text-center">
                <p className="text-xl md:text-2xl font-black text-[var(--color-text-main)] tracking-tighter">{result.total}</p>
                <p className="text-[8px] md:text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-[0.1em]">ВСЕГО</p>
              </div>
            </div>

            {/* Import stats by education level & day */}
            {result.stats && Object.keys(result.stats).length > 0 && (
              <div className="mt-4 space-y-3">
                <p className="text-[9px] md:text-[10px] font-black text-emerald-500 uppercase tracking-widest">Пары по дням</p>
                {Object.entries(result.stats).map(([level, days]) => (
                  <div key={level} className="p-3 rounded-xl bg-white/50 dark:bg-black/20 border border-emerald-500/10">
                    <p className="text-[10px] md:text-xs font-black text-[var(--color-text-main)] mb-2">{level}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => {
                        const count = days[day] || 0;
                        return (
                          <div key={day} className={`px-2 py-1 rounded-lg text-[9px] md:text-[10px] font-bold ${count > 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-zinc-500/5 text-zinc-400'}`}>
                            {day}: {count}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 md:mt-8 p-4 md:p-6 rounded-2xl md:rounded-[24px] bg-red-500/5 border border-red-500/10 animate-in shake duration-500">
            <div className="flex items-center gap-2 md:gap-3">
              <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-red-500 flex-shrink-0" />
              <span className="text-xs md:text-sm font-bold text-red-600 dark:text-red-400 tracking-tight">{error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Ghost teacher cleanup */}
      <div className="mt-6 md:mt-10 apple-glass rounded-2xl md:rounded-[32px] border border-[var(--apple-border)] p-4 md:p-8 shadow-xl">
        <div className="flex items-start justify-between mb-4 md:mb-6">
          <div className="max-w-xs md:max-w-md">
            <h2 className="text-base md:text-xl font-black text-[var(--color-text-main)] tracking-tight mb-1 md:mb-2">Очистка преподавателей</h2>
            <p className="text-xs md:text-sm font-medium text-[var(--color-text-muted)] tracking-tight">
              Удаляет записи преподавателей без отзывов (ghost-записи).
            </p>
          </div>
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
            <UserX className="w-5 h-5 md:w-6 md:h-6 text-violet-500" />
          </div>
        </div>

        {ghostResult && (
          <div className="mb-4 p-3 md:p-4 rounded-xl md:rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-xs md:text-sm font-bold text-emerald-600 tracking-tight">
            {ghostResult}
          </div>
        )}

        <button
          onClick={handleCleanGhosts}
          disabled={cleaningGhosts}
          className="px-6 py-3 md:px-8 md:py-4 rounded-xl md:rounded-[18px] text-[10px] md:text-[11px] font-black uppercase tracking-widest text-violet-500 bg-violet-500/5 border border-violet-500/20 hover:bg-violet-500/10 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          {cleaningGhosts ? (
            <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            'Очистить'
          )}
        </button>
      </div>

      {/* Delete Schedule Section */}
      <div className="mt-6 md:mt-10 apple-glass rounded-2xl md:rounded-[32px] border border-red-500/10 p-4 md:p-8 shadow-xl">
        <div className="flex items-start justify-between mb-4 md:mb-6">
          <div className="max-w-xs md:max-w-md">
            <h2 className="text-base md:text-xl font-black text-[var(--color-text-main)] tracking-tight mb-1 md:mb-2">Удаление расписания</h2>
            <p className="text-xs md:text-sm font-medium text-[var(--color-text-muted)] tracking-tight">
              Удаляет только уроки. Структура и пользователи сохраняются.
            </p>
          </div>
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-red-500/10 flex items-center justify-center flex-shrink-0 animate-pulse">
            <Trash2 className="w-5 h-5 md:w-6 md:h-6 text-red-500" />
          </div>
        </div>

        {deleteResult && (
          <div className="mb-4 md:mb-6 p-3 md:p-4 rounded-xl md:rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-xs md:text-sm font-bold text-emerald-600 tracking-tight">
            {deleteResult}
          </div>
        )}

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-6 py-3 md:px-8 md:py-4 rounded-xl md:rounded-[18px] text-[10px] md:text-[11px] font-black uppercase tracking-widest text-red-500 bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 transition-all hover:scale-105 active:scale-95"
          >
            Удалить расписание
          </button>
        ) : (
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={async () => {
                setDeleting(true);
                setDeleteResult(null);
                try {
                  const data = await api.delete<{ deleted: number }>('/admin/schedule/all');
                  setDeleteResult(`Удалено: ${data.deleted} записей`);
                } catch (err: any) {
                  setError(err.message);
                }
                setDeleting(false);
                setConfirmDelete(false);
              }}
              disabled={deleting}
              className="px-5 py-3 md:px-8 md:py-4 rounded-xl md:rounded-[18px] text-[10px] md:text-[11px] font-black uppercase tracking-widest text-white bg-red-500 shadow-xl shadow-red-500/20 hover:bg-red-600 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {deleting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'ДА, УДАЛИТЬ'
              )}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-5 py-3 md:px-8 md:py-4 rounded-xl md:rounded-[18px] text-[10px] md:text-[11px] font-black uppercase tracking-widest text-[var(--color-text-muted)] apple-glass border border-[var(--apple-border)] hover:bg-black/5 transition-all hover:scale-105 active:scale-95"
            >
              ОТМЕНА
            </button>
          </div>
        )}
      </div>

      {/* FULL RESET Section */}
      <div className="mt-6 md:mt-10 apple-glass rounded-2xl md:rounded-[32px] border border-orange-500/20 p-4 md:p-8 shadow-xl">
        <div className="flex items-start justify-between mb-4 md:mb-6">
          <div className="max-w-xs md:max-w-md">
            <h2 className="text-base md:text-xl font-black text-[var(--color-text-main)] tracking-tight mb-1 md:mb-2">Полный сброс</h2>
            <p className="text-xs md:text-sm font-medium text-[var(--color-text-muted)] tracking-tight">
              Удаляет ВСЁ: уроки, группы, программы, направления, институты.
            </p>
            <div className="mt-2 md:mt-3 p-2 md:p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
              <p className="text-[10px] md:text-xs font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
                ✅ Пользователи сохраняются! Только отвязываются от групп.
              </p>
            </div>
          </div>
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
            <RotateCcw className="w-5 h-5 md:w-6 md:h-6 text-orange-500" />
          </div>
        </div>

        {resetResult && (
          <div className="mb-4 md:mb-6 p-3 md:p-4 rounded-xl md:rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-xs md:text-sm font-bold text-emerald-600 tracking-tight">
            {resetResult}
          </div>
        )}

        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            className="px-6 py-3 md:px-8 md:py-4 rounded-xl md:rounded-[18px] text-[10px] md:text-[11px] font-black uppercase tracking-widest text-orange-500 bg-orange-500/5 border border-orange-500/20 hover:bg-orange-500/10 transition-all hover:scale-105 active:scale-95"
          >
            Полный сброс
          </button>
        ) : (
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={async () => {
                setResetting(true);
                setResetResult(null);
                setError('');
                try {
                  const data = await api.delete<{ deleted: number; details: Record<string, number> }>('/admin/schedule/reset');
                  const d = (data as any).details || {};
                  setResetResult(`Сброс выполнен! Удалено: ${d.lessons || 0} уроков, ${d.groups || 0} групп, ${d.institutes || 0} институтов`);
                } catch (err: any) {
                  setError(err.message);
                }
                setResetting(false);
                setConfirmReset(false);
              }}
              disabled={resetting}
              className="px-5 py-3 md:px-8 md:py-4 rounded-xl md:rounded-[18px] text-[10px] md:text-[11px] font-black uppercase tracking-widest text-white bg-orange-500 shadow-xl shadow-orange-500/20 hover:bg-orange-600 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {resetting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'ДА, СБРОС!'
              )}
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              className="px-5 py-3 md:px-8 md:py-4 rounded-xl md:rounded-[18px] text-[10px] md:text-[11px] font-black uppercase tracking-widest text-[var(--color-text-muted)] apple-glass border border-[var(--apple-border)] hover:bg-black/5 transition-all hover:scale-105 active:scale-95"
            >
              ОТМЕНА
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
