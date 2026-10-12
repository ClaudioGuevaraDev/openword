// Lectura de un documento del disco y decisión de cómo abrirlo.
import CFB from 'cfb';
import { readFile, stat } from 'node:fs/promises';
import { errnoCode, errorMessage } from '@shared/errors';
import { sniffFileKind, type FileKind } from '@shared/file-kinds';

const MAX_DOCUMENT_BYTES = 512 * 1024 * 1024;

export function listCfbStreams(bytes: Uint8Array): string[] {
  return CFB.read(bytes, { type: 'buffer' }).FileIndex.map((entry) => entry.name);
}

export type ReadResult =
  | { readonly ok: true; readonly kind: FileKind; readonly bytes: Uint8Array }
  | {
      readonly ok: false;
      readonly reason: 'not-found' | 'too-large' | 'unreadable';
      readonly message: string;
    };

export async function readDocumentFile(path: string): Promise<ReadResult> {
  try {
    const info = await stat(path);
    if (!info.isFile()) return { ok: false, reason: 'not-found', message: 'No es un archivo.' };
    if (info.size > MAX_DOCUMENT_BYTES)
      return { ok: false, reason: 'too-large', message: 'El archivo supera 512 MB.' };
    const buffer = await readFile(path);
    const bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    return { ok: true, kind: sniffFileKind(bytes, listCfbStreams), bytes };
  } catch (error) {
    const code = errnoCode(error);
    if (code === 'ENOENT')
      return { ok: false, reason: 'not-found', message: 'El archivo no existe o fue movido.' };
    return { ok: false, reason: 'unreadable', message: errorMessage(error) };
  }
}
