// Recuperación automática: copia periódica de los documentos con cambios en
// userData/recovery. Al guardar o cerrar normalmente se borra; si la app se cierra de forma
// inesperada, al iniciar se vuelven a abrir.
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface RecoveryMeta {
  readonly displayName: string;
  readonly filePath: string | null;
  readonly savedAt: number;
}

export interface RecoveredDocument extends RecoveryMeta {
  readonly id: string;
  readonly bytes: Uint8Array;
}

const SAFE_ID = /^[a-zA-Z0-9-]{8,64}$/;

export class RecoveryStore {
  constructor(private readonly dir: string) {}

  async write(id: string, bytes: Uint8Array, meta: Omit<RecoveryMeta, 'savedAt'>): Promise<void> {
    if (!SAFE_ID.test(id)) throw new Error('id de recuperación inválido');
    await mkdir(this.dir, { recursive: true });
    const docx = join(this.dir, `${id}.docx`);
    await writeFile(`${docx}.tmp`, bytes);
    await rename(`${docx}.tmp`, docx);
    await writeFile(
      join(this.dir, `${id}.json`),
      JSON.stringify({ ...meta, savedAt: Date.now() } satisfies RecoveryMeta),
    );
  }

  async discard(id: string): Promise<void> {
    if (!SAFE_ID.test(id)) return;
    await rm(join(this.dir, `${id}.docx`), { force: true });
    await rm(join(this.dir, `${id}.json`), { force: true });
  }

  /** Copias que quedaron de una sesión anterior (las más recientes primero). */
  async list(): Promise<RecoveredDocument[]> {
    let names: string[];
    try {
      names = await readdir(this.dir);
    } catch {
      return [];
    }
    const out: RecoveredDocument[] = [];
    for (const name of names.filter((n) => n.endsWith('.json'))) {
      const id = name.slice(0, -5);
      if (!SAFE_ID.test(id)) continue;
      try {
        const meta = JSON.parse(await readFile(join(this.dir, name), 'utf8')) as RecoveryMeta;
        const buffer = await readFile(join(this.dir, `${id}.docx`));
        out.push({
          id,
          displayName: String(meta.displayName),
          filePath: meta.filePath ?? null,
          savedAt: Number(meta.savedAt) || 0,
          bytes: new Uint8Array(buffer),
        });
      } catch {
        await this.discard(id); // copia incompleta
      }
    }
    return out.sort((a, b) => b.savedAt - a.savedAt);
  }

  /** La copia pasa a pertenecer a otra ventana (la que muestra el documento recuperado). */
  async adopt(oldId: string, newId: string): Promise<void> {
    if (!SAFE_ID.test(oldId) || !SAFE_ID.test(newId)) return;
    await rename(join(this.dir, `${oldId}.docx`), join(this.dir, `${newId}.docx`)).catch(() => undefined);
    await rename(join(this.dir, `${oldId}.json`), join(this.dir, `${newId}.json`)).catch(() => undefined);
  }
}
