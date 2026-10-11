// Índice de fuentes instaladas en el sistema. Entrega al motor los BYTES de las fuentes
// reales que usa cada documento, para que HarfBuzz mida igual que Word.
import { execFile } from 'node:child_process';
import { open, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { extname, join } from 'node:path';
import { readSfntFaces, type SfntFace } from './sfnt-names';

export interface IndexedFace extends SfntFace {
  readonly file: string;
}

export interface ResolvedFace {
  readonly family: string;
  readonly weight: number;
  readonly style: 'normal' | 'italic';
  readonly faceIndex: number;
  readonly bytes: Uint8Array;
}

const FONT_EXTENSIONS = new Set(['.ttf', '.otf', '.ttc', '.otc']);
const CACHE_VERSION = 1;
const MAX_FONT_BYTES = 64 * 1024 * 1024;

/** Carpetas de fuentes por sistema operativo. */
export function systemFontDirs(platform: NodeJS.Platform, env: NodeJS.ProcessEnv = process.env): string[] {
  const home = homedir();
  if (platform === 'win32') {
    const windir = env['WINDIR'] ?? 'C:\\Windows';
    const dirs = [join(windir, 'Fonts')];
    if (env['LOCALAPPDATA']) dirs.push(join(env['LOCALAPPDATA'], 'Microsoft', 'Windows', 'Fonts'));
    return dirs;
  }
  if (platform === 'darwin') {
    return [
      '/System/Library/Fonts',
      '/System/Library/Fonts/Supplemental',
      '/Library/Fonts',
      join(home, 'Library', 'Fonts'),
    ];
  }
  return [
    '/usr/share/fonts',
    '/usr/local/share/fonts',
    join(home, '.local', 'share', 'fonts'),
    join(home, '.fonts'),
  ];
}

/** Excluye la caché de fuentes "en la nube" de Office: su licencia no permite reutilizarlas. */
export function isExcludedFontPath(file: string): boolean {
  return /[\\/]CloudFonts[\\/]/i.test(file);
}

async function walk(dir: string, out: string[], depth = 0): Promise<void> {
  if (depth > 6) return;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out, depth + 1);
    else if (FONT_EXTENSIONS.has(extname(entry.name).toLowerCase())) out.push(full);
  }
}

/** Linux: fontconfig conoce todas las carpetas configuradas; si no está, se recorren las típicas. */
function fcListFiles(): Promise<string[] | null> {
  return new Promise((resolve) => {
    execFile(
      'fc-list',
      ['--format', '%{file}\n'],
      { maxBuffer: 32 << 20, timeout: 15_000 },
      (err, stdout) => {
        if (err) return resolve(null);
        resolve([
          ...new Set(stdout.split('\n').filter((f) => FONT_EXTENSIONS.has(extname(f).toLowerCase()))),
        ]);
      },
    );
  });
}

export async function listSystemFontFiles(platform: NodeJS.Platform = process.platform): Promise<string[]> {
  const files: string[] = [];
  if (platform === 'linux') {
    const fromFc = await fcListFiles();
    if (fromFc) files.push(...fromFc);
  }
  if (files.length === 0) for (const dir of systemFontDirs(platform)) await walk(dir, files);
  return [...new Set(files)].filter((f) => !isExcludedFontPath(f)).sort();
}

async function facesOfFile(file: string): Promise<SfntFace[]> {
  const handle = await open(file, 'r');
  try {
    return await readSfntFaces(async (offset, length) => {
      const buf = Buffer.alloc(length);
      const { bytesRead } = await handle.read(buf, 0, length, offset);
      return new Uint8Array(buf.buffer, buf.byteOffset, bytesRead);
    });
  } finally {
    await handle.close();
  }
}

interface CacheFile {
  readonly version: number;
  readonly files: Record<string, { size: number; mtimeMs: number; faces: SfntFace[] }>;
}

export class FontIndex {
  private faces: Promise<IndexedFace[]> | undefined;

  constructor(
    private readonly options: {
      readonly cacheFile?: string;
      readonly listFiles?: () => Promise<string[]>;
    } = {},
  ) {}

  /** Construye (o reutiliza) el índice. Solo se vuelve a leer lo que cambió desde la caché. */
  all(): Promise<IndexedFace[]> {
    this.faces ??= this.build();
    return this.faces;
  }

  async families(): Promise<string[]> {
    const names = new Set<string>();
    for (const face of await this.all()) names.add(face.family);
    return [...names].sort((a, b) => a.localeCompare(b));
  }

  /** Caras disponibles para estas familias (coincidencia sin mayúsculas, por nombre legacy o tipográfico). */
  async resolve(families: readonly string[]): Promise<ResolvedFace[]> {
    const faces = await this.all();
    const result: ResolvedFace[] = [];
    for (const requested of new Set(families.map((f) => f.trim()).filter(Boolean))) {
      const wanted = requested.toLowerCase();
      // Preferir el nombre legacy (lo que Word escribe); si no hay, el tipográfico.
      let matches = faces.filter((f) => f.family.toLowerCase() === wanted);
      if (matches.length === 0) matches = faces.filter((f) => f.typographicFamily?.toLowerCase() === wanted);
      const seen = new Set<string>();
      for (const face of matches) {
        const key = `${face.weight}|${face.italic}`;
        if (seen.has(key)) continue;
        seen.add(key);
        try {
          const bytes = await readFile(face.file);
          if (bytes.length > MAX_FONT_BYTES) continue;
          result.push({
            family: requested,
            weight: face.weight,
            style: face.italic ? 'italic' : 'normal',
            faceIndex: face.faceIndex,
            bytes: new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength),
          });
        } catch {
          // Archivo borrado desde que se indexó: se ignora.
        }
      }
    }
    return result;
  }

  private async build(): Promise<IndexedFace[]> {
    const files = await (this.options.listFiles ?? (() => listSystemFontFiles()))();
    const cache = await this.readCache();
    const next: CacheFile = { version: CACHE_VERSION, files: {} };
    const out: IndexedFace[] = [];
    let changed = false;

    for (const file of files) {
      let info;
      try {
        info = await stat(file);
      } catch {
        continue;
      }
      const cached = cache?.files[file];
      let faces: SfntFace[];
      if (cached && cached.size === info.size && cached.mtimeMs === info.mtimeMs) {
        faces = cached.faces;
      } else {
        changed = true;
        try {
          faces = await facesOfFile(file);
        } catch {
          faces = [];
        }
      }
      next.files[file] = { size: info.size, mtimeMs: info.mtimeMs, faces };
      for (const face of faces) out.push({ ...face, file });
    }
    if (changed || Object.keys(cache?.files ?? {}).length !== files.length) await this.writeCache(next);
    return out;
  }

  private async readCache(): Promise<CacheFile | null> {
    if (!this.options.cacheFile) return null;
    try {
      const parsed = JSON.parse(await readFile(this.options.cacheFile, 'utf8')) as CacheFile;
      return parsed.version === CACHE_VERSION ? parsed : null;
    } catch {
      return null;
    }
  }

  private async writeCache(cache: CacheFile): Promise<void> {
    if (!this.options.cacheFile) return;
    await writeFile(this.options.cacheFile, JSON.stringify(cache)).catch(() => undefined);
  }
}
