/**
 * GUU Schedule Parser — TypeScript port of parse_all_sheets.py
 * Parses raw GUU xlsx files (1.xlsx-4.xlsx, z.xlsx, m.xlsx) into unified records.
 */

import XLSX from 'xlsx';

export interface ParsedRecord {
  studyForm: string;
  educationLevel: string;
  course: number;
  institute: string;
  direction: string;
  program: string;
  groupName: string;
  groupNumber: number;
  dayOfWeek: string;
  pairNumber: number | string;
  time: string;
  parity: string;
  subject: string;
  lessonType: string;
  teacher: string;
  room: string;
  weeks: string;
}

const TIME_SLOTS: Record<string, number> = {
  '9.00-10.30': 1, '9.00-10,30': 1, '9,00-10,30': 1,
  '10.40-12.10': 2, '10.40-12,10': 2, '10,40-12,10': 2,
  '12.55-14.25': 3, '12.55-14,25': 3, '12,55-14,25': 3,
  '14.35-16.05': 4, '14.35-16,05': 4, '14,35-16,05': 4,
  '16.15-17.45': 5, '16.15-17,45': 5, '16,15-17,45': 5,
  '17.55-19.25': 6, '17.55-19,25': 6, '17,55-19,25': 6,
};

const DAY_NAMES = ['ПОНЕДЕЛЬНИК', 'ВТОРНИК', 'СРЕДА', 'ЧЕТВЕРГ', 'ПЯТНИЦА', 'СУББОТА', 'ВОСКРЕСЕНЬЕ'];

function getCellValue(ws: XLSX.WorkSheet, row: number, col: number): string {
  const addr = XLSX.utils.encode_cell({ r: row, c: col });
  const cell = ws[addr];
  return cell?.v != null ? String(cell.v).trim() : '';
}

function isCellMerged(ws: XLSX.WorkSheet, row: number, col: number): boolean {
  const merges = ws['!merges'] || [];
  for (const m of merges) {
    if (row >= m.s.r && row <= m.e.r && col >= m.s.c && col <= m.e.c) {
      return m.s.r !== m.e.r; // Only counts as merged if spans multiple rows
    }
  }
  return false;
}

function getSheetRange(ws: XLSX.WorkSheet): { maxRow: number; maxCol: number } {
  const ref = ws['!ref'];
  if (!ref) return { maxRow: 0, maxCol: 0 };
  const range = XLSX.utils.decode_range(ref);
  return { maxRow: range.e.r + 1, maxCol: range.e.c + 1 };
}

// ===== Institute detection =====

function extractInstituteFromProgram(programName: string): string {
  if (!programName || programName === '-') return '';
  const pu = programName.toUpperCase();

  if (['ПРОГРАММ', 'КОМПЬЮТЕР', 'ДАННЫХ', 'СЕТЕВЫЕ', 'СЕТИ'].some(kw => pu.includes(kw)))
    return 'Институт информационных систем';
  if (pu.includes('ИНФОРМАТИКА') && !pu.includes('БИЗНЕС'))
    return 'Институт информационных систем';
  if (['ИНФОРМАТИК', 'ИНФОРМАЦ'].some(kw => pu.includes(kw)))
    return 'Институт информационных систем';
  if (['БУХГАЛТЕР', 'УЧЕТ', 'АУДИТ', 'ЭКОНОМИ', 'ФИНАНС', 'НАЛОГ', 'СТАТИСТИ'].some(kw => pu.includes(kw)))
    return 'Институт экономики и финансов';
  if (['ГОСУДАРСТВЕН', 'МУНИЦИПАЛЬ', 'ПРАВО', 'ЮРИД', 'БЕЗОПАСНОСТ', 'ТАМОЖЕН'].some(kw => pu.includes(kw)))
    return 'Институт государственного управления и права';
  if (['ПЕРСОНАЛ', 'СОЦИАЛЬ', 'КОММУНИКАЦ', 'СВЯЗИ', 'ОБРАЗОВАТ', 'ПСИХОЛОГ', 'ТУРИЗМ'].some(kw => pu.includes(kw)))
    return 'Институт управления персоналом, социальных и бизнес-коммуникаций';
  if (pu.includes('БИЗНЕС') && !pu.includes('ИНФОРМАТИКА'))
    return 'Институт управления персоналом, социальных и бизнес-коммуникаций';
  if (['МАРКЕТИНГ', 'РЕКЛАМ', 'ТОРГОВЛ', 'РОЗНИЦА', 'ПРОДАЖ'].some(kw => pu.includes(kw)))
    return 'Институт маркетинга';
  if (['МЕНЕДЖМЕНТ', 'ПРОИЗВОД', 'ЛОГИСТИК', 'КАЧЕСТВО', 'ОПЕРАЦИОН', 'СТРАТЕГИ', 'ЭНЕРГЕТИ', 'ПРОЕКТ'].some(kw => pu.includes(kw)))
    return 'Институт отраслевого менеджмента';
  return '';
}

function getInstituteName(sheetName: string, programName = '', directionName = ''): string {
  const sl = sheetName.toLowerCase();
  const pu = programName.toUpperCase();
  const du = directionName.toUpperCase();

  if (sl.includes('игуип')) {
    if (du.includes('ЭКОНОМИК') || du.includes('ФИНАНС')) return 'Институт экономики и финансов';
    return 'Институт государственного управления и права';
  }
  if (sl.includes('иэф') || sl.includes('иэи')) return 'Институт экономики и финансов';
  if (sl.includes('иом') && sl.includes('им')) {
    if (du.includes('ИННОВАТИК')) return 'Институт отраслевого менеджмента';
    if (du.includes('МАРКЕТИНГ') || du.includes('РЕКЛАМ')) return 'Институт маркетинга';
    if (['МАРКЕТИНГ', 'РЕКЛАМ', 'ЦИФРОВОЙ МАРКЕТИНГ'].some(kw => pu.includes(kw))) return 'Институт маркетинга';
    if (['ЭНЕРГЕТ', 'ИНВЕСТИЦ', 'ПРОЕКТ'].some(kw => pu.includes(kw))) return 'Институт отраслевого менеджмента';
    return 'Институт отраслевого менеджмента';
  }
  if (sl.includes('иом')) return 'Институт отраслевого менеджмента';
  if (sl.includes('им') && !sl.includes('иупс')) return 'Институт маркетинга';
  if (sl.includes('иупс') || sl.includes('иупсибк')) {
    if (pu.includes('ИНФОРМАЦИОНН') || (pu.includes('СИСТЕМЫ') && pu.includes('ИНФОРМАЦ')))
      return 'Институт информационных систем';
    return 'Институт управления персоналом, социальных и бизнес-коммуникаций';
  }
  if (sl.includes('иис')) return 'Институт информационных систем';
  return sheetName;
}

function normalizeMagistracyDirection(direction: string, program: string): [string, string] {
  if (!direction || direction === '-') return [direction, program];
  if (!program || program === '-') program = '';
  direction = direction.replace(/\s+/g, ' ').trim();
  program = program ? program.replace(/\s+/g, ' ').trim() : '';
  if (!program) program = direction;
  // Collapse single-char-separated letters
  if (direction.split(' ').every(w => w.length === 1)) direction = direction.replace(/ /g, '');

  const du = direction.toUpperCase();
  const pu = program.toUpperCase();

  if (['ГОСТИН', 'ИВЕНТ'].some(kw => pu.includes(kw))) return ['Гостиничное дело', program];
  if (['УСТОЙЧИВЫМ', 'УСТОЙЧИВО'].some(kw => pu.includes(kw))) return ['Инноватика', program];
  if (['ФИНАНСОВЫЕ РЫНКИ', 'ФОНДОВ', 'БАНКИНГ', 'КРЕДИТ'].some(kw => pu.includes(kw)) || du.includes('ФИНАНС'))
    return ['Финансы и кредит', program];
  if (['ПРИКЛАДНОЙ АНАЛИЗ', 'ЭКОНОМИКА ИНТЕГРАЦИОН', 'МЕЖДУНАРОДНАЯ ЭКОНОМИКА', 'ИНФОРМАЦИОННО-АНАЛИТИЧЕ', 'АНАЛИТИЧЕСКИЕ ТЕХНОЛОГИИ', 'УПРАВЛЕНЧЕСКАЯ ЭКОНОМИКА'].some(kw => pu.includes(kw)))
    return ['Экономика', program];
  if (['ЦИФРОВОЙ ТРАНСФОРМ', 'ИНФОРМАТИК', 'ИНФОРМАЦ'].some(kw => pu.includes(kw))) {
    if (pu.includes('ТРАНСФОРМ') || pu.includes('ЦИФРОВ')) return ['Бизнес-информатика', program];
  }
  if (['ПРОДЮСИРОВАНИЕ РЕКЛ', 'РЕКЛАМНЫХ КОММУН'].some(kw => pu.includes(kw)))
    return ['Реклама и связи с общественностью', program];
  if (pu.includes('УПРАВЛЕНИЕ ПЕРСОНАЛОМ')) return ['Управление персоналом', program];
  if (['ГОСУДАРСТВЕННОЕ И МУНИЦИПАЛЬНОЕ', 'ГОСУДАРСТВ И МУНИЦ'].some(kw => pu.includes(kw)))
    return ['Государственное и муниципальное управление', program];
  if (['ПРАВОВОЕ ОБЕСПЕЧЕНИЕ', 'ЦИФРОВОЕ ПРАВО'].some(kw => pu.includes(kw)))
    return ['Юриспруденция', program];
  if (['ПОЛИТИЧЕСКИЙ МЕНЕДЖМЕНТ', 'ПОЛИТИЧЕСК'].some(kw => pu.includes(kw)))
    return ['Политология', program];
  if (['МАРКЕТИНГ', 'КИБЕРСПОРТ', 'ФИДЖИ', 'СПОРТИВ', 'ФИТНЕС', 'ТВОРЧЕСК', 'ПРОЕКТИРОВАНИЕ', 'КАПИТАЛИЗАЦИЯ', 'ПРОЕКТ', 'СТРАТЕГИЧЕСКОЕ', 'ЦИФРОВОЙ МАРКЕТИНГ', 'ЭНЕРГЕТИЧЕСКИЙ', 'ИНВЕСТИЦИОННО', 'ПРОИЗВОДСТВЕНН', 'ОРГАНИЗАТОР', 'УПРАВЛЕНИЕ МЕЖДУНАРОДНЫМ', 'УПРАВЛЕНИЕ ПРОЕКТ'].some(kw => pu.includes(kw)))
    return ['Менеджмент', program];

  // Fallback by direction name
  if (['ОТРАСЛЕВ', 'МАРКЕТИНГ'].some(kw => du.includes(kw))) return ['Менеджмент', program];
  if (du.includes('ИНФОРМАЦ')) return ['Бизнес-информатика', program];
  if (du.includes('ЭКОНОМИК')) return ['Экономика', program];
  if (du.includes('ФИНАНС')) {
    let fp = program !== direction ? program : 'Финансы и кредит';
    if (fp === fp.toUpperCase()) fp = fp.charAt(0) + fp.slice(1).toLowerCase();
    return ['Финансы и кредит', fp];
  }
  if (['ГОСУДАРСТВЕН', 'ПРАВО', 'ЮРИСПРУД'].some(kw => du.includes(kw))) return ['Юриспруденция', program];
  if (du.includes('ПОЛИТОЛОГ')) return ['Политология', program];
  if (du.includes('СОЦИОЛОГ')) return ['Социология', program];
  if (du === direction.toUpperCase()) return [direction.charAt(0).toUpperCase() + direction.slice(1).toLowerCase(), program];
  return [direction, program];
}

// ===== Sheet structure detection =====

function findHeaderRow(ws: XLSX.WorkSheet, maxRow: number, maxCol: number): number | null {
  for (let r = 0; r < Math.min(20, maxRow); r++) {
    for (let c = 0; c < maxCol; c++) {
      const v = getCellValue(ws, r, c);
      if (v.includes('№ учебной группы')) return r;
    }
  }
  for (let r = 0; r < Math.min(20, maxRow); r++) {
    for (let c = 0; c < maxCol; c++) {
      const v = getCellValue(ws, r, c);
      if (v.includes('День')) return r;
    }
  }
  return null;
}

function findTimeRow(ws: XLSX.WorkSheet, headerRow: number | null, maxRow: number, maxCol: number): number | null {
  if (headerRow === null) return null;
  for (let c = 0; c < maxCol; c++) {
    if (getCellValue(ws, headerRow, c).includes('День')) return headerRow;
  }
  for (let r = headerRow + 1; r < Math.min(headerRow + 5, maxRow); r++) {
    for (let c = 0; c < Math.min(5, maxCol); c++) {
      if (getCellValue(ws, r, c).includes('День')) return r;
    }
  }
  return headerRow + 1 <= maxRow ? headerRow + 1 : null;
}

function getGroupColumns(ws: XLSX.WorkSheet, headerRow: number, maxCol: number): Record<number, number> {
  const groups: Record<number, number> = {};
  for (let c = 0; c < maxCol; c++) {
    const v = getCellValue(ws, headerRow, c);
    const num = parseInt(v);
    if (!isNaN(num) && num > 0 && num < 100) groups[c] = num;
  }
  if (Object.keys(groups).length === 0 && headerRow > 0) {
    for (let c = 0; c < maxCol; c++) {
      const v = getCellValue(ws, headerRow - 1, c);
      const num = parseInt(v);
      if (!isNaN(num) && num > 0 && num < 100) groups[c] = num;
    }
  }
  return groups;
}

function getGroupMetadata(
  ws: XLSX.WorkSheet, headerRow: number, groupCols: Record<number, number>,
  isMagistracy: boolean
): Record<number, { direction: string; program: string }> {
  const metadata: Record<number, { direction: string; program: string }> = {};
  let directionRow: number | null = null;
  let programRow: number | null = null;

  for (let r = 0; r < headerRow; r++) {
    for (let c = 0; c < 5; c++) {
      const v = getCellValue(ws, r, c).toUpperCase();
      if (v.includes('НАПРАВЛЕНИЕ')) directionRow = r;
      else if (v.includes('ОБРАЗОВАТЕЛЬНАЯ') || v.includes('ПРОГРАММА')) programRow = r;
    }
  }

  let lastDirection = '-';
  const sortedCols = Object.keys(groupCols).map(Number).sort((a, b) => a - b);
  for (const col of sortedCols) {
    let direction = '-';
    let program = '-';

    if (directionRow !== null) {
      const v = getCellValue(ws, directionRow, col);
      if (v && v !== '-') { direction = v; lastDirection = v; }
      else direction = lastDirection;
    }
    if (programRow !== null) {
      const v = getCellValue(ws, programRow, col);
      if (v) program = v;
    }

    if (isMagistracy && direction !== '-') {
      [direction, program] = normalizeMagistracyDirection(direction, program);
    }
    metadata[col] = { direction, program };
  }
  return metadata;
}

function getDayTimeColumns(ws: XLSX.WorkSheet, timeRow: number, maxCol: number) {
  let dayCol: number | null = null;
  let timeCol: number | null = null;
  let weekCol: number | null = null;

  for (let c = 0; c < maxCol; c++) {
    const v = getCellValue(ws, timeRow, c).toLowerCase();
    if (v.includes('день')) dayCol = c;
    else if (v.includes('время')) timeCol = c;
    else if (v.includes('неделя') || v.includes('четн')) weekCol = c;
  }
  return { dayCol, timeCol, weekCol };
}

// ===== Cell content parsing =====

function parseCellContent(cellText: string): { subject: string; lessonType: string; weeks: string; teacher: string; room: string } {
  const lines = cellText.split('\n').map(l => l.trim()).filter(Boolean);
  let subject = '-', lessonType = '-', weeks = '-', teacher = '-', room = '-';
  const firstLine = lines[0] || '';

  // Match (Л/ПЗ/СЕМ + weeks)
  const lessonMatch = firstLine.match(/\(([ЛПСлпс]+)[ПЗИМЕЛ]*\s*(\d+(?:-\d+)?(?:\D\s*\d+(?:-\d+)?)*)\s*н?\)/);
  if (lessonMatch) {
    lessonType = lessonMatch[1].toUpperCase();
    weeks = lessonMatch[2].replace(/\s/g, '');
    subject = firstLine.substring(0, lessonMatch.index).trim();
    const remainder = firstLine.substring((lessonMatch.index || 0) + lessonMatch[0].length).trim();
    if (remainder) {
      const tm = remainder.match(/([А-Я][а-я]+\s+[А-Я]\.[А-Я]\.)/);
      if (tm) {
        teacher = tm[1];
        const after = remainder.substring((tm.index || 0) + tm[0].length).trim();
        if (after) room = after.split(/\s+/)[0];
      } else {
        const rm = remainder.match(/^([А-ТУ-Я\w\-]+\d+)/);
        if (rm) room = rm[1];
      }
    }
  } else {
    subject = firstLine;
  }

  for (const line of lines.slice(1)) {
    if (lessonType === '-' || weeks === '-') {
      const lm = line.match(/\(([ЛПСлпс]+)[ПЗИМЕЛ]*\s*(\d+(?:-\d+)?(?:\D\s*\d+(?:-\d+)?)*)\s*н?\)/);
      if (lm) { lessonType = lm[1].toUpperCase(); weeks = lm[2].replace(/\s/g, ''); }
    }
    if (teacher === '-') {
      const tm = line.match(/([А-Я][а-я]+\s+[А-Я]\.[А-Я]\.)/);
      if (tm) { teacher = tm[1]; continue; }
    }
    if (room === '-') {
      const rm = line.match(/^([А-ТУ-Я\w\-]+\d+(?:\/\d+)?(?:,\s*[А-ТУ-Я\w\-]+\d+)*)/);
      if (rm) { room = rm[1]; continue; }
    }
  }

  return { subject, lessonType, weeks, teacher, room };
}

// ===== Main parser =====

export interface FileInput {
  filename: string; // e.g. "1.xlsx", "z.xlsx", "m.xlsx"
  buffer: Buffer;
}

export function parseGUUScheduleFiles(files: FileInput[]): ParsedRecord[] {
  const allData: ParsedRecord[] = [];

  for (const file of files) {
    const fl = file.filename.toLowerCase();
    let form: string, educationLevel: string, course: number;

    if (fl.startsWith('m.') || fl.startsWith('m_')) {
      form = 'Очная'; educationLevel = 'Магистратура'; course = 1;
    } else if (fl.startsWith('z.') || fl.startsWith('z_')) {
      form = 'Очно-заочная'; educationLevel = 'Бакалавриат';
      const cm = fl.match(/(\d+)/); course = cm ? parseInt(cm[1]) : 1;
    } else {
      form = 'Очная'; educationLevel = 'Бакалавриат';
      const cm = fl.match(/(\d+)/); course = cm ? parseInt(cm[1]) : 1;
    }

    let wb: XLSX.WorkBook;
    try {
      wb = XLSX.read(file.buffer, { type: 'buffer' });
    } catch (e) {
      console.error(`[GUU Parser] Error reading ${file.filename}:`, e);
      continue;
    }

    for (const sheetName of wb.SheetNames) {
      if (['лист1', 'лист', 'sheet1', 'sheet'].includes(sheetName.toLowerCase())) continue;

      const ws = wb.Sheets[sheetName];
      const { maxRow, maxCol } = getSheetRange(ws);
      if (maxRow < 5 || maxCol < 3) continue;

      let sheetCourse = course;
      const sheetForm = form;
      const sheetEduLevel = educationLevel;

      if (educationLevel === 'Магистратура' || form === 'Очно-заочная') {
        const cm = sheetName.toLowerCase().match(/(\d+)\s*(?:к|курс)/);
        if (cm) sheetCourse = parseInt(cm[1]);
      }

      let institute = getInstituteName(sheetName);
      const headerRow = findHeaderRow(ws, maxRow, maxCol);
      const timeRow = findTimeRow(ws, headerRow, maxRow, maxCol);
      if (headerRow === null || timeRow === null) continue;

      const groupCols = getGroupColumns(ws, headerRow, maxCol);
      if (Object.keys(groupCols).length === 0) continue;

      const isMagistracy = sheetEduLevel === 'Магистратура';
      const metadata = getGroupMetadata(ws, headerRow, groupCols, isMagistracy);
      const { dayCol, timeCol, weekCol } = getDayTimeColumns(ws, timeRow, maxCol);
      if (dayCol === null || timeCol === null) continue;

      let currentDay: string | null = null;
      let currentTime: string | null = null;

      for (let r = timeRow + 1; r < maxRow; r++) {
        const dayVal = getCellValue(ws, r, dayCol).toUpperCase();
        if (DAY_NAMES.includes(dayVal)) currentDay = dayVal;

        const timeVal = getCellValue(ws, r, timeCol);
        if (timeVal && timeVal !== '-') currentTime = timeVal;
        const timeToUse = currentTime || timeVal;
        if (!currentDay || !timeToUse || timeToUse === '-') continue;

        const pairNum = TIME_SLOTS[timeToUse] || '-';

        // Determine parity
        let baseParity = '-';
        let hasExplicitParity = false;
        if (weekCol !== null) {
          const wv = getCellValue(ws, r, weekCol).toLowerCase();
          if (wv.startsWith('чет')) { baseParity = '0'; hasExplicitParity = true; }
          else if (wv.startsWith('нечет')) { baseParity = '1'; hasExplicitParity = true; }
        }
        if (!hasExplicitParity) {
          const offset = r - timeRow;
          baseParity = offset > 0 ? (offset % 2 === 1 ? '1' : '0') : '1';
        }

        for (const [colStr, groupNum] of Object.entries(groupCols)) {
          const col = parseInt(colStr);
          const cellText = getCellValue(ws, r, col);
          if (!cellText || cellText === '-') continue;

          const merged = isCellMerged(ws, r, col);
          const { subject, lessonType, weeks, teacher, room } = parseCellContent(cellText);
          const meta = metadata[col] || { direction: '-', program: '-' };

          const parities = merged ? ['1', '0'] : [baseParity];

          for (const parity of parities) {
            let exactInstitute: string;
            if (sheetForm === 'Очно-заочная') {
              exactInstitute = extractInstituteFromProgram(meta.program) || extractInstituteFromProgram(meta.direction) || '';
            } else {
              exactInstitute = getInstituteName(sheetName, meta.program, meta.direction);
            }

            allData.push({
              studyForm: sheetForm,
              educationLevel: sheetEduLevel,
              course: sheetCourse,
              institute: exactInstitute,
              direction: meta.direction,
              program: meta.program,
              groupName: `Группа ${groupNum}`,
              groupNumber: groupNum,
              dayOfWeek: currentDay,
              pairNumber: pairNum,
              time: timeToUse,
              parity,
              subject,
              lessonType,
              teacher,
              room,
              weeks,
            });
          }
        }
      }
    }
  }

  console.log(`[GUU Parser] Parsed ${allData.length} records from ${files.length} files`);
  return allData;
}

/**
 * Convert parsed records to XLSX buffer (schedule_full.xlsx format)
 * that can be fed to the existing parseExcelSchedule function.
 */
export function recordsToXlsxBuffer(records: ParsedRecord[]): Buffer {
  const headers = [
    'Форма обучения', 'Уровень образования', 'Курс', 'Институт', 'Направление', 'Программа',
    'Группа', 'Номер группы', 'День недели', 'Номер пары', 'Время пары',
    'Чётность', 'Предмет', 'Вид пары', 'Преподаватель', 'Номер аудитории', 'Недели'
  ];

  const data = records.map(r => [
    r.studyForm, r.educationLevel, r.course, r.institute, r.direction, r.program,
    r.groupName, r.groupNumber, r.dayOfWeek, r.pairNumber, r.time,
    r.parity, r.subject, r.lessonType, r.teacher, r.room, r.weeks,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Расписание');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}
