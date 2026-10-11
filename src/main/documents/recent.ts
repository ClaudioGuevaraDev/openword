// Documentos recientes: JSON en userData + lista del SO (Jump List / menú Recientes).
import { app } from 'electron';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import type { RecentFile } from '@shared/ipc-contract';

const MAX_RECENT = 20;

export class RecentFiles {
  private entries: RecentFile[] | undefined;
  private readonly file = join(app.getPath('userData'), 'recent.json');

  async list(): Promise<RecentFile[]> {
    if (!this.entries) {
      try {
        const parsed = JSON.parse(await readFile(this.file, 'utf8')) as RecentFile[];
        this.entries = Array.isArray(parsed) ? parsed.filter((e) => typeof e?.path === 'string') : [];
      } catch {
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
    await writeFile(this.file, JSON.stringify(this.entries, null, 2)).catch(() => undefined);
  }

  async has(path: string): Promise<boolean> {
    return (await this.list()).some((e) => e.path === path);
  }
}
