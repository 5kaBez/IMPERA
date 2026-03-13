// Normalize institute names from various formats in GUU data
// Keys are stripped of ALL whitespace AND commas for consistent matching
const INSTITUTE_MAP: Record<string, string> = {
  'ГОСУДАРСТВЕННОГОУПРАВЛЕНИЯИПРАВА': 'Институт государственного управления и права',
  'ИНФОРМАЦИОННЫХСИСТЕМ': 'Институт информационных систем',
  'МАРКЕТИНГА': 'Институт маркетинга',
  'ОТРАСЛЕВОГОМЕНЕДЖМЕНТА': 'Институт отраслевого менеджмента',
  'УПРАВЛЕНИЯПЕРСОНАЛОМСОЦИАЛЬНЫХИБИЗНЕС-КОММУНИКАЦИЙ': 'Институт управления персоналом, социальных и бизнес-коммуникаций',
  'ЭКОНОМИКИИФИНАНСОВ': 'Институт экономики и финансов',
};

// Additional partial-match patterns for fuzzy institute detection
const INSTITUTE_KEYWORDS: Array<{ pattern: string; result: string }> = [
  { pattern: 'ГОСУДАРСТВЕНН', result: 'Институт государственного управления и права' },
  { pattern: 'ИНФОРМАЦИОН', result: 'Институт информационных систем' },
  { pattern: 'МАРКЕТИНГ', result: 'Институт маркетинга' },
  { pattern: 'ОТРАСЛЕВОГО', result: 'Институт отраслевого менеджмента' },
  { pattern: 'ПЕРСОНАЛОМ', result: 'Институт управления персоналом, социальных и бизнес-коммуникаций' },
  { pattern: 'БИЗНЕС-КОММУНИКАЦ', result: 'Институт управления персоналом, социальных и бизнес-коммуникаций' },
  { pattern: 'ЭКОНОМИКИ', result: 'Институт экономики и финансов' },
];

export function normalizeInstitute(name: string): string {
  let result = name.trim();
  if (!result) return result;
  // Clean newlines
  result = result.replace(/\r?\n/g, ' ').trim();
  // Handle spaced-out letters (like "М  А  Р  К  Е  Т  И  Н  Г  А")
  const withoutSpaces = result.replace(/\s/g, '');
  if (/^[А-ЯЁA-Z]\s+[А-ЯЁA-Z]/.test(result) && withoutSpaces.length >= 3 && withoutSpaces.length <= result.length / 2 + 1) {
    result = withoutSpaces;
  }
  // Remove multiple spaces
  result = result.replace(/\s{2,}/g, ' ').trim();
  // Try lookup: remove all spaces, commas, and dots — then uppercase for matching
  const lookupKey = result.replace(/[\s,\.]/g, '').toUpperCase();
  if (INSTITUTE_MAP[lookupKey]) {
    return INSTITUTE_MAP[lookupKey];
  }
  // Fuzzy fallback: check if the input contains a known keyword
  for (const { pattern, result: mapped } of INSTITUTE_KEYWORDS) {
    if (lookupKey.includes(pattern)) {
      return mapped;
    }
  }
  return result;
}

// Normalize direction names (remove extra spaces: "М Е Н Е Д Ж М Е Н Т" → "МЕНЕДЖМЕНТ")
export function normalizeDirection(name: string): string {
  let result = name.trim();
  // Normalize newlines first
  result = result.replace(/\r?\n/g, ' ').trim();
  // Check if it's spaced-out letters (single or multiple spaces between each letter)
  // e.g. "М Е Н Е Д Ж М Е Н Т" or "М  Е  Н  Е  Д  Ж  М  Е  Н  Т"
  const withoutSpaces = result.replace(/\s/g, '');
  if (/^[А-ЯЁA-Z]\s+[А-ЯЁA-Z]/.test(result) && withoutSpaces.length >= 3 && withoutSpaces.length <= result.length / 2 + 1) {
    result = withoutSpaces;
  }
  // Remove multiple spaces
  result = result.replace(/\s{2,}/g, ' ').trim();
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

// Map start times to pair numbers
const PAIR_TIME_MAP: Record<string, number> = {
  '09:00': 1,
  '09.00': 1,
  '10:40': 2,
  '10.40': 2,
  '12:55': 3,
  '12.55': 3,
  '14:35': 4,
  '14.35': 4,
  '16:15': 5,
  '16.15': 5,
  '17:55': 6,
  '17.55': 6,
};

/**
 * Determine pair number by start time
 * Tries to match timeStart to standard GUU schedule times
 * Falls back to parsing the time string to match hours:minutes patterns
 */
export function getPairNumberByTime(timeStart: string): number {
  if (!timeStart) return 1;
  
  const cleaned = timeStart.trim();
  
  // Exact match
  if (PAIR_TIME_MAP[cleaned]) {
    return PAIR_TIME_MAP[cleaned];
  }
  
  // Try to extract hours:minutes and match
  const match = cleaned.match(/^(\d{1,2})[:.](\d{2})/);
  if (match) {
    const hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    
    // Check against known times
    if (hours === 9 && minutes === 0) return 1;
    if (hours === 10 && minutes === 40) return 2;
    if (hours === 12 && minutes === 55) return 3;
    if (hours === 14 && minutes === 35) return 4;
    if (hours === 16 && minutes === 15) return 5;
    if (hours === 17 && minutes === 55) return 6;
    
    // Fuzzy matching: check which standard time is closest
    const times = [
      { hour: 9, min: 0, pair: 1 },
      { hour: 10, min: 40, pair: 2 },
      { hour: 12, min: 55, pair: 3 },
      { hour: 14, min: 35, pair: 4 },
      { hour: 16, min: 15, pair: 5 },
      { hour: 17, min: 55, pair: 6 },
    ];
    
    let closest = times[0];
    let minDiff = Math.abs((closest.hour * 60 + closest.min) - (hours * 60 + minutes));
    
    for (const t of times) {
      const diff = Math.abs((t.hour * 60 + t.min) - (hours * 60 + minutes));
      if (diff < minDiff) {
        minDiff = diff;
        closest = t;
      }
    }
    
    return closest.pair;
  }
  
  return 1; // Default fallback
}
