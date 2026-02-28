import { useState, useRef } from 'react';
import { api } from '../../api/client';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, ArrowLeft, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

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
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin" className="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Импорт расписания</h1>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        {/* Upload area */}
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all"
        >
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={e => { setFile(e.target.files?.[0] || null); setResult(null); setError(''); }}
            className="hidden"
          />
          {file ? (
            <>
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
              <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} КБ</p>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Нажмите для выбора файла
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Поддерживаются форматы: .xlsx, .xls, .csv
              </p>
            </>
          )}
        </div>

        {/* Format info */}
        <div className="mt-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">Формат файла</p>
          <p className="text-xs text-blue-500/80 leading-relaxed">
            17 столбцов: Форма обучения, Уровень, Курс, Институт, Направление, Программа,
            Группа, Номер группы, День недели, Номер пары, Время, Чётность, Предмет,
            Вид пары, Преподаватель, Аудитория, Недели
          </p>
        </div>

        {/* Import button */}
        <button
          onClick={handleImport}
          disabled={!file || loading}
          className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium hover:from-indigo-600 hover:to-purple-600 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/25"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Импорт...
            </span>
          ) : (
            'Импортировать'
          )}
        </button>

        {/* Result */}
        {result && (
          <div className="mt-4 p-4 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm font-semibold text-green-600 dark:text-green-400">Импорт завершён</span>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-3">
              <div className="text-center">
                <p className="text-lg font-bold text-green-600 dark:text-green-400">{result.imported}</p>
                <p className="text-xs text-green-500">Импортировано</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{result.skipped}</p>
                <p className="text-xs text-yellow-500">Пропущено</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-600 dark:text-gray-400">{result.total}</p>
                <p className="text-xs text-gray-500">Всего строк</p>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Delete Schedule Section */}
      <div className="mt-6 bg-white dark:bg-gray-900 rounded-2xl border border-red-200 dark:border-red-500/20 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Удалить расписание</h2>
        <p className="text-sm text-gray-500 mb-4">
          Удалить все записи расписания из базы данных перед загрузкой нового. Это необратимое действие.
        </p>

        {deleteResult && (
          <div className="mb-4 p-3 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-sm text-green-600 dark:text-green-400">
            {deleteResult}
          </div>
        )}

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-500/20 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            Удалить всё расписание
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                setDeleting(true);
                setDeleteResult(null);
                try {
                  const data = await api.delete<{ deleted: number }>('/admin/schedule/all');
                  setDeleteResult(`Удалено ${data.deleted} записей расписания`);
                } catch (err: any) {
                  setError(err.message);
                }
                setDeleting(false);
                setConfirmDelete(false);
              }}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-all disabled:opacity-50"
            >
              {deleting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Да, удалить всё
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
            >
              Отмена
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
