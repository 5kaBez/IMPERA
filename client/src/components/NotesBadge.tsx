import { useState } from 'react';
import { FileText, Bell, Users, Ban } from 'lucide-react';
import { api } from '../api/client';
import type { Note } from '../types';
import UserAvatar from './UserAvatar';

interface NotesBadgeProps {
  notes: Note[];
  currentUserId?: number;
  onNoteClick?: (note: Note) => void;
  onBlockUser?: (userId: number) => void;
}

export default function NotesBadge({ notes, currentUserId, onNoteClick, onBlockUser }: NotesBadgeProps) {
  const [confirmBlockNoteId, setConfirmBlockNoteId] = useState<number | null>(null);

  if (notes.length === 0) return null;

  const handleBlock = async (userId: number) => {
    try {
      await api.post(`/user/block/${userId}`);
      onBlockUser?.(userId);
    } catch (e) {
      console.error('Block error:', e);
    }
    setConfirmBlockNoteId(null);
  };

  return (
    <div className="ml-[52px] md:ml-[120px] mr-2 -mt-0.5 mb-2 space-y-1">
      {notes.map(note => {
        const isShared = note.isPublic && note.userId !== currentUserId;
        return (
          <div key={note.id} className="relative">
            <button
              onClick={() => onNoteClick?.(note)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-left active:scale-[0.98] transition-transform duration-150 group ${
                isShared
                  ? 'bg-[var(--color-secondary-apple)]/6 border-[var(--color-secondary-apple)]/15 hover:bg-[var(--color-secondary-apple)]/10'
                  : 'bg-[var(--color-primary-apple)]/10 dark:bg-[var(--color-primary-apple-dark)]/15 border-[var(--color-primary-apple)]/20 dark:border-[var(--color-primary-apple-dark)]/25 hover:bg-[var(--color-primary-apple)]/15 dark:hover:bg-[var(--color-primary-apple-dark)]/20'
              }`}
            >
              {isShared && note.user ? (
                <UserAvatar avatarId={note.user.avatarId || 0} firstName={note.user.firstName} size="sm" className="!w-5 !h-5 !text-[7px] !rounded-lg flex-shrink-0" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-[var(--color-primary-apple)] dark:text-[var(--color-primary-apple-dark)] flex-shrink-0" />
              )}
              <span className="text-[10px] md:text-[11px] font-bold text-[var(--color-text-main)] truncate flex-1">
                {note.title}
              </span>
              {isShared && note.user && (
                <span
                  onClick={(e) => {
                    if (note.user?.username) {
                      e.stopPropagation();
                      window.open(`https://t.me/${note.user.username}`, '_blank');
                    }
                  }}
                  className={`text-[8px] font-bold flex-shrink-0 ${
                    note.user.username
                      ? 'text-[var(--color-secondary-apple)] opacity-70 active:opacity-100'
                      : 'text-[var(--color-text-muted)] opacity-50'
                  }`}
                >
                  {note.user.firstName}
                </span>
              )}
              {note.notifyAt && !note.notified && (
                <Bell className="w-3 h-3 text-[var(--color-secondary-apple)] flex-shrink-0" />
              )}
              {note.authorRole === 'teacher' && (
                <span className="text-[8px] font-black uppercase tracking-wider text-[var(--color-secondary-apple)] flex-shrink-0">
                  ДЗ
                </span>
              )}
              {note.isPublic && note.userId === currentUserId && (
                <Users className="w-2.5 h-2.5 text-[var(--color-primary-apple)] dark:text-[var(--color-primary-apple-dark)] opacity-40 flex-shrink-0" />
              )}
            </button>

            {/* Block button for shared notes */}
            {isShared && note.user && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmBlockNoteId(confirmBlockNoteId === note.id ? null : note.id);
                }}
                className="absolute -right-1 -top-1 w-5 h-5 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:!opacity-100 transition-opacity"
                title="Скрыть заметки этого пользователя"
              >
                <Ban className="w-2.5 h-2.5 text-red-500" />
              </button>
            )}

            {/* Block confirmation */}
            {confirmBlockNoteId === note.id && note.user && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-[var(--color-bg-apple)] border border-[var(--apple-border)] rounded-xl shadow-xl p-3 min-w-[200px]">
                <p className="text-[10px] font-bold text-[var(--color-text-main)] mb-2">
                  Скрыть заметки от {note.user.firstName}?
                </p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleBlock(note.userId)}
                    className="flex-1 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-[9px] font-bold active:scale-95 transition-transform"
                  >
                    Скрыть
                  </button>
                  <button
                    onClick={() => setConfirmBlockNoteId(null)}
                    className="flex-1 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 text-[var(--color-text-muted)] text-[9px] font-bold active:scale-95 transition-transform"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface DayNotesBlockProps {
  notes: Note[];
  currentUserId?: number;
  onNoteClick?: (note: Note) => void;
  onBlockUser?: (userId: number) => void;
}

export function DayNotesBlock({ notes, currentUserId, onNoteClick, onBlockUser }: DayNotesBlockProps) {
  const [confirmBlockNoteId, setConfirmBlockNoteId] = useState<number | null>(null);

  if (notes.length === 0) return null;

  const handleBlock = async (userId: number) => {
    try {
      await api.post(`/user/block/${userId}`);
      onBlockUser?.(userId);
    } catch (e) {
      console.error('Block error:', e);
    }
    setConfirmBlockNoteId(null);
  };

  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <FileText className="w-3 h-3 text-[var(--color-primary-apple)] dark:text-[var(--color-primary-apple-dark)] opacity-70" />
        <span className="text-[9px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)] opacity-70">
          Заметки на день
        </span>
      </div>
      <div className="space-y-1.5">
        {notes.map(note => {
          const isShared = note.isPublic && note.userId !== currentUserId;
          return (
            <div key={note.id} className="relative group">
              <button
                onClick={() => onNoteClick?.(note)}
                className={`w-full flex items-start gap-3 px-4 py-3 rounded-2xl border text-left active:scale-[0.98] transition-transform duration-150 ${
                  isShared
                    ? 'bg-[var(--color-secondary-apple)]/5 border-[var(--color-secondary-apple)]/12 hover:bg-[var(--color-secondary-apple)]/8'
                    : 'bg-[var(--color-primary-apple)]/8 dark:bg-[var(--color-primary-apple-dark)]/10 border-[var(--color-primary-apple)]/15 dark:border-[var(--color-primary-apple-dark)]/20 hover:bg-[var(--color-primary-apple)]/12 dark:hover:bg-[var(--color-primary-apple-dark)]/15'
                }`}
              >
                {isShared && note.user ? (
                  <div
                    onClick={(e) => {
                      if (note.user?.username) {
                        e.stopPropagation();
                        window.open(`https://t.me/${note.user.username}`, '_blank');
                      }
                    }}
                    className={note.user.username ? 'cursor-pointer active:scale-95 transition-transform' : ''}
                  >
                    <UserAvatar avatarId={note.user.avatarId || 0} firstName={note.user.firstName} size="sm" className="!w-8 !h-8 !rounded-xl flex-shrink-0 mt-0.5" />
                  </div>
                ) : (
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 border bg-[var(--color-primary-apple)]/15 dark:bg-[var(--color-primary-apple-dark)]/20 border-[var(--color-primary-apple)]/20 dark:border-[var(--color-primary-apple-dark)]/25`}>
                    <FileText className="w-4 h-4 text-[var(--color-primary-apple)] dark:text-[var(--color-primary-apple-dark)]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[12px] md:text-[13px] font-bold text-[var(--color-text-main)] truncate">
                      {note.title}
                    </p>
                    {note.isPublic && note.userId === currentUserId && (
                      <Users className="w-3 h-3 text-[var(--color-primary-apple)] dark:text-[var(--color-primary-apple-dark)] opacity-40 flex-shrink-0" />
                    )}
                  </div>
                  {isShared && note.user && (
                    <p
                      onClick={(e) => {
                        if (note.user?.username) {
                          e.stopPropagation();
                          window.open(`https://t.me/${note.user.username}`, '_blank');
                        }
                      }}
                      className={`text-[9px] font-bold mt-0.5 ${
                        note.user.username
                          ? 'text-[var(--color-secondary-apple)] opacity-80 active:opacity-100'
                          : 'text-[var(--color-secondary-apple)] opacity-70'
                      }`}
                    >
                      {note.user.firstName}{note.user.lastName ? ` ${note.user.lastName}` : ''}
                    </p>
                  )}
                  {note.text && (
                    <p className="text-[10px] text-[var(--color-text-muted)] opacity-50 truncate mt-0.5">
                      {note.text}
                    </p>
                  )}
                </div>
                {note.notifyAt && !note.notified && (
                  <Bell className="w-3.5 h-3.5 text-[var(--color-secondary-apple)] opacity-60 flex-shrink-0 mt-1" />
                )}
              </button>

              {/* Block button */}
              {isShared && note.user && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmBlockNoteId(confirmBlockNoteId === note.id ? null : note.id);
                  }}
                  className="absolute right-2 top-2 w-6 h-6 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Скрыть заметки этого пользователя"
                >
                  <Ban className="w-3 h-3 text-red-500" />
                </button>
              )}

              {/* Block confirmation */}
              {confirmBlockNoteId === note.id && note.user && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-[var(--color-bg-apple)] border border-[var(--apple-border)] rounded-xl shadow-xl p-3 min-w-[200px]">
                  <p className="text-[10px] font-bold text-[var(--color-text-main)] mb-2">
                    Скрыть заметки от {note.user.firstName}?
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleBlock(note.userId)}
                      className="flex-1 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-[9px] font-bold active:scale-95 transition-transform"
                    >
                      Скрыть
                    </button>
                    <button
                      onClick={() => setConfirmBlockNoteId(null)}
                      className="flex-1 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 text-[var(--color-text-muted)] text-[9px] font-bold active:scale-95 transition-transform"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
