import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';
import type { Institute, Direction, Program, Group } from '../types';
import { ChevronRight, GraduationCap, Sun, Moon, ArrowLeft, Search } from 'lucide-react';
import EmojiLoader from '../components/EmojiLoader';

type Step = 'institute' | 'direction' | 'program' | 'group';

export default function SelectGroupPage() {
  const { user, updateUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [step, setStep] = useState<Step>('institute');
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selected, setSelected] = useState<{ institute?: Institute; direction?: Direction; program?: Program }>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const searchTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    api.get<Institute[]>('/structure/institutes').then(setInstitutes).finally(() => setLoading(false));
  }, []);

  const selectInstitute = async (inst: Institute) => {
    setSelected({ institute: inst });
    setStep('direction');
    const dirs = await api.get<Direction[]>(`/structure/institutes/${inst.id}/directions`);
    setDirections(dirs);
  };

  const selectDirection = async (dir: Direction) => {
    setSelected({ ...selected, direction: dir });
    setStep('program');
    try {
      const progs = await api.get<any>(`/structure/directions/${dir.id}/programs?page=1&limit=500`);
      const programsArray = progs.items || progs;
      setPrograms(programsArray);
      if (programsArray.length === 1) {
        await selectProgram(programsArray[0]);
      }
    } catch (error) {
      console.error('[SelectGroup] Error loading programs:', error);
    }
  };

  const selectProgram = async (prog: Program) => {
    setSelected({ ...selected, program: prog });
    setStep('group');
    try {
      const grpsRes = await api.get<any>(`/structure/programs/${prog.id}/groups?page=1&limit=500`);
      const groupsArray = grpsRes.items || grpsRes;
      setGroups(groupsArray);
    } catch (error) {
      console.error('[SelectGroup] Error loading groups:', error);
    }
  };

  const selectGroup = async (group: Group) => {
    setLoading(true);
    const data = await api.put<{ user: any }>('/user/group', { groupId: group.id });
    updateUser(data.user);
  };

  const goBack = () => {
    setSearch('');
    if (step === 'direction') { setStep('institute'); setSelected({}); }
    else if (step === 'program') { setStep('direction'); setSelected({ institute: selected.institute }); }
    else if (step === 'group') {
      if (programs.length <= 1) { setStep('direction'); setSelected({ institute: selected.institute }); }
      else { setStep('program'); setSelected({ institute: selected.institute, direction: selected.direction }); }
    }
  };

  const stepTitles: Record<Step, string> = {
    institute: 'Выберите институт',
    direction: 'Выберите направление',
    program: 'Выберите программу',
    group: 'Выберите группу',
  };

  const filterItems = <T extends { name: string }>(items: T[]) =>
    search ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())) : items;

  // Search effect for program/group search on server
  useEffect(() => {
    if (step === 'program' && selected.direction) {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      
      searchTimeoutRef.current = window.setTimeout(async () => {
        const query = search ? `?search=${encodeURIComponent(search)}&page=1&limit=500` : '?page=1&limit=500';
        const progs = await api.get<any>(`/structure/directions/${selected.direction!.id}/programs${query}`);
        const programsArray = progs.items || progs;
        setPrograms(programsArray);
      }, 300);
    }

    if (step === 'group' && selected.program) {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

      searchTimeoutRef.current = window.setTimeout(async () => {
        const query = search ? `?search=${encodeURIComponent(search)}&page=1&limit=500` : '?page=1&limit=500';
        const grpsRes = await api.get<any>(`/structure/programs/${selected.program!.id}/groups${query}`);
        const groupsArray = grpsRes.items || grpsRes;
        setGroups(groupsArray);
      }, 300);
    }

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [search, step, selected.direction, selected.program]);

  return (
    <div className="min-h-screen bg-[var(--color-bg-apple)] flex flex-col smooth-transition relative overflow-hidden">
      {/* Dynamic Background Accents */}
      <div className="absolute top-[-5%] left-[-5%] w-[30%] h-[30%] bg-blue-500/5 blur-[100px] rounded-full" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full" />

      <div className="absolute top-6 right-6 z-50">
        <button onClick={toggleTheme} className="p-3 rounded-2xl apple-glass shadow-xl hover:scale-110 active:scale-95 smooth-transition">
          {theme === 'dark' ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-700" />}
        </button>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 pt-12 sm:pt-20">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="text-center mb-12 animate-in fade-in slide-in-from-top duration-1000">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-[28px] bg-[var(--color-primary-apple)] mb-8 shadow-2xl">
              <GraduationCap className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-black text-[var(--color-text-main)] tracking-[-0.04em] mb-3">
              Привет, {user?.firstName}!
            </h1>
            <p className="text-lg font-medium text-[var(--color-text-muted)] tracking-tight">
              {stepTitles[step]}
            </p>
          </div>

          {/* Progress Bullets */}
          <div className="flex items-center justify-center gap-4 mb-10">
            {(['institute', 'direction', 'program', 'group'] as Step[]).map((s) => {
              const active = s === step;
              const completed = (['institute', 'direction', 'program', 'group'] as Step[]).indexOf(s) < (['institute', 'direction', 'program', 'group'] as Step[]).indexOf(step);
              return (
                <div key={s} className="flex items-center">
                  <div className={`h-2.5 rounded-full transition-all duration-700 ${active ? 'w-8 bg-[var(--color-primary-apple)] shadow-[0_0_15px_rgba(0,122,255,0.4)]' :
                    completed ? 'w-2.5 bg-emerald-500' : 'w-2.5 bg-gray-300 dark:bg-zinc-800'
                    }`} />
                </div>
              );
            })}
          </div>

          {/* Back Action */}
          {step !== 'institute' && (
            <button
              onClick={goBack}
              className="flex items-center gap-2 mb-6 px-4 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 text-sm font-bold text-[var(--color-text-muted)] hover:text-[var(--color-primary-apple)] smooth-transition active:scale-95 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Назад
            </button>
          )}

          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Поиск..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-6 py-4 rounded-[22px] apple-glass border border-[var(--apple-border)] text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all shadow-sm"
            />
          </div>

          {/* Items */}
          {loading && step === 'institute' ? (
            <div className="apple-card p-12 flex justify-center items-center h-[400px]">
              <EmojiLoader />
            </div>
          ) : (
            <div className="space-y-2">
              {step === 'institute' && (search ? filterItems(institutes) : institutes).map(inst => (
                <ItemButton key={inst.id} label={inst.name} onClick={() => selectInstitute(inst)} />
              ))}
              {step === 'direction' && (search ? filterItems(directions) : directions).map(dir => (
                <ItemButton key={dir.id} label={dir.name} onClick={() => selectDirection(dir)} />
              ))}
              {step === 'program' && programs.map(prog => (
                <ItemButton key={prog.id} label={prog.name} onClick={() => selectProgram(prog)} />
              ))}
              {step === 'group' && groups.map(grp => (
                <ItemButton
                  key={grp.id}
                  label={`${grp.course} курс ${grp.number} группа`}
                  subtitle={`${grp.studyForm} • ${grp.educationLevel}`}
                  onClick={() => selectGroup(grp)}
                />
              ))}
              {((step === 'program' && programs.length === 0) || (step === 'group' && groups.length === 0)) && (
                <div className="text-center py-12 text-[var(--color-text-muted)]">
                  <p className="text-sm font-medium">Ничего не найдено</p>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col items-center gap-6 mt-12 pb-12">
            <button
              onClick={() => { localStorage.setItem('impera_skip_group', '1'); updateUser({ ...user!, groupId: -1 } as any); }}
              className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] hover:text-[var(--color-primary-apple)] smooth-transition border-b border-transparent hover:border-[var(--color-primary-apple)]/30 pb-0.5"
            >
              Пропустить этот шаг →
            </button>
            <button onClick={logout} className="text-[11px] font-bold uppercase tracking-wider text-red-500/60 hover:text-red-500 smooth-transition">
              Выйти из системы
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemButton({ label, subtitle, onClick }: { label: string; subtitle?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-6 py-5 apple-card shadow-sm hover:shadow-xl hover:-translate-y-0.5 group text-left mb-3 border border-[var(--apple-border)]"
    >
      <div className="flex-1 pr-4">
        <p className="text-sm font-bold text-[var(--color-text-main)] group-hover:text-[var(--color-primary-apple)] smooth-transition">
          {label}
        </p>
        {subtitle && <p className="text-xs font-medium text-[var(--color-text-muted)] mt-1.5 opacity-80">{subtitle}</p>}
      </div>
      <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:bg-[var(--color-primary-apple)] group-hover:text-white transition-all duration-300">
        <ChevronRight className="w-4 h-4" />
      </div>
    </button>
  );
}
