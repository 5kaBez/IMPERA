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
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-black/80 dark:bg-black border border-zinc-400 dark:border-zinc-600 text-left active:scale-[0.98] transition-transform duration-150 group hover:bg-black hover:border-zinc-300 dark:hover:border-zinc-500"
        >
          <FileText className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-400 flex-shrink-0" />
          <span className="text-[10px] md:text-[11px] font-bold text-zinc-100 truncate flex-1">
            {note.title}
          </span>
          {note.text && (
            <span className="text-[9px] text-zinc-400/60 truncate max-w-[80px] hidden md:inline">
              {note.text}
            </span>
          )}
          {note.notifyAt && !note.notified && (
            <Bell className="w-3 h-3 text-zinc-400/60 flex-shrink-0" />
          )}
          {note.authorRole === 'teacher' && (
            <span className="text-[8px] font-black uppercase tracking-wider text-zinc-400/70 flex-shrink-0">
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
        <FileText className="w-3 h-3 text-zinc-400/70" />
        <span className="text-[9px] font-black uppercase tracking-[0.12em] text-zinc-400/80">
          Заметки на день
        </span>
      </div>
      <div className="space-y-1.5">
        {notes.map(note => (
          <button
            key={note.id}
            onClick={() => onNoteClick?.(note)}
            className="w-full flex items-start gap-3 px-4 py-3 rounded-2xl bg-black/70 dark:bg-black border border-zinc-400 dark:border-zinc-600 text-left active:scale-[0.98] transition-transform duration-150 hover:bg-black/80 hover:border-zinc-300 dark:hover:border-zinc-500"
          >
            <div className="w-8 h-8 rounded-xl bg-zinc-800 dark:bg-zinc-900 flex items-center justify-center flex-shrink-0 mt-0.5 border border-zinc-600">
              <FileText className="w-4 h-4 text-zinc-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] md:text-[13px] font-bold text-[var(--color-text-main)] truncate">
                {note.title}
              </p>
              {note.text && (
                <p className="text-[10px] text-zinc-300 opacity-60 truncate mt-0.5">
                  {note.text}
                </p>
              )}
            </div>
            {note.notifyAt && !note.notified && (
              <Bell className="w-3.5 h-3.5 text-zinc-400/60 flex-shrink-0 mt-1" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
