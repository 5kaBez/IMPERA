import fs from 'fs';
import path from 'path';

export type MaintenanceSettings = {
  enabled: boolean;
  message: string;
};

const DEFAULT_SETTINGS: MaintenanceSettings = {
  enabled: false,
  message: 'ИДУТ ТЕХНИЧЕСКИЕ РАБОТЫ',
};

function getMaintenanceFilePath() {
  // In dev: __dirname = server/src/utils; in prod: server/dist/utils
  const serverDir = path.resolve(__dirname, '..', '..');
  return path.join(serverDir, 'data', 'maintenance.json');
}

export function readMaintenanceSettings(): MaintenanceSettings {
  const filePath = getMaintenanceFilePath();
  try {
    if (!fs.existsSync(filePath)) return { ...DEFAULT_SETTINGS };
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<MaintenanceSettings> | null;
    return {
      enabled: typeof parsed?.enabled === 'boolean' ? parsed.enabled : DEFAULT_SETTINGS.enabled,
      message: typeof parsed?.message === 'string' && parsed.message.trim().length > 0 ? parsed.message.trim().slice(0, 200) : DEFAULT_SETTINGS.message,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function writeMaintenanceSettings(next: MaintenanceSettings): void {
  const filePath = getMaintenanceFilePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const payload: MaintenanceSettings = {
    enabled: !!next.enabled,
    message: (next.message || DEFAULT_SETTINGS.message).trim().slice(0, 200) || DEFAULT_SETTINGS.message,
  };

  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2), 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

export function updateMaintenanceSettings(patch: Partial<MaintenanceSettings>): MaintenanceSettings {
  const current = readMaintenanceSettings();
  const next: MaintenanceSettings = {
    enabled: typeof patch.enabled === 'boolean' ? patch.enabled : current.enabled,
    message: typeof patch.message === 'string' ? patch.message : current.message,
  };
  writeMaintenanceSettings(next);
  return next;
}
