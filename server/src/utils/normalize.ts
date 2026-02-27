// Normalize institute names from various formats in GUU data
const INSTITUTE_MAP: Record<string, string> = {
  'ГОСУДАРСТВЕННОГОУПРАВЛЕНИЯИПРАВА': 'Институт государственного управления и права',
  'ИНФОРМАЦИОННЫХСИСТЕМ': 'Институт информационных систем',
  'МАРКЕТИНГА': 'Институт маркетинга',
  'ОТРАСЛЕВОГОМЕНЕДЖМЕНТА': 'Институт отраслевого менеджмента',
  'УПРАВЛЕНИЯПЕРСОНАЛОМ, СОЦИАЛЬНЫХИБИЗНЕС-КОММУНИКАЦИЙ': 'Институт управления персоналом, социальных и бизнес-коммуникаций',
  'ЭКОНОМИКИИФИНАНСОВ': 'Институт экономики и финансов',
};

export function normalizeInstitute(name: string): string {
  const trimmed = name.trim();
  return INSTITUTE_MAP[trimmed] || trimmed;
}

// Normalize direction names (remove extra spaces: "М Е Н Е Д Ж М Е Н Т" → "МЕНЕДЖМЕНТ")
export function normalizeDirection(name: string): string {
  let result = name.trim();
  // Check if every other char is a space (spaced out letters)
  if (/^[А-ЯЁA-Z]\s+[А-ЯЁA-Z]/.test(result) && result.replace(/\s/g, '').length * 2 - 1 >= result.length * 0.7) {
    result = result.replace(/\s+/g, '');
  }
  // Remove multiple spaces
  result = result.replace(/\s{2,}/g, ' ').trim();
  // Normalize newlines
  result = result.replace(/\n/g, ' ').trim();
  // Title case
  return result.charAt(0).toUpperCase() + result.slice(1).toLowerCase();
}

// Normalize time to consistent format
export function normalizeTime(time: string): { start: string; end: string } {
  if (!time) return { start: '09:00', end: '10:30' };
  // Replace various separators
  const cleaned = time.replace(/\s/g, '').replace(/,/g, '.');
  const parts = cleaned.split('-');
  if (parts.length !== 2) return { start: '09:00', end: '10:30' };

  const formatTime = (t: string) => {
    const [h, m] = t.split('.');
    return `${h.padStart(2, '0')}:${(m || '00').padStart(2, '0')}`;
  };

  return { start: formatTime(parts[0]), end: formatTime(parts[1]) };
}

// Normalize lesson type
export function normalizeLessonType(type: string): string {
  const map: Record<string, string> = {
    'Л': 'Лекция',
    'П': 'Практика',
    'ПЗ': 'Практика',
    'ЛЗ': 'Лабораторная',
    '-': 'Другое',
  };
  return map[type.trim()] || type.trim() || 'Другое';
}

// Parse weeks range "1-12" → { weekStart: 1, weekEnd: 12 }
export function parseWeeks(weeks: string): { weekStart: number; weekEnd: number } {
  if (!weeks || weeks === '-') return { weekStart: 1, weekEnd: 18 };
  const parts = weeks.split('-');
  return {
    weekStart: parseInt(parts[0]) || 1,
    weekEnd: parseInt(parts[1] || parts[0]) || 18,
  };
}
