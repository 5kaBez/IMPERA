import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { SportSection, SportSlot } from '../types';
import { DAY_NAMES_SHORT, SPORT_EMOJIS } from '../types';
import { Heart, Clock, MapPin, User, Filter, ChevronDown, ChevronUp, Star } from 'lucide-react';

type ViewMode = 'sections' | 'schedule' | 'favorites';

const TIME_SLOTS = ['09:00', '10:40', '12:55', '14:35', '16:15', '17:55'];
const DAYS = [1, 2, 3, 5, 6]; // Пн, Вт, Ср, Пт, Сб (без Чт)

export default function SportsPage() {
  const { user } = useAuth();
  const [view, setView] = useState<ViewMode>('sections');
  const [sections, setSections] = useState<SportSection[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const [filterDay, setFilterDay] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sectionsData, favData] = await Promise.all([
        api.get<SportSection[]>('/sports/sections'),
        user ? api.get<SportSection[]>('/sports/favorites').catch(() => []) : Promise.resolve([]),
      ]);
      setSections(sectionsData);
      setFavorites(favData.map((s: SportSection) => s.id));
    } catch (err) {
      console.error('Failed to load sports:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (sectionId: number) => {
    try {
      const result = await api.post<{ favorited: boolean }>(`/sports/favorites/${sectionId}`, {});
      if (result.favorited) {
        setFavorites(prev => [...prev, sectionId]);
      } else {
        setFavorites(prev => prev.filter(id => id !== sectionId));
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const filteredSections = view === 'favorites'
    ? sections.filter(s => favorites.includes(s.id))
    : sections;

  const filteredByDay = filterDay
    ? filteredSections.map(s => ({
      ...s,
      slots: s.slots.filter(slot => slot.dayOfWeek === filterDay),
    })).filter(s => s.slots.length > 0)
    : filteredSections;

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Физкультура</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {sections.length} {sections.length === 1 ? 'секция' : sections.length < 5 ? 'секции' : 'секций'}
        </p>
      </div>

      {/* View Toggle */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl mb-3">
        {([
          { key: 'sections' as const, label: 'Секции' },
          { key: 'schedule' as const, label: 'Сетка' },
          { key: 'favorites' as const, label: '⭐ Избранное' },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setView(t.key)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              view === t.key
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Day filter chips */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterDay(null)}
          className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
            filterDay === null
              ? 'bg-indigo-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}
        >
          Все дни
        </button>
        {DAYS.map(day => (
          <button
            key={day}
            onClick={() => setFilterDay(filterDay === day ? null : day)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
              filterDay === day
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            {DAY_NAMES_SHORT[day]}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sections.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-4xl mb-3 block">🏃</span>
          <p className="text-base font-medium text-gray-500 dark:text-gray-400">Секции ещё не загружены</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Расписание физкультуры появится скоро</p>
        </div>
      ) : view === 'schedule' ? (
        <ScheduleGrid sections={filteredByDay} filterDay={filterDay} />
      ) : (
        <SectionList
          sections={filteredByDay}
          favorites={favorites}
          expandedSection={expandedSection}
          onToggleExpand={(id) => setExpandedSection(expandedSection === id ? null : id)}
          onToggleFavorite={toggleFavorite}
        />
      )}
    </div>
  );
}

/* ===== Section List View ===== */
function SectionList({
  sections,
  favorites,
  expandedSection,
  onToggleExpand,
  onToggleFavorite,
}: {
  sections: SportSection[];
  favorites: number[];
  expandedSection: number | null;
  onToggleExpand: (id: number) => void;
  onToggleFavorite: (id: number) => void;
}) {
  if (sections.length === 0) {
    return (
      <div className="text-center py-12">
        <Star className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Нет избранных секций</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sections.map(section => {
        const emoji = section.emoji || SPORT_EMOJIS[section.name] || '🏃';
        const isFav = favorites.includes(section.id);
        const isExpanded = expandedSection === section.id;
        const totalSlots = section.slots.length;
        const uniqueDays = [...new Set(section.slots.map(s => s.dayOfWeek))];

        return (
          <div
            key={section.id}
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
          >
            {/* Section header */}
            <button
              onClick={() => onToggleExpand(section.id)}
              className="w-full p-3 flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <span className="text-2xl">{emoji}</span>
              <div className="flex-1 min-w-0">
                <h3 className="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
                  {section.name}
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {uniqueDays.map(d => DAY_NAMES_SHORT[d]).join(', ')} · {totalSlots} {totalSlots === 1 ? 'занятие' : totalSlots < 5 ? 'занятия' : 'занятий'}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(section.id); }}
                className="p-1.5 -m-1.5"
              >
                <Heart
                  className={`w-5 h-5 transition-colors ${
                    isFav ? 'fill-red-500 text-red-500' : 'text-gray-300 dark:text-gray-600'
                  }`}
                />
              </button>
              {isExpanded
                ? <ChevronUp className="w-4 h-4 text-gray-400" />
                : <ChevronDown className="w-4 h-4 text-gray-400" />
              }
            </button>

            {/* Expanded slots */}
            {isExpanded && (
              <div className="border-t border-gray-100 dark:border-gray-800">
                {section.slots.map(slot => (
                  <SlotRow key={slot.id} slot={slot} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ===== Single slot row ===== */
function SlotRow({ slot }: { slot: SportSlot }) {
  return (
    <div className="px-3 py-2 flex items-center gap-3 border-b border-gray-50 dark:border-gray-800/50 last:border-0">
      <span className="text-[11px] font-bold text-indigo-500 w-6 text-center">
        {DAY_NAMES_SHORT[slot.dayOfWeek]}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-[12px] text-gray-700 dark:text-gray-300">
          <Clock className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <span className="font-medium">{slot.timeStart} — {slot.timeEnd}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" /> {slot.teacher}
          </span>
          {slot.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {slot.location}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===== Schedule Grid View ===== */
function ScheduleGrid({ sections, filterDay }: { sections: SportSection[]; filterDay: number | null }) {
  // Build a grid: time → day → slots
  const allSlots: SportSlot[] = sections.flatMap(s =>
    s.slots.map(slot => ({ ...slot, section: { id: s.id, name: s.name, emoji: s.emoji, slots: [] } }))
  );

  const days = filterDay ? [filterDay] : DAYS;

  // Group by time
  const byTime = new Map<string, Map<number, SportSlot[]>>();
  for (const slot of allSlots) {
    if (!byTime.has(slot.timeStart)) byTime.set(slot.timeStart, new Map());
    const dayMap = byTime.get(slot.timeStart)!;
    if (!dayMap.has(slot.dayOfWeek)) dayMap.set(slot.dayOfWeek, []);
    dayMap.get(slot.dayOfWeek)!.push(slot);
  }

  const times = TIME_SLOTS.filter(t => byTime.has(t));

  if (times.length === 0) {
    return (
      <div className="text-center py-12">
        <Filter className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Нет занятий</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full text-[11px] border-collapse min-w-[500px]">
        <thead>
          <tr>
            <th className="py-2 px-1 text-gray-400 font-medium text-left w-[50px]">Время</th>
            {days.map(day => (
              <th key={day} className="py-2 px-1 text-indigo-500 font-bold text-center">
                {DAY_NAMES_SHORT[day]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {times.map(time => {
            const dayMap = byTime.get(time)!;
            return (
              <tr key={time} className="border-t border-gray-100 dark:border-gray-800">
                <td className="py-2 px-1 font-bold text-gray-600 dark:text-gray-400 align-top">
                  {time}
                </td>
                {days.map(day => {
                  const slots = dayMap.get(day) || [];
                  return (
                    <td key={day} className="py-1 px-0.5 align-top">
                      <div className="space-y-0.5">
                        {slots.map(slot => {
                          const emoji = slot.section?.emoji || SPORT_EMOJIS[slot.section?.name || ''] || '';
                          return (
                            <div
                              key={slot.id}
                              className="bg-indigo-50 dark:bg-indigo-500/10 rounded-md px-1.5 py-1 text-[10px] leading-tight"
                            >
                              <span className="font-semibold text-gray-800 dark:text-gray-200">
                                {emoji} {slot.section?.name}
                              </span>
                              <div className="text-gray-500 dark:text-gray-400 truncate">
                                {slot.teacher}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
