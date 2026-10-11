import { mkdtemp, readdir, readFile, rm, stat, writeFile, chmod, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { strToU8, zipSync } from 'fflate';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SaveError, writeDocxAtomic } from '../../src/main/documents/save-atomic';

const docx = (text: string) => zipSync({ 'word/document.xml': strToU8(text) });
let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ow-save-'));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('writeDocxAtomic', () => {
  it('crea y reemplaza el archivo sin dejar temporales', async () => {
    const target = join(dir, 'informe.docx');
    await writeDocxAtomic(target, docx('v1'));
    await writeDocxAtomic(target, docx('v2'));
    expect(Buffer.from(await readFile(target)).equals(Buffer.from(docx('v2')))).toBe(true);
    expect(await readdir(dir)).toEqual(['informe.docx']);
  });

  it('rechaza bytes que no son OOXML y deja el original intacto', async () => {
    const target = join(dir, 'a.docx');
    await writeFile(target, docx('original'));
    await expect(writeDocxAtomic(target, new Uint8Array(0))).rejects.toMatchObject({ code: 'not-ooxml' });
    await expect(
      writeDocxAtomic(target, strToU8('texto plano, no zip, suficientemente largo')),
    ).rejects.toBeInstanceOf(SaveError);
    expect(Buffer.from(await readFile(target)).equals(Buffer.from(docx('original')))).toBe(true);
  });

  it('si falla el reemplazo, conserva el original y limpia el temporal', async () => {
    // Un directorio con el nombre de destino hace fallar rename().
    const target = join(dir, 'carpeta.docx');
    await mkdir(target);
    await writeFile(join(target, 'dentro'), 'x');
    await expect(writeDocxAtomic(target, docx('nuevo'), { sleep: async () => {} })).rejects.toMatchObject({
      code: 'io',
    });
    expect((await readdir(dir)).sort()).toEqual(['carpeta.docx']);
  });

  it.skipIf(process.platform === 'win32')('conserva los permisos del archivo existente', async () => {
    const target = join(dir, 'privado.docx');
    await writeFile(target, docx('v1'));
    await chmod(target, 0o600);
    await writeDocxAtomic(target, docx('v2'));
    expect((await stat(target)).mode & 0o777).toBe(0o600);
  });
});
