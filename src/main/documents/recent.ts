// Documentos recientes: JSON en userData + lista del SO (Jump List / menú Recientes).
import { app } from 'electron';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { z } from 'zod';
import { errnoCode } from '@shared/errors';
import type { RecentFile } from '@shared/ipc-contract';
import { logError } from '../log';

const MAX_RECENT = 20;

const RecentFileSchema = z.object({
  path: z.string().min(1).max(4096),
  name: z.string().max(1024),
  folder: z.string().max(4096),
  openedAt: z.number().finite(),
}) satisfies z.ZodType<RecentFile>;

/** Entradas válidas de un recent.json (las dañadas se descartan una a una). */
export function parseRecentFiles(raw: unknown): RecentFile[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    const parsed = RecentFileSchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
}

export class RecentFiles {
  private entries: RecentFile[] | undefined;
  private readonly file = join(app.getPath('userData'), 'recent.json');

  async list(): Promise<RecentFile[]> {
    if (!this.entries) {
      try {
        this.entries = parseRecentFiles(JSON.parse(await readFile(this.file, 'utf8')));
      } catch (error) {
        if (errnoCode(error) !== 'ENOENT') logError('recent', error);
        this.entries = [];
      }
    }
    return this.entries;
  }

  async add(path: string): Promise<void> {
    const current = await this.list();
    const entry: RecentFile = { path, name: basename(path), folder: dirname(path), openedAt: Date.now() };
    this.entries = [entry, ...current.filter((e) => e.path !== path)].slice(0, MAX_RECENT);
    app.addRecentDocument(path);
    const temp = `${this.file}.${process.pid}.tmp`;
    try {
      await writeFile(temp, JSON.stringify(this.entries, null, 2));
      await rename(temp, this.file);
    } catch (error) {
      logError('recent', error); // la lista en memoria sigue valiendo para esta sesión
    }
  }

  async has(path: string): Promise<boolean> {
    return (await this.list()).some((e) => e.path === path);
  }
}
