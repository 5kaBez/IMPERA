import crypto from 'crypto';

const CODE_PERIOD_SEC = 30; // Код меняется каждые 30 секунд

/**
 * Генерирует ротирующий 6-значный код на основе секрета и текущего времени.
 * Аналог TOTP (Time-based One-Time Password).
 */
export function generateCode(secretSeed: string, timestampMs?: number): string {
  const ts = timestampMs ?? Date.now();
  const period = Math.floor(ts / (CODE_PERIOD_SEC * 1000));
  const hmac = crypto
    .createHmac('sha256', secretSeed)
    .update(String(period))
    .digest('hex');
  // Берём 6 цифр из HMAC
  const num = parseInt(hmac.substring(0, 8), 16) % 1000000;
  return num.toString().padStart(6, '0');
}

/**
 * Проверяет код: принимает текущий ИЛИ предыдущий период (на случай задержки ввода).
 */
export function verifyCode(secretSeed: string, code: string): boolean {
  const now = Date.now();
  const current = generateCode(secretSeed, now);
  const previous = generateCode(secretSeed, now - CODE_PERIOD_SEC * 1000);
  return code === current || code === previous;
}

/**
 * Сколько секунд осталось до следующей смены кода.
 */
export function secondsUntilNextCode(): number {
  const now = Date.now();
  const currentPeriodStart = Math.floor(now / (CODE_PERIOD_SEC * 1000)) * (CODE_PERIOD_SEC * 1000);
  const nextPeriodStart = currentPeriodStart + CODE_PERIOD_SEC * 1000;
  return Math.ceil((nextPeriodStart - now) / 1000);
}

/**
 * Генерирует случайный секрет для новой сессии.
 */
export function generateSessionSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ===== Хеш-цепочка (blockchain-like tamper protection) =====

/**
 * Вычисляет хеш записи посещения.
 * Цепочка: каждый хеш зависит от предыдущего → подделать задним числом невозможно.
 */
export function computeAttendanceHash(
  studentId: number,
  sessionId: number,
  timestamp: string,
  prevHash: string | null
): string {
  const data = `${studentId}:${sessionId}:${timestamp}:${prevHash || 'GENESIS'}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Проверка целостности всей цепочки студента.
 * Если кто-то подменил/удалил/вставил запись — цепочка сломается.
 */
export interface ChainVerification {
  valid: boolean;
  totalRecords: number;
  brokenAtId?: number;
  brokenAtIndex?: number;
}

export function verifyAttendanceChain(
  records: Array<{
    id: number;
    studentId: number;
    sessionId: number;
    checkedInAt: Date;
    hash: string;
    prevHash: string | null;
  }>
): ChainVerification {
  if (records.length === 0) {
    return { valid: true, totalRecords: 0 };
  }

  let prevHash: string | null = null;

  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    // Проверяем, что prevHash совпадает
    if (record.prevHash !== prevHash) {
      return { valid: false, totalRecords: records.length, brokenAtId: record.id, brokenAtIndex: i };
    }

    // Пересчитываем хеш
    const expected = computeAttendanceHash(
      record.studentId,
      record.sessionId,
      record.checkedInAt.toISOString(),
      prevHash
    );

    if (expected !== record.hash) {
      return { valid: false, totalRecords: records.length, brokenAtId: record.id, brokenAtIndex: i };
    }

    prevHash = record.hash;
  }

  return { valid: true, totalRecords: records.length };
}
