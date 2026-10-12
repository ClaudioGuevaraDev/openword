// Recuperación automática: copia periódica de los documentos con cambios en
// userData/recovery. Al guardar o cerrar normalmente se borra; si la app se cierra de forma
// inesperada, al iniciar se vuelven a abrir.
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { errnoCode } from '@shared/errors';
import { logError } from '../log';

// Cada campo tiene su valor por defecto: un JSON dañado no debe costar el documento.
const RecoveryMetaSchema = z.object({
  displayName: z.string().min(1).max(260).catch('Documento recuperado'),
  filePath: z.string().min(1).max(4096).nullable().catch(null),
  savedAt: z.number().finite().catch(0),
});
export type RecoveryMeta = z.infer<typeof RecoveryMetaSchema>;

export interface RecoveredDocument extends RecoveryMeta {
  readonly id: string;
  readonly bytes: Uint8Array;
}

const SAFE_ID = /^[a-zA-Z0-9-]{8,64}$/;

/** Escritura con archivo temporal y rename: nunca queda un archivo a medio escribir. */
async function writeAtomic(path: string, data: Uint8Array | string): Promise<void> {
  await writeFile(`${path}.tmp`, data);
  await rename(`${path}.tmp`, path);
}

export class RecoveryStore {
  constructor(private readonly dir: string) {}

  async write(id: string, bytes: Uint8Array, meta: Omit<RecoveryMeta, 'savedAt'>): Promise<void> {
    if (!SAFE_ID.test(id)) throw new Error('id de recuperación inválido');
    await mkdir(this.dir, { recursive: true });
    await writeAtomic(join(this.dir, `${id}.docx`), bytes);
    await writeAtomic(
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
    // El .docx es lo que importa: sin él no hay nada que recuperar; sin el .json (o con uno
    // dañado por un cierre a mitad de escritura) se recupera con datos por defecto.
    for (const name of names.filter((n) => n.endsWith('.docx'))) {
      const id = name.slice(0, -5);
      if (!SAFE_ID.test(id)) continue;
      let buffer: Buffer;
      try {
        buffer = await readFile(join(this.dir, name));
      } catch (error) {
        logError('recovery', error);
        continue;
      }
      if (buffer.byteLength === 0) {
        await this.discard(id);
        continue;
      }
      out.push({ id, ...(await this.readMeta(id)), bytes: new Uint8Array(buffer) });
    }
    // .json sin su .docx: restos de una copia incompleta.
    for (const name of names.filter((n) => n.endsWith('.json'))) {
      const id = name.slice(0, -5);
      if (SAFE_ID.test(id) && !names.includes(`${id}.docx`)) await this.discard(id);
    }
    return out.sort((a, b) => b.savedAt - a.savedAt);
  }

  private async readMeta(id: string): Promise<RecoveryMeta> {
    let raw: unknown = {};
    try {
      raw = JSON.parse(await readFile(join(this.dir, `${id}.json`), 'utf8'));
    } catch (error) {
      if (errnoCode(error) !== 'ENOENT') logError('recovery', error);
    }
    const parsed = RecoveryMetaSchema.safeParse(raw);
    return parsed.success ? parsed.data : RecoveryMetaSchema.parse({});
  }

  /** La copia pasa a pertenecer a otra ventana (la que muestra el documento recuperado). */
  async adopt(oldId: string, newId: string): Promise<void> {
    if (!SAFE_ID.test(oldId) || !SAFE_ID.test(newId)) return;
    for (const ext of ['.docx', '.json'])
      await rename(join(this.dir, oldId + ext), join(this.dir, newId + ext)).catch((error: unknown) => {
        if (errnoCode(error) !== 'ENOENT') logError('recovery', error);
      });
  }
}
