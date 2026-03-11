/**
 * GUU Schedule Auto-Importer
 * Downloads schedule files from guu.ru, parses them, and imports into IMPERA.
 */

import { PrismaClient } from '@prisma/client';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { parseGUUScheduleFiles, recordsToXlsxBuffer, type FileInput } from './guuParser';
import { parseExcelSchedule } from './excelParser';

const GUU_SCHEDULE_URL = 'https://guu.ru/student/schedule/';

type FileMapping = {
  filename: string;
  patterns: RegExp[];      // all must match to consider the label a candidate
  urlPatterns?: RegExp[];  // optional fallback when label is missing or boilerplate
  exclude?: RegExp[];      // disqualifiers (used to keep 1-5 from matching 1)
};

const FILE_MAPPINGS: FileMapping[] = [
  {
    filename: '1.xlsx',
    patterns: [/1\D*курс/i, /бакалавриат/i, /(?:офо|очн(?![-\s]*заоч))/i],
    exclude: [/\b1\D*[-–—]\D*5\b/i],
  },
  {
    filename: '2.xlsx',
    patterns: [/2\D*курс/i, /бакалавриат/i, /(?:офо|очно)/i],
  },
  {
    filename: '3.xlsx',
    patterns: [/3\D*курс/i, /бакалавриат/i, /(?:офо|очно)/i],
  },
  {
    filename: '4.xlsx',
    patterns: [/4\D*курс/i, /бакалавриат/i, /(?:офо|очно)/i],
  },
  {
    filename: 'z.xlsx',
    patterns: [/1\D*[-–—]\D*5/i, /курс/i, /бакалавриат/i, /(?:озфо|очно[-\s]*заоч)/i],
  },
  {
    filename: 'm.xlsx',
    patterns: [/1\D*[-–—]\D*2/i, /курс/i, /магистратура/i, /(?:офо|очно)/i],
  },
];

interface DownloadLink {
  label: string;
  url: string;
  filename?: string;
}

const resolveUrl = (rawUrl: string, base: string) => {
  try {
    return new URL(rawUrl, base).toString();
  } catch {
    return rawUrl;
  }
};

const normalizeForMatching = (input: string) => {
  if (!input) return '';
  try {
    return decodeURIComponent(input.replace(/\+/g, ' ')).toLowerCase();
  } catch {
    return input.toLowerCase();
  }
};

const cleanLabel = (raw: string) => {
  const decoded = (() => {
    try {
      return decodeURIComponent(raw.replace(/\+/g, ' '));
    } catch {
      return raw;
    }
  })();
  return decoded
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const matchesAll = (source: string, patterns: RegExp[]) => patterns.every(pattern => pattern.test(source));

const matchLinkToFilename = (link: DownloadLink) => {
  const normalizedLabel = cleanLabel(link.label).toLowerCase();
  const normalizedUrl = normalizeForMatching(link.url);

  for (const mapping of FILE_MAPPINGS) {
    if (mapping.exclude?.some(pattern => pattern.test(normalizedLabel) || pattern.test(normalizedUrl))) {
      continue;
    }

    const labelMatch = matchesAll(normalizedLabel, mapping.patterns);
    const urlMatch = mapping.urlPatterns ? matchesAll(normalizedUrl, mapping.urlPatterns) : false;

    if (labelMatch || urlMatch) {
      return mapping.filename;
    }
  }

  return null;
};

const extractLinksFromHtml = (html: string): DownloadLink[] => {
  const links: DownloadLink[] = [];
  const seen = new Set<string>();

  const anchorRegex = /<a\s+[^>]*href=("|')([^"']*\.(?:xlsx|xls|zip)(?:\?[^"']*)?)\1[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorRegex.exec(html)) !== null) {
    const rawUrl = match[2];
    const href = resolveUrl(rawUrl, GUU_SCHEDULE_URL);
    if (seen.has(href)) continue;
    seen.add(href);

    const label = cleanLabel(match[3] || path.basename(href));
    if (!label && !href) continue;
    links.push({ label, url: href });
  }

  const urlOnlyRegex = /https?:\/\/[^"'\s]+\.(?:xlsx|xls|zip)(?:\?[^"'\s]*)?/gi;
  while ((match = urlOnlyRegex.exec(html)) !== null) {
    const href = resolveUrl(match[0], GUU_SCHEDULE_URL);
    if (seen.has(href)) continue;
    seen.add(href);

    const label = cleanLabel(path.basename(href));
    links.push({ label, url: href });
  }

  return links;
};

const saveHtmlSnapshot = (html: string, importsDir: string, tag: string) => {
  try {
    const debugDir = path.join(importsDir, 'debug');
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
    const filePath = path.join(debugDir, `${tag}-${Date.now()}.html`);
    fs.writeFileSync(filePath, html, 'utf-8');
  } catch (err) {
    console.warn('[GUU Import] Failed to write html snapshot:', err);
  }
};

const fetchDownloadLinks = async () => {
  const html = await fetchUrl(GUU_SCHEDULE_URL);
  return { html, links: extractLinksFromHtml(html) };
};

/**
 * Fetch URL and return body as string.
 */
function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const requestUrl = resolveUrl(url, GUU_SCHEDULE_URL);
    const proto = requestUrl.startsWith('https') ? https : http;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      Referer: GUU_SCHEDULE_URL,
    };
    proto.get(requestUrl, { headers }, (res) => {
      // Follow redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const nextUrl = resolveUrl(res.headers.location, requestUrl);
        fetchUrl(nextUrl).then(resolve).catch(reject);
        return;
      }

      let stream: NodeJS.ReadableStream = res;
      const encoding = res.headers['content-encoding'];
      if (encoding === 'gzip') stream = res.pipe(zlib.createGunzip());
      else if (encoding === 'deflate') stream = res.pipe(zlib.createInflate());
      else if (encoding === 'br') stream = res.pipe(zlib.createBrotliDecompress());

      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      stream.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Download file and return as Buffer.
 */
function downloadFile(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const requestUrl = resolveUrl(url, GUU_SCHEDULE_URL);
    const proto = requestUrl.startsWith('https') ? https : http;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: '*/*',
      Referer: GUU_SCHEDULE_URL,
    };
    proto.get(requestUrl, { headers }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const nextUrl = resolveUrl(res.headers.location, requestUrl);
        downloadFile(nextUrl).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${requestUrl}`));
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

    const importsDir = path.join(process.cwd(), 'imports');
    if (!fs.existsSync(importsDir)) fs.mkdirSync(importsDir, { recursive: true });
    const dateStr = new Date().toISOString().split('T')[0];
    const dayDir = path.join(importsDir, dateStr);
    const rawDir = path.join(dayDir, 'raw');
    const finalDir = path.join(dayDir, 'final');
    fs.mkdirSync(rawDir, { recursive: true });
    fs.mkdirSync(finalDir, { recursive: true });

    // 1. Scrape download links
    const { html, links } = await fetchDownloadLinks();
    if (links.length === 0) {
      saveHtmlSnapshot(html, importsDir, 'no-links');
      throw new Error('Не найдены файлы расписания на guu.ru');
    }

    const resolvedLinks: DownloadLink[] = [];
    const seen = new Set<string>();
    for (const link of links) {
      const filename = matchLinkToFilename(link);
      if (!filename) continue;
      if (seen.has(filename)) continue;
      resolvedLinks.push({ ...link, filename });
      seen.add(filename);
    }

    const orderedLinks = FILE_MAPPINGS
      .map(mapping => resolvedLinks.find(link => link.filename === mapping.filename))
      .filter((link): link is DownloadLink => Boolean(link));

    if (orderedLinks.length < FILE_MAPPINGS.length) {
      const missing = FILE_MAPPINGS.map(mapping => mapping.filename)
        .filter(filename => !orderedLinks.some(link => link.filename === filename));
      saveHtmlSnapshot(html, importsDir, 'missing-files');
      throw new Error(`Найдено только ${orderedLinks.length} файлов (${missing.join(', ')})`);
    }

    // 2. Download all files
    console.log(`[GUU Import] Downloading ${orderedLinks.length} files...`);
    const files: FileInput[] = [];
    for (const link of orderedLinks) {
      console.log(`  Downloading: ${link.label || link.url} → ${link.filename}`);
      const buffer = await downloadFile(link.url);
      const rawPath = path.join(rawDir, link.filename!);
      fs.writeFileSync(rawPath, buffer);
      files.push({ filename: link.filename!, buffer });
    }
    console.log(`[GUU Import] Raw downloads saved to ${rawDir}`);

    // 3. Parse with GUU parser
    console.log(`[GUU Import] Parsing ${files.length} files...`);
    const records = parseGUUScheduleFiles(files);
    if (records.length === 0) {
      throw new Error('Парсер не нашёл записей расписания');
    }

    // 4. Convert to xlsx buffer
    const xlsxBuffer = recordsToXlsxBuffer(records);

    // 5. Save xlsx file to disk
    const timeStr = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }).replace(':', '-');
    const fileName = `schedule_${dateStr}_${timeStr}.xlsx`;
    const savedPath = path.join(finalDir, fileName);
    fs.writeFileSync(savedPath, xlsxBuffer);
    console.log(`[GUU Import] Saved xlsx: ${savedPath}`);

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
        filePath: path.posix.join(dateStr, 'final', fileName),
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
