import { useState } from 'react';
import { FileText, Bell, Users, X, EyeOff, UserX, Paperclip } from 'lucide-react';
import { api } from '../api/client';
import type { Note } from '../types';
import UserAvatar from './UserAvatar';

/** Open author's Telegram profile */
function openTg(username?: string) {
  if (username) window.open(`https://t.me/${username}`, '_blank');
}

/** Shared action popover — "hide note" + "block user" */
function NoteActionMenu({ note, onHide, onBlock, onClose }: {
  note: Note;
  onHide: () => void;
  onBlock: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute right-0 top-full mt-1 z-50 bg-[var(--color-bg-apple)] border border-[var(--apple-border)] rounded-2xl shadow-2xl p-2 min-w-[210px] space-y-1">
      <button
        onClick={onHide}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.97] transition-all text-left"
      >
        <EyeOff className="w-4 h-4 text-[var(--color-text-muted)]" />
        <span className="text-[11px] font-semibold text-[var(--color-text-main)]">Скрыть заметку</span>
      </button>
      <button
        onClick={onBlock}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.97] transition-all text-left"
      >
        <UserX className="w-4 h-4 text-[var(--color-text-muted)]" />
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-semibold text-[var(--color-text-main)]">Не показывать от {note.user?.firstName}</span>
        </div>
      </button>
      <div className="border-t border-black/5 dark:border-white/5 mx-1" />
      <button
        onClick={onClose}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.97] transition-all text-left"
      >
        <X className="w-3.5 h-3.5 text-[var(--color-text-muted)] opacity-60" />
        <span className="text-[10px] font-medium text-[var(--color-text-muted)]">Отмена</span>
      </button>
    </div>
  );
}

// ────────────────── Compact NotesBadge (under lesson cards) ──────────────────

interface NotesBadgeProps {
  notes: Note[];
  currentUserId?: number;
  onNoteClick?: (note: Note) => void;
  onBlockUser?: (userId: number) => void;
  onHideNote?: (noteId: number) => void;
}

export default function NotesBadge({ notes, currentUserId, onNoteClick, onBlockUser, onHideNote }: NotesBadgeProps) {
  const [menuNoteId, setMenuNoteId] = useState<number | null>(null);

  if (notes.length === 0) return null;

  const handleBlock = async (userId: number) => {
    try { await api.post(`/user/block/${userId}`); onBlockUser?.(userId); } catch {}
    setMenuNoteId(null);
  };

  return (
    <div className="ml-[52px] md:ml-[120px] mr-2 -mt-0.5 mb-2 space-y-1">
      {notes.map(note => {
        const isShared = note.isPublic && note.userId !== currentUserId;
        return (
          <div key={note.id} className="relative group">
            <button
              onClick={() => onNoteClick?.(note)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-sm border border-black/[0.06] dark:border-white/[0.08] shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] active:scale-[0.98] transition-all duration-150 text-left"
            >
              {/* Avatar + name cluster for shared, icon for own */}
              {isShared && note.user ? (
                <div
                  className="flex items-center gap-1.5 flex-shrink-0"
                  onClick={(e) => { e.stopPropagation(); openTg(note.user?.username); }}
                >
                  <UserAvatar
                    avatarId={note.user.avatarId || 0}
                    firstName={note.user.firstName}
                    size="sm"
                    className="!w-5 !h-5 !text-[7px] !rounded-lg"
                  />
                  <span className="text-[9px] font-bold text-[var(--color-text-muted)] whitespace-nowrap max-w-[60px] truncate">
                    {note.user.firstName}
                  </span>
                </div>
              ) : (
                <div className="w-5 h-5 rounded-lg bg-[var(--color-primary-apple)]/10 dark:bg-[var(--color-primary-apple-dark)]/15 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-3 h-3 text-[var(--color-primary-apple)] dark:text-[var(--color-primary-apple-dark)]" />
                </div>
              )}

              {isShared && <span className="text-[var(--color-text-muted)] opacity-20 text-[8px]">·</span>}

              <span className="text-[10px] md:text-[11px] font-semibold text-[var(--color-text-main)] truncate flex-1">
                {note.title}
              </span>

              {note.attachments && note.attachments.length > 0 && (
                <Paperclip className="w-2.5 h-2.5 text-[var(--color-text-muted)] opacity-40 flex-shrink-0" />
              )}
              {note.notifyAt && !note.notified && (
                <Bell className="w-3 h-3 text-amber-500 flex-shrink-0" />
              )}
              {note.authorRole === 'teacher' && (
                <span className="text-[7px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md flex-shrink-0">
                  ДЗ
                </span>
              )}
              {note.isPublic && note.userId === currentUserId && (
                <Users className="w-2.5 h-2.5 text-[var(--color-text-muted)] opacity-30 flex-shrink-0" />
              )}
            </button>

            {/* "..." menu trigger for shared notes */}
            {isShared && note.user && (
              <button
                onClick={(e) => { e.stopPropagation(); setMenuNoteId(menuNoteId === note.id ? null : note.id); }}
                className="absolute -right-1 -top-1 w-5 h-5 rounded-full bg-black/5 dark:bg-white/10 border border-black/8 dark:border-white/12 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <span className="text-[10px] font-bold text-[var(--color-text-muted)] leading-none">···</span>
              </button>
            )}

            {/* Action menu */}
            {menuNoteId === note.id && note.user && (
              <NoteActionMenu
                note={note}
                onHide={() => { onHideNote?.(note.id); setMenuNoteId(null); }}
                onBlock={() => handleBlock(note.userId)}
                onClose={() => setMenuNoteId(null)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ────────────────── DayNotesBlock (larger cards above schedule) ──────────────────

interface DayNotesBlockProps {
  notes: Note[];
  currentUserId?: number;
  onNoteClick?: (note: Note) => void;
  onBlockUser?: (userId: number) => void;
  onHideNote?: (noteId: number) => void;
}

export function DayNotesBlock({ notes, currentUserId, onNoteClick, onBlockUser, onHideNote }: DayNotesBlockProps) {
  const [menuNoteId, setMenuNoteId] = useState<number | null>(null);

  if (notes.length === 0) return null;

  const handleBlock = async (userId: number) => {
    try { await api.post(`/user/block/${userId}`); onBlockUser?.(userId); } catch {}
    setMenuNoteId(null);
  };

  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <FileText className="w-3 h-3 text-[var(--color-text-muted)] opacity-50" />
        <span className="text-[9px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)] opacity-50">
          Заметки на день
        </span>
      </div>

      <div className="space-y-2">
        {notes.map(note => {
          const isShared = note.isPublic && note.userId !== currentUserId;
          return (
            <div key={note.id} className="relative group">
              <button
                onClick={() => onNoteClick?.(note)}
                className="w-full text-left px-4 py-3 rounded-2xl bg-white/70 dark:bg-white/[0.04] backdrop-blur-sm border border-black/[0.06] dark:border-white/[0.08] shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-[0_3px_12px_rgba(0,0,0,0.08)] active:scale-[0.98] transition-all duration-150"
              >
                {/* Header row: avatar + name or icon */}
                <div className="flex items-center gap-2.5 mb-1.5">
                  {isShared && note.user ? (
                    <div
                      className="flex items-center gap-2 flex-shrink-0"
                      onClick={(e) => { e.stopPropagation(); openTg(note.user?.username); }}
                    >
                      <UserAvatar
                        avatarId={note.user.avatarId || 0}
                        firstName={note.user.firstName}
                        size="sm"
                        className="!w-7 !h-7 !rounded-xl"
                      />
                      <span className="text-[10px] font-bold text-[var(--color-text-muted)]">
                        {note.user.firstName}{note.user.lastName ? ` ${note.user.lastName}` : ''}
                      </span>
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-xl bg-[var(--color-primary-apple)]/10 dark:bg-[var(--color-primary-apple-dark)]/15 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-3.5 h-3.5 text-[var(--color-primary-apple)] dark:text-[var(--color-primary-apple-dark)]" />
                    </div>
                  )}

                  <div className="flex-1" />

                  {note.notifyAt && !note.notified && (
                    <Bell className="w-3.5 h-3.5 text-amber-500 opacity-70 flex-shrink-0" />
                  )}
                  {note.authorRole === 'teacher' && (
                    <span className="text-[7px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md flex-shrink-0">
                      ДЗ
                    </span>
                  )}
                  {note.isPublic && note.userId === currentUserId && (
                    <Users className="w-3 h-3 text-[var(--color-text-muted)] opacity-30 flex-shrink-0" />
                  )}
                </div>

                <p className="text-[12px] md:text-[13px] font-bold text-[var(--color-text-main)] truncate">
                  {note.title}
                </p>

                {note.text && (
                  <p className="text-[10px] text-[var(--color-text-muted)] opacity-60 truncate mt-0.5">
                    {note.text}
                  </p>
                )}
              </button>

              {/* "..." menu trigger */}
              {isShared && note.user && (
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuNoteId(menuNoteId === note.id ? null : note.id); }}
                  className="absolute right-2 top-2 w-6 h-6 rounded-full bg-black/5 dark:bg-white/10 border border-black/8 dark:border-white/12 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span className="text-[12px] font-bold text-[var(--color-text-muted)] leading-none">···</span>
                </button>
              )}

              {/* Action menu */}
              {menuNoteId === note.id && note.user && (
                <NoteActionMenu
                  note={note}
                  onHide={() => { onHideNote?.(note.id); setMenuNoteId(null); }}
                  onBlock={() => handleBlock(note.userId)}
                  onClose={() => setMenuNoteId(null)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
