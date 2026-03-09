/**
 * GUU Schedule Auto-Importer
 * Downloads schedule files from guu.ru, parses them, and imports into IMPERA.
 */

import { PrismaClient } from '@prisma/client';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { parseGUUScheduleFiles, recordsToXlsxBuffer, type FileInput } from './guuParser';
import { parseExcelSchedule } from './excelParser';

const GUU_SCHEDULE_URL = 'https://guu.ru/student/schedule/';

// File mapping: GUU label pattern → our filename
const FILE_MAPPINGS = [
  { pattern: /1\s*курс\s*бакалавриат\s*ОФО/i, filename: '1.xlsx' },
  { pattern: /2\s*курс\s*бакалавриат\s*ОФО/i, filename: '2.xlsx' },
  { pattern: /3\s*курс\s*бакалавриат\s*ОФО/i, filename: '3.xlsx' },
  { pattern: /4\s*курс\s*бакалавриат\s*ОФО/i, filename: '4.xlsx' },
  { pattern: /1-5\s*курс\s*бакалавриат\s*ОЗФО/i, filename: 'z.xlsx' },
  { pattern: /1-2\s*курс\s*магистратура\s*ОФО/i, filename: 'm.xlsx' },
];

interface DownloadLink {
  label: string;
  url: string;
  filename: string;
}

/**
 * Fetch HTML from GUU schedule page and extract xlsx download links.
 */
async function scrapeGUULinks(): Promise<DownloadLink[]> {
  const html = await fetchUrl(GUU_SCHEDULE_URL);

  // Parse links: <a href="...xlsx">label</a>
  const linkRegex = /<a\s+[^>]*href=["']([^"']*\.xlsx)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const links: DownloadLink[] = [];
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const url = match[1];
    const label = match[2].replace(/<[^>]*>/g, '').trim();

    for (const mapping of FILE_MAPPINGS) {
      if (mapping.pattern.test(label)) {
        links.push({ label, url, filename: mapping.filename });
        break;
      }
    }
  }

  console.log(`[GUU Import] Found ${links.length} schedule files on guu.ru`);
  return links;
}

/**
 * Fetch URL and return body as string.
 */
function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    proto.get(url, { headers: { 'User-Agent': 'IMPERA-Bot/1.0' } }, (res) => {
      // Follow redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchUrl(res.headers.location).then(resolve).catch(reject);
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      res.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Download file and return as Buffer.
 */
function downloadFile(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // Handle encoded Cyrillic URLs
    const encodedUrl = encodeURI(decodeURI(url));
    const proto = encodedUrl.startsWith('https') ? https : http;
    proto.get(encodedUrl, { headers: { 'User-Agent': 'IMPERA-Bot/1.0' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadFile(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Full auto-import pipeline:
 * 1. Scrape GUU page for download links
 * 2. Download all xlsx files
 * 3. Parse them with GUU parser
 * 4. Convert to unified xlsx
 * 5. Import via existing parseExcelSchedule
 * 6. Save import record + xlsx file
 */
export async function runAutoImport(prisma: PrismaClient, source: 'auto' | 'manual' = 'auto'): Promise<{
  success: boolean;
  importId: number;
  error?: string;
  stats?: any;
}> {
  // Create import record
  const importRecord = await prisma.scheduleImport.create({
    data: { status: 'running', source },
  });

  try {
    console.log(`[GUU Import #${importRecord.id}] Starting ${source} import...`);

    // 1. Scrape download links
    const links = await scrapeGUULinks();
    if (links.length === 0) {
      throw new Error('Не найдены файлы расписания на guu.ru');
    }
    if (links.length < 4) {
      console.warn(`[GUU Import] Warning: found only ${links.length} files (expected 6)`);
    }

    // 2. Download all files
    console.log(`[GUU Import] Downloading ${links.length} files...`);
    const files: FileInput[] = [];
    for (const link of links) {
      console.log(`  Downloading: ${link.label} → ${link.filename}`);
      const buffer = await downloadFile(link.url);
      files.push({ filename: link.filename, buffer });
    }

    // 3. Parse with GUU parser
    console.log(`[GUU Import] Parsing ${files.length} files...`);
    const records = parseGUUScheduleFiles(files);
    if (records.length === 0) {
      throw new Error('Парсер не нашёл записей расписания');
    }

    // 4. Convert to xlsx buffer
    const xlsxBuffer = recordsToXlsxBuffer(records);

    // 5. Save xlsx file to disk
    const importsDir = path.join(process.cwd(), 'imports');
    if (!fs.existsSync(importsDir)) fs.mkdirSync(importsDir, { recursive: true });

    const dateStr = new Date().toISOString().split('T')[0]; // 2026-03-08
    const timeStr = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }).replace(':', '-');
    const fileName = `schedule_${dateStr}_${timeStr}.xlsx`;
    const filePath = path.join(importsDir, fileName);
    fs.writeFileSync(filePath, xlsxBuffer);
    console.log(`[GUU Import] Saved xlsx: ${filePath}`);

    // 6. Import into database
    console.log(`[GUU Import] Importing ${records.length} records into database...`);
    const result = await parseExcelSchedule(xlsxBuffer, prisma);

    // 7. Get stats
    const [institutes, directions, programs, groups] = await Promise.all([
      prisma.institute.count(),
      prisma.direction.count(),
      prisma.program.count(),
      prisma.group.count(),
    ]);

    // 8. Update import record
    await prisma.scheduleImport.update({
      where: { id: importRecord.id },
      data: {
        status: 'success',
        importedRows: result.imported,
        skippedRows: result.skipped,
        institutes,
        directions,
        programs,
        groups,
        filePath: fileName,
        finishedAt: new Date(),
      },
    });

    console.log(`[GUU Import #${importRecord.id}] Done! Imported: ${result.imported}, Skipped: ${result.skipped}`);

    return {
      success: true,
      importId: importRecord.id,
      stats: { ...result, institutes, directions, programs, groups },
    };
  } catch (err: any) {
    console.error(`[GUU Import #${importRecord.id}] Error:`, err.message);

    await prisma.scheduleImport.update({
      where: { id: importRecord.id },
      data: {
        status: 'error',
        error: err.message,
        finishedAt: new Date(),
      },
    });

    return {
      success: false,
      importId: importRecord.id,
      error: err.message,
    };
  }
}
