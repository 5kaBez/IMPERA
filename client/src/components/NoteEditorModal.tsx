import { useState, useEffect, useRef } from 'react';
import { X, Bell, BellOff, Trash2, Save } from 'lucide-react';
import { api } from '../api/client';
import type { Note } from '../types';

interface NoteEditorModalProps {
  lessonId?: number;
  lessonSubject?: string;
  lessonTimeStart?: string;
  date: string; // "2026-03-14"
  existingNote?: Note;
  onSave: (note: Note) => void;
  onDelete?: (noteId: number) => void;
  onClose: () => void;
}

type ReminderOption = 'none' | '30min' | '1hour' | 'evening' | 'custom';

export default function NoteEditorModal({
  lessonId,
  lessonSubject,
  lessonTimeStart,
  date,
  existingNote,
  onSave,
  onDelete,
  onClose,
}: NoteEditorModalProps) {
  const [title, setTitle] = useState(existingNote?.title || '');
  const [text, setText] = useState(existingNote?.text || '');
  const [reminder, setReminder] = useState<ReminderOption>(
    existingNote?.notifyAt ? 'custom' : 'none'
  );
  const [customTime, setCustomTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const overlayRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragCurrentY = useRef<number>(0);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
    document.body.style.overflow = 'hidden';
    // Auto-focus title
    setTimeout(() => titleRef.current?.focus(), 300);
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Init custom time from existing note
  useEffect(() => {
    if (existingNote?.notifyAt) {
      const d = new Date(existingNote.notifyAt);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      setCustomTime(`${hh}:${mm}`);
    }
  }, [existingNote]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 250);
  };

  // Drag-to-dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const diff = e.touches[0].clientY - dragStartY.current;
    dragCurrentY.current = Math.max(0, diff);
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${dragCurrentY.current}px)`;
    }
  };
  const handleTouchEnd = () => {
    if (dragCurrentY.current > 120) {
      handleClose();
    } else if (sheetRef.current) {
      sheetRef.current.style.transform = '';
    }
    dragStartY.current = null;
    dragCurrentY.current = 0;
  };

  const calcNotifyAt = (): string | null => {
    if (reminder === 'none') return null;

    const lessonDate = new Date(date + 'T00:00:00');

    if (reminder === '30min' && lessonTimeStart) {
      const [h, m] = lessonTimeStart.split(':').map(Number);
      lessonDate.setHours(h, m - 30);
      return lessonDate.toISOString();
    }

    if (reminder === '1hour' && lessonTimeStart) {
      const [h, m] = lessonTimeStart.split(':').map(Number);
      lessonDate.setHours(h - 1, m);
      return lessonDate.toISOString();
    }

    if (reminder === 'evening') {
      // Вечер накануне — 20:00 предыдущего дня
      const prev = new Date(lessonDate);
      prev.setDate(prev.getDate() - 1);
      prev.setHours(20, 0, 0, 0);
      return prev.toISOString();
    }

    if (reminder === 'custom' && customTime) {
      const [h, m] = customTime.split(':').map(Number);
      lessonDate.setHours(h, m, 0, 0);
      return lessonDate.toISOString();
    }

    return null;
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Введите заголовок');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const notifyAt = calcNotifyAt();

      if (existingNote) {
        // Обновление
        const data = await api.put<{ note: Note }>(`/notes/${existingNote.id}`, {
          title: title.trim(),
          text: text.trim() || null,
          notifyAt,
        });
        onSave(data.note);
      } else {
        // Создание
        const data = await api.post<{ note: Note }>('/notes', {
          lessonId: lessonId || null,
          date,
          title: title.trim(),
          text: text.trim() || null,
          notifyAt,
        });
        onSave(data.note);
      }
      handleClose();
    } catch (err) {
      console.error('Save note error:', err);
      setError('Ошибка сохранения');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!existingNote || !onDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/notes/${existingNote.id}`);
      onDelete(existingNote.id);
      handleClose();
    } catch (err) {
      console.error('Delete note error:', err);
      setError('Ошибка удаления');
    }
    setDeleting(false);
  };

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Overlay */}
      <div
        ref={overlayRef}
        onClick={handleClose}
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Bottom sheet */}
      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`absolute bottom-0 left-0 right-0 bg-[var(--color-bg-apple)] rounded-t-[32px] shadow-2xl border-t border-[var(--apple-border)] max-h-[85vh] overflow-y-auto transition-transform duration-300 ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Drag handle */}
        <div className="sticky top-0 z-10 bg-[var(--color-bg-apple)] rounded-t-[32px] pt-3 pb-2 px-4">
          <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-[var(--color-text-main)] tracking-tight">
              {existingNote ? 'Редактировать заметку' : 'Новая заметка'}
            </h2>
            <button onClick={handleClose} className="p-2 rounded-xl bg-black/5 dark:bg-white/5 active:scale-90 transition-transform">
              <X className="w-4 h-4 text-[var(--color-text-muted)]" />
            </button>
          </div>
          {lessonSubject && (
            <p className="text-[10px] font-bold text-[var(--color-text-muted)] opacity-50 uppercase tracking-wider mt-1">
              {lessonSubject}{lessonTimeStart ? ` · ${lessonTimeStart}` : ''}
            </p>
          )}
        </div>

        <div className="px-4 pb-8 pt-2 space-y-4">
          {/* Title */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)] opacity-60 mb-1.5 block">
              Заголовок *
            </label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Например: ДЗ — упр. 5-10"
              maxLength={100}
              className="w-full px-4 py-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--apple-border)] text-sm font-medium text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/40 transition-all outline-none"
            />
          </div>

          {/* Text */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)] opacity-60 mb-1.5 block">
              Описание
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Подробности, ссылки, задания..."
              maxLength={2000}
              rows={3}
              className="w-full px-4 py-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--apple-border)] text-sm font-medium text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/40 transition-all outline-none resize-none"
            />
          </div>

          {/* Reminder */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)] opacity-60 mb-2 block flex items-center gap-1.5">
              {reminder !== 'none' ? <Bell className="w-3 h-3 text-amber-500" /> : <BellOff className="w-3 h-3" />}
              Напоминание
            </label>
            <div className="flex flex-wrap gap-1.5">
              {([
                { val: 'none' as ReminderOption, label: 'Нет' },
                ...(lessonTimeStart ? [
                  { val: '30min' as ReminderOption, label: 'За 30 мин' },
                  { val: '1hour' as ReminderOption, label: 'За 1 час' },
                ] : []),
                { val: 'evening' as ReminderOption, label: 'Вечером' },
                { val: 'custom' as ReminderOption, label: 'Своё время' },
              ]).map(opt => (
                <button
                  key={opt.val}
                  onClick={() => setReminder(opt.val)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all duration-200 ${
                    reminder === opt.val
                      ? 'iron-metal-bg text-white shadow-md'
                      : 'bg-black/[0.04] dark:bg-white/[0.06] text-[var(--color-text-muted)] border border-[var(--apple-border)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {reminder === 'custom' && (
              <input
                type="time"
                value={customTime}
                onChange={e => setCustomTime(e.target.value)}
                className="mt-2 px-4 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--apple-border)] text-sm font-medium text-[var(--color-text-main)] outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-[11px] font-bold text-red-500 text-center">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {existingNote && onDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-bold active:scale-95 transition-transform disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deleting ? '...' : 'Удалить'}
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl iron-metal-bg text-white text-[12px] font-black uppercase tracking-wider shadow-lg active:scale-[0.97] transition-transform disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Сохранение...' : existingNote ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
