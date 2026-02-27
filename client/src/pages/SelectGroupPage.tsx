import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';
import type { Institute, Direction, Program, Group } from '../types';
import { ChevronRight, GraduationCap, Sun, Moon, ArrowLeft, Search } from 'lucide-react';

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

  useEffect(() => {
    api.get<Institute[]>('/structure/institutes').then(setInstitutes).finally(() => setLoading(false));
  }, []);

  const selectInstitute = async (inst: Institute) => {
    setSelected({ institute: inst });
    setLoading(true);
    const dirs = await api.get<Direction[]>(`/structure/institutes/${inst.id}/directions`);
    setDirections(dirs);
    setStep('direction');
    setLoading(false);
  };

  const selectDirection = async (dir: Direction) => {
    setSelected({ ...selected, direction: dir });
    setLoading(true);
    const progs = await api.get<Program[]>(`/structure/directions/${dir.id}/programs`);
    setPrograms(progs);
    if (progs.length === 1) {
      await selectProgram(progs[0]);
    } else {
      setStep('program');
      setLoading(false);
    }
  };

  const selectProgram = async (prog: Program) => {
    setSelected({ ...selected, program: prog });
    setLoading(true);
    const grps = await api.get<Group[]>(`/structure/programs/${prog.id}/groups`);
    setGroups(grps);
    setStep('group');
    setLoading(false);
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <div className="absolute top-4 right-4 flex gap-2">
        <button onClick={toggleTheme} className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 transition-all shadow-sm">
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 pt-12 sm:pt-20">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4 shadow-lg shadow-indigo-500/25">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              Привет, {user?.firstName}!
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {stepTitles[step]}
            </p>
          </div>

          {/* Progress */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {(['institute', 'direction', 'program', 'group'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full transition-all ${
                  s === step ? 'bg-indigo-500 scale-125' :
                  ['institute', 'direction', 'program', 'group'].indexOf(s) < ['institute', 'direction', 'program', 'group'].indexOf(step) ? 'bg-indigo-400' : 'bg-gray-300 dark:bg-gray-700'
                }`} />
                {i < 3 && <div className="w-8 h-0.5 bg-gray-200 dark:bg-gray-800" />}
              </div>
            ))}
          </div>

          {/* Breadcrumb */}
          {step !== 'institute' && (
            <button onClick={goBack} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-500 mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Назад
              {selected.institute && <span className="text-gray-400 dark:text-gray-600">/ {selected.institute.name}</span>}
              {selected.direction && <span className="text-gray-400 dark:text-gray-600">/ {selected.direction.name}</span>}
            </button>
          )}

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Items */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {step === 'institute' && filterItems(institutes).map(inst => (
                <ItemButton key={inst.id} label={inst.name} onClick={() => selectInstitute(inst)} />
              ))}
              {step === 'direction' && filterItems(directions).map(dir => (
                <ItemButton key={dir.id} label={dir.name} onClick={() => selectDirection(dir)} />
              ))}
              {step === 'program' && filterItems(programs).map(prog => (
                <ItemButton key={prog.id} label={prog.name} onClick={() => selectProgram(prog)} />
              ))}
              {step === 'group' && filterItems(groups).map(grp => (
                <ItemButton
                  key={grp.id}
                  label={`${grp.course} курс ${grp.number} группа`}
                  subtitle={`${grp.studyForm} • ${grp.educationLevel}`}
                  onClick={() => selectGroup(grp)}
                />
              ))}
            </div>
          )}

          <button onClick={logout} className="mt-8 text-sm text-gray-400 hover:text-red-500 mx-auto block transition-colors">
            Выйти
          </button>
        </div>
      </div>
    </div>
  );
}

function ItemButton({ label, subtitle, onClick }: { label: string; subtitle?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 transition-all group text-left"
    >
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {label}
        </p>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
    </button>
  );
}
