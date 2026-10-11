// Guardado atómico: si algo falla a mitad de camino, el archivo original queda intacto.
import { randomBytes } from 'node:crypto';
import { constants } from 'node:fs';
import { open, rename, stat, unlink, chmod } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];
const RETRYABLE = new Set(['EPERM', 'EBUSY', 'EACCES']);

export class SaveError extends Error {
  constructor(
    message: string,
    readonly code: 'not-ooxml' | 'io',
    options?: { cause?: unknown },
  ) {
    super(message, options);
  }
}

export interface AtomicWriteDeps {
  /** Espera entre reintentos (inyectable en pruebas). */
  readonly sleep?: (ms: number) => Promise<void>;
  readonly platform?: NodeJS.Platform;
}

export async function writeDocxAtomic(
  target: string,
  bytes: Uint8Array,
  deps: AtomicWriteDeps = {},
): Promise<void> {
  if (bytes.length < 22 || !ZIP_MAGIC.every((b, i) => bytes[i] === b)) {
    throw new SaveError('El contenido a guardar no es un paquete OOXML válido.', 'not-ooxml');
  }
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((ok) => setTimeout(ok, ms)));
  const platform = deps.platform ?? process.platform;
  const dir = dirname(target);
  const temp = join(dir, `.~${basename(target)}.${randomBytes(4).toString('hex')}.tmp`);

  // Conservar los permisos del archivo existente (POSIX).
  let mode: number | undefined;
  try {
    mode = (await stat(target)).mode & 0o7777;
  } catch {
    mode = undefined;
  }

  try {
    const handle = await open(temp, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, mode ?? 0o644);
    try {
      await handle.writeFile(bytes);
      await handle.sync();
    } finally {
      await handle.close();
    }
    if (mode !== undefined && platform !== 'win32') await chmod(temp, mode);

    // En Windows, antivirus o el indexador pueden bloquear el archivo un instante.
    for (let attempt = 0; ; attempt++) {
      try {
        await rename(temp, target);
        break;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code ?? '';
        if (attempt >= 5 || !RETRYABLE.has(code)) throw error;
        await sleep(50 * 2 ** attempt);
      }
    }

    if (platform !== 'win32') {
      // Persistir la entrada de directorio (el rename) ante un corte de energía.
      const dirHandle = await open(dir, constants.O_RDONLY).catch(() => null);
      await dirHandle?.sync().catch(() => undefined);
      await dirHandle?.close();
    }
  } catch (error) {
    await unlink(temp).catch(() => undefined);
    if (error instanceof SaveError) throw error;
    throw new SaveError(`No se pudo guardar "${basename(target)}": ${(error as Error).message}`, 'io', {
      cause: error,
    });
  }
}
