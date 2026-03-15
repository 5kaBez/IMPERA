import { useState, useEffect, useRef } from 'react';
import { X, Bell, Users, Pencil, Paperclip, Download, FileText, Image } from 'lucide-react';
import type { Note, NoteAttachment } from '../types';
import UserAvatar from './UserAvatar';

interface NoteViewerModalProps {
  note: Note;
  currentUserId?: number;
  onEdit?: () => void;    // only shown if user is owner
  onClose: () => void;
}

export default function NoteViewerModal({ note, currentUserId, onEdit, onClose }: NoteViewerModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragCurrentY = useRef<number>(0);

  const isOwner = note.userId === currentUserId;

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

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

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1048576) return `${(size / 1024).toFixed(0)} KB`;
    return `${(size / 1048576).toFixed(1)} MB`;
  };

  const handleDownload = (att: NoteAttachment) => {
    const token = localStorage.getItem('impera_token');
    // Fetch with auth then download
    fetch(`/api/notes/attachments/${att.id}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = att.fileName;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(console.error);
  };

  return (
    <div className="fixed inset-0 z-[10001]" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10001, pointerEvents: 'auto' }}>
      {/* Overlay */}
      <div
        onClick={handleClose}
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Bottom sheet */}
      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`absolute bottom-0 left-0 right-0 bg-[var(--color-bg-apple)] rounded-t-[32px] shadow-2xl border-t border-[var(--apple-border)] max-h-[85vh] overflow-y-auto transition-transform duration-300 ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10002 }}
      >
        {/* Drag handle */}
        <div className="sticky top-0 z-10 bg-[var(--color-bg-apple)] rounded-t-[32px] pt-3 pb-2 px-4">
          <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-[var(--color-text-main)] tracking-tight truncate flex-1 mr-2">
              {note.title}
            </h2>
            <div className="flex items-center gap-1.5">
              {isOwner && onEdit && (
                <button
                  onClick={() => { handleClose(); setTimeout(() => onEdit(), 300); }}
                  className="p-2 rounded-xl bg-[var(--color-primary-apple)]/10 active:scale-90 transition-transform"
                >
                  <Pencil className="w-4 h-4 text-[var(--color-primary-apple)]" />
                </button>
              )}
              <button onClick={handleClose} className="p-2 rounded-xl bg-black/5 dark:bg-white/5 active:scale-90 transition-transform">
                <X className="w-4 h-4 text-[var(--color-text-muted)]" />
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 pb-8 pt-1 space-y-4">
          {/* Meta info chips */}
          <div className="flex flex-wrap gap-1.5">
            {/* Date */}
            <span className="text-[9px] font-bold text-[var(--color-text-muted)] bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-lg">
              {formatDate(note.date)}
            </span>

            {/* Lesson */}
            {note.lesson && (
              <span className="text-[9px] font-bold text-[var(--color-primary-apple)] bg-[var(--color-primary-apple)]/10 px-2.5 py-1 rounded-lg">
                {note.lesson.pairNumber}п · {note.lesson.subject}
              </span>
            )}

            {/* Public/Private */}
            {note.isPublic ? (
              <span className="flex items-center gap-1 text-[9px] font-bold text-blue-500 bg-blue-500/10 px-2.5 py-1 rounded-lg">
                <Users className="w-3 h-3" /> Видна группе
              </span>
            ) : (
              <span className="text-[9px] font-bold text-[var(--color-text-muted)] bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-lg">
                Только мне
              </span>
            )}

            {/* Reminder */}
            {note.notifyAt && !note.notified && (
              <span className="flex items-center gap-1 text-[9px] font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg">
                <Bell className="w-3 h-3" />
                {new Date(note.notifyAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}

            {/* Author role */}
            {note.authorRole === 'teacher' && (
              <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg">
                ДЗ
              </span>
            )}
          </div>

          {/* Author (for shared notes) */}
          {!isOwner && note.user && (
            <div
              className="flex items-center gap-2.5 p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--apple-border)] active:scale-[0.98] transition-transform cursor-pointer"
              onClick={() => {
                if (note.user?.username) window.open(`https://t.me/${note.user.username}`, '_blank');
              }}
            >
              <UserAvatar
                avatarId={note.user.avatarId || 0}
                firstName={note.user.firstName}
                size="sm"
                className="!w-8 !h-8 !rounded-xl"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-[var(--color-text-main)]">
                  {note.user.firstName}{note.user.lastName ? ` ${note.user.lastName}` : ''}
                </p>
                {note.user.username && (
                  <p className="text-[9px] text-blue-500 opacity-70">@{note.user.username}</p>
                )}
              </div>
              {note.user.username && (
                <span className="text-[8px] font-bold text-blue-500 bg-blue-500/10 px-2 py-1 rounded-lg flex-shrink-0">
                  Telegram →
                </span>
              )}
            </div>
          )}

          {/* Note text */}
          {note.text && (
            <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-[var(--apple-border)]">
              <p className="text-[12px] md:text-[13px] font-medium text-[var(--color-text-main)] leading-relaxed whitespace-pre-wrap">
                {note.text}
              </p>
            </div>
          )}

          {/* Attachments */}
          {note.attachments && note.attachments.length > 0 && (
            <div>
              <label className="text-[9px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)] opacity-60 mb-2 block flex items-center gap-1.5">
                <Paperclip className="w-3 h-3" />
                Файлы ({note.attachments.length})
              </label>
              <div className="space-y-1">
                {note.attachments.map(att => (
                  <button
                    key={att.id}
                    onClick={() => handleDownload(att)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--apple-border)] hover:shadow-md active:scale-[0.98] transition-all text-left"
                  >
                    {att.mimeType.startsWith('image/') ? (
                      <Image className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" />
                    )}
                    <span className="text-[10px] font-medium text-[var(--color-text-main)] truncate flex-1">{att.fileName}</span>
                    <span className="text-[8px] text-[var(--color-text-muted)] opacity-50 flex-shrink-0">
                      {formatFileSize(att.fileSize)}
                    </span>
                    <Download className="w-3 h-3 text-[var(--color-primary-apple)] flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No content message */}
          {!note.text && (!note.attachments || note.attachments.length === 0) && (
            <div className="text-center py-6">
              <p className="text-[11px] text-[var(--color-text-muted)] opacity-50">Нет описания или файлов</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
