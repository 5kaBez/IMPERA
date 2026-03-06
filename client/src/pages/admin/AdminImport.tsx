import { useState, useRef } from 'react';
import { api } from '../../api/client';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, ArrowLeft, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import EmojiLoader from '../../components/EmojiLoader';

interface ImportResult {
  imported: number;
  skipped: number;
  total: number;
}

export default function AdminImport() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [deleteResult, setDeleteResult] = useState<string | null>(null);
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

  return (
    <div className="pb-12">
      <div className="flex items-center gap-4 mb-10 animate-in fade-in slide-in-from-top duration-700">
        <Link to="/admin" className="p-3 -ml-3 rounded-2xl bg-black/5 dark:bg-white/5 hover:scale-110 active:scale-90 transition-all">
          <ArrowLeft className="w-5 h-5 text-[var(--color-text-muted)]" />
        </Link>
        <h1 className="text-4xl font-black text-[var(--color-text-main)] tracking-[-0.04em]">Импорт расписания</h1>
      </div>

      <div className="apple-glass rounded-[32px] border border-[var(--apple-border)] p-8 shadow-2xl shadow-black/5 dark:shadow-white/5">
        {/* Upload area */}
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[24px] p-12 text-center cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group duration-500"
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
              <div className="w-20 h-20 rounded-[24px] bg-emerald-500/10 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-emerald-500/10">
                <FileSpreadsheet className="w-10 h-10 text-emerald-500" />
              </div>
              <p className="text-lg font-black text-[var(--color-text-main)] tracking-tight">{file.name}</p>
              <p className="text-xs font-bold text-[var(--color-text-muted)] mt-1 uppercase tracking-widest">{(file.size / 1024).toFixed(1)} KB · READY TO IMPORT</p>
            </div>
          ) : (
            <>
              <div className="w-20 h-20 rounded-[24px] bg-zinc-500/10 flex items-center justify-center mx-auto mb-5 group-hover:scale-110 group-hover:bg-blue-500/10 transition-all duration-500">
                <Upload className="w-10 h-10 text-zinc-400 group-hover:text-blue-500 transition-colors" />
              </div>
              <p className="text-lg font-black text-[var(--color-text-main)] tracking-tight">
                Выберите файл расписания
              </p>
              <p className="text-xs font-bold text-[var(--color-text-muted)] mt-1 uppercase tracking-widest">
                XLSX, XLS, CSV · MAX 10MB
              </p>
            </>
          )}
        </div>

        {/* Format info */}
        <div className="mt-8 p-6 rounded-[24px] bg-blue-500/5 border border-blue-500/10">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3">Структура колонок (17 шт.)</p>
          <p className="text-xs font-medium text-blue-600/80 dark:text-blue-400/80 leading-relaxed tracking-tight">
            Форма обучения, Уровень, Курс, Институт, Направление, Программа,
            Группа, Номер группы, День недели, Номер пары, Время, Чётность, Предмет,
            Вид пары, Преподаватель, Аудитория, Недели
          </p>
        </div>

        {/* Import button */}
        <button
          onClick={handleImport}
          disabled={!file || loading}
          className="mt-8 w-full py-5 rounded-[20px] bg-[var(--color-primary-apple)] text-white text-sm font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 shadow-2xl shadow-blue-500/25 transition-all disabled:opacity-30 disabled:scale-100"
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
          <div className="mt-8 p-6 rounded-[24px] bg-emerald-500/5 border border-emerald-500/10 animate-in slide-in-from-bottom duration-700">
            <div className="flex items-center gap-3 mb-5">
              <CheckCircle className="w-6 h-6 text-emerald-500" />
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400 tracking-tight">Импорт успешно завершён</span>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-emerald-500/10 p-4 rounded-2xl">
                <p className="text-2xl font-black text-emerald-600 tracking-tighter">{result.imported}</p>
                <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-[0.1em]">УСПЕШНО</p>
              </div>
              <div className="bg-amber-500/10 p-4 rounded-2xl">
                <p className="text-2xl font-black text-amber-600 tracking-tighter">{result.skipped}</p>
                <p className="text-[9px] font-bold text-amber-500 uppercase tracking-[0.1em]">ПРОПУЩЕНО</p>
              </div>
              <div className="bg-zinc-500/10 p-4 rounded-2xl">
                <p className="text-2xl font-black text-[var(--color-text-main)] tracking-tighter">{result.total}</p>
                <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-[0.1em]">ВСЕГО</p>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-8 p-6 rounded-[24px] bg-red-500/5 border border-red-500/10 animate-in shake duration-500">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <span className="text-sm font-bold text-red-600 dark:text-red-400 tracking-tight">{error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Delete Schedule Section */}
      <div className="mt-10 apple-glass rounded-[32px] border border-red-500/10 p-8 shadow-xl">
        <div className="flex items-start justify-between mb-6">
          <div className="max-w-md">
            <h2 className="text-xl font-black text-[var(--color-text-main)] tracking-tight mb-2">Удаление расписания</h2>
            <p className="text-sm font-medium text-[var(--color-text-muted)] tracking-tight">
              Удаляет только уроки (расписание). Структура (институты, направления, программы, группы) и данные пользователей сохраняются.
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center flex-shrink-0 animate-pulse">
            <Trash2 className="w-6 h-6 text-red-500" />
          </div>
        </div>

        {deleteResult && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-sm font-bold text-emerald-600 tracking-tight">
            {deleteResult}
          </div>
        )}

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-8 py-4 rounded-[18px] text-[11px] font-black uppercase tracking-widest text-red-500 bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 transition-all hover:scale-105 active:scale-95"
          >
            Удалить всё расписание
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <button
              onClick={async () => {
                setDeleting(true);
                setDeleteResult(null);
                try {
                  const data = await api.delete<{ deleted: number }>('/admin/schedule/all');
                  setDeleteResult(`Удалено успешно: ${data.deleted} записей`);
                } catch (err: any) {
                  setError(err.message);
                }
                setDeleting(false);
                setConfirmDelete(false);
              }}
              disabled={deleting}
              className="px-8 py-4 rounded-[18px] text-[11px] font-black uppercase tracking-widest text-white bg-red-500 shadow-xl shadow-red-500/20 hover:bg-red-600 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {deleting ? (
                <div className="w-4 h-4 border-3 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'ДА, Я УВЕРЕН'
              )}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-8 py-4 rounded-[18px] text-[11px] font-black uppercase tracking-widest text-[var(--color-text-muted)] apple-glass border border-[var(--apple-border)] hover:bg-black/5 transition-all hover:scale-105 active:scale-95"
            >
              ОЙ, ОТМЕНА
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
