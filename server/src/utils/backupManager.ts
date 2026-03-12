import { PrismaClient } from '@prisma/client';
import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function createAutoBackup(prisma: PrismaClient, source: 'auto:midnight' | 'auto:noon' = 'auto:noon'): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    // Check if Backup table exists
    try {
      await prisma.$queryRaw`SELECT 1 FROM "Backup" LIMIT 1`;
    } catch (tableErr: any) {
      console.warn('⚠️ Backup table not initialized, skipping auto-backup');
      return { success: false, message: 'Backup table not initialized', error: 'Table does not exist' };
    }

    const backupDir = ensureBackupDir();
    const backupName = generateBackupName();
    const backupPath = path.join(backupDir, backupName);

    // Get database connection string from environment
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error('❌ DATABASE_URL не установлена');
      return { success: false, message: 'DATABASE_URL not set', error: 'Configuration error' };
    }

    // Try to find pg_dump in common locations
    let pgDumpCmd = 'pg_dump';
    const commonPaths = [
      '/usr/bin/pg_dump',
      '/usr/local/bin/pg_dump',
      'C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
    ];

    for (const cmdPath of commonPaths) {
      try {
        if (fs.existsSync(cmdPath)) {
          pgDumpCmd = cmdPath;
          break;
        }
      } catch (e) {
        // continue
      }
    }

    console.log(`📦 Creating backup: ${backupName}...`);

    // Create backup using pg_dump
    const result = spawnSync(pgDumpCmd, [dbUrl, '-Fc', '-f', backupPath], {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120000, // 2 minutes timeout
    });

    if (result.error) {
      console.error('❌ pg_dump spawn error:', result.error);
      return {
        success: false,
        message: 'Failed to spawn pg_dump',
        error: result.error.message,
      };
    }

    if (result.status !== 0) {
      console.error('❌ pg_dump exit code:', result.status);
      console.error('📝 stderr:', result.stderr);
      return {
        success: false,
        message: `pg_dump failed with code ${result.status}`,
        error: result.stderr || 'Unknown error',
      };
    }

    // Check if file was created
    if (!fs.existsSync(backupPath)) {
      console.error('❌ Backup file was not created');
      return {
        success: false,
        message: 'Backup file not created',
        error: 'File creation failed',
      };
    }

    const stats = fs.statSync(backupPath);
    if (stats.size === 0) {
      console.warn('⚠️ Backup file is empty');
      fs.unlinkSync(backupPath);
      return {
        success: false,
        message: 'Backup file is empty',
        error: 'File is zero bytes',
      };
    }

    const fileSize = stats.size;

    // Get current counts
    const [userCount, groupCount, lessonCount] = await Promise.all([
      prisma.user.count(),
      prisma.group.count(),
      prisma.lesson.count(),
    ]);

    // Record in database
    const backup = await prisma.backup.create({
      data: {
        name: backupName,
        fileSize,
        userCount,
        groupCount,
        lessonCount,
        source,
        filePath: backupPath,
      },
    });

    console.log(`✅ Backup created successfully: ${backupName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`   - Users: ${userCount}, Groups: ${groupCount}, Lessons: ${lessonCount}`);

    return {
      success: true,
      message: `Backup created: ${backupName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`,
    };
  } catch (err: any) {
    console.error('❌ Auto-backup error:', err);
    return {
      success: false,
      message: 'Backup creation failed',
      error: err.message || 'Unknown error',
    };
  }
}

// Helper: Get or create backups directory
function ensureBackupDir(): string {
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    console.log(`📁 Creating backups directory: ${backupDir}`);
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
}

// Helper: Generate backup filename with timestamp
function generateBackupName(): string {
  const now = new Date();
  return `backup-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}.sql`;
}

// Helper: Cleanup old backups (keep only last N backups)
export async function cleanupOldBackups(prisma: PrismaClient, keepCount: number = 30): Promise<{ deleted: number; freedSpaceMB: number }> {
  try {
    const allBackups = await prisma.backup.findMany({
      orderBy: { createdAt: 'desc' },
    });

    if (allBackups.length <= keepCount) {
      console.log(`📊 BackupCleanup: ${allBackups.length} backups (no cleanup needed)`);
      return { deleted: 0, freedSpaceMB: 0 };
    }

    const toDelete = allBackups.slice(keepCount);
    let freedBytes = 0;

    for (const backup of toDelete) {
      try {
        if (fs.existsSync(backup.filePath)) {
          freedBytes += fs.statSync(backup.filePath).size;
          fs.unlinkSync(backup.filePath);
        }
        await prisma.backup.delete({ where: { id: backup.id } });
      } catch (err) {
        console.error(`⚠️ Failed to delete backup ${backup.name}:`, err);
      }
    }

    console.log(`🗑️ Cleanup: Deleted ${toDelete.length} old backups, freed ${(freedBytes / 1024 / 1024).toFixed(2)} MB`);
    return { deleted: toDelete.length, freedSpaceMB: freedBytes / 1024 / 1024 };
  } catch (err: any) {
    console.error('❌ Backup cleanup error:', err);
    return { deleted: 0, freedSpaceMB: 0 };
  }
}
