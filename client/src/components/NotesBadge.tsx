import { FileText, Bell } from 'lucide-react';
import type { Note } from '../types';

interface NotesBadgeProps {
  notes: Note[];
  onNoteClick?: (note: Note) => void;
}

export default function NotesBadge({ notes, onNoteClick }: NotesBadgeProps) {
  if (notes.length === 0) return null;

  return (
    <div className="ml-[52px] md:ml-[120px] mr-2 -mt-0.5 mb-2 space-y-1">
      {notes.map(note => (
        <button
          key={note.id}
          onClick={() => onNoteClick?.(note)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/[0.06] dark:bg-amber-500/[0.08] border border-amber-500/15 text-left active:scale-[0.98] transition-transform duration-150 group"
        >
          <FileText className="w-3.5 h-3.5 text-amber-500/60 flex-shrink-0" />
          <span className="text-[10px] md:text-[11px] font-bold text-amber-700 dark:text-amber-400 truncate flex-1">
            {note.title}
          </span>
          {note.text && (
            <span className="text-[9px] text-amber-600/40 dark:text-amber-400/30 truncate max-w-[80px] hidden md:inline">
              {note.text}
            </span>
          )}
          {note.notifyAt && !note.notified && (
            <Bell className="w-3 h-3 text-amber-500/40 flex-shrink-0" />
          )}
          {note.authorRole === 'teacher' && (
            <span className="text-[8px] font-black uppercase tracking-wider text-amber-600/50 dark:text-amber-400/40 flex-shrink-0">
              ДЗ
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

interface DayNotesBlockProps {
  notes: Note[];
  onNoteClick?: (note: Note) => void;
}

export function DayNotesBlock({ notes, onNoteClick }: DayNotesBlockProps) {
  if (notes.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <FileText className="w-3 h-3 text-amber-500/60" />
        <span className="text-[9px] font-black uppercase tracking-[0.12em] text-amber-600/70 dark:text-amber-400/60">
          Заметки на день
        </span>
      </div>
      <div className="space-y-1.5">
        {notes.map(note => (
          <button
            key={note.id}
            onClick={() => onNoteClick?.(note)}
            className="w-full flex items-start gap-3 px-4 py-3 rounded-2xl bg-amber-500/[0.04] dark:bg-amber-500/[0.06] border border-amber-500/10 text-left active:scale-[0.98] transition-transform duration-150"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <FileText className="w-4 h-4 text-amber-500/70" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] md:text-[13px] font-bold text-[var(--color-text-main)] truncate">
                {note.title}
              </p>
              {note.text && (
                <p className="text-[10px] text-[var(--color-text-muted)] opacity-60 truncate mt-0.5">
                  {note.text}
                </p>
              )}
            </div>
            {note.notifyAt && !note.notified && (
              <Bell className="w-3.5 h-3.5 text-amber-500/40 flex-shrink-0 mt-1" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
