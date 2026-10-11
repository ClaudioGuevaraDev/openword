import { readFile } from 'node:fs/promises';
import { mkdtemp, rm, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FontIndex, isExcludedFontPath, systemFontDirs } from '../../src/main/fonts/font-index';
import { readSfntFaces } from '../../src/main/fonts/sfnt-names';

const ASSETS = join(__dirname, '../../node_modules/@docx-editor.dev/fonts/assets');
const reader = (bytes: Uint8Array) => async (offset: number, length: number) =>
  bytes.subarray(offset, offset + length);

describe('readSfntFaces (fuentes OFL reales)', () => {
  it.each([
    ['Carlito-Regular.ttf', 'Carlito', 400, false],
    ['Carlito-BoldItalic.ttf', 'Carlito', 700, true],
    ['LiberationSerif-Italic.ttf', 'Liberation Serif', 400, true],
    ['Caladea-Bold.ttf', 'Caladea', 700, false],
  ])('%s → %s %i italic=%s', async (file, family, weight, italic) => {
    const faces = await readSfntFaces(reader(new Uint8Array(await readFile(join(ASSETS, file)))));
    expect(faces).toHaveLength(1);
    expect(faces[0]).toMatchObject({ faceIndex: 0, family, weight, italic });
  });

  it('lee cada cara de una colección .ttc', async () => {
    const a = new Uint8Array(await readFile(join(ASSETS, 'Carlito-Regular.ttf')));
    const b = new Uint8Array(await readFile(join(ASSETS, 'Caladea-Bold.ttf')));
    const ttc = buildTtc([a, b]);
    const faces = await readSfntFaces(reader(ttc));
    expect(faces.map((f) => [f.faceIndex, f.family, f.weight])).toEqual([
      [0, 'Carlito', 400],
      [1, 'Caladea', 700],
    ]);
  });

  it('ignora archivos que no son fuentes', async () => {
    expect(await readSfntFaces(reader(new TextEncoder().encode('no soy una fuente, solo texto')))).toEqual(
      [],
    );
    expect(await readSfntFaces(reader(new Uint8Array(4)))).toEqual([]);
  });
});

describe('FontIndex', () => {
  let dir: string;
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ow-fonts-'));
    for (const f of [
      'Carlito-Regular.ttf',
      'Carlito-Bold.ttf',
      'Carlito-Italic.ttf',
      'Caladea-Regular.ttf',
    ]) {
      await copyFile(join(ASSETS, f), join(dir, f));
    }
  });
  afterAll(() => rm(dir, { recursive: true, force: true }));

  const index = (cacheFile?: string) =>
    new FontIndex({
      cacheFile,
      listFiles: async () =>
        ['Carlito-Regular.ttf', 'Carlito-Bold.ttf', 'Carlito-Italic.ttf', 'Caladea-Regular.ttf'].map((f) =>
          join(dir, f),
        ),
    });

  it('lista familias y resuelve bytes por familia sin distinguir mayúsculas', async () => {
    const idx = index();
    expect(await idx.families()).toEqual(['Caladea', 'Carlito']);
    const faces = await idx.resolve(['carlito', 'No Existe']);
    expect(faces.map((f) => `${f.family} ${f.weight} ${f.style}`).sort()).toEqual([
      'carlito 400 italic',
      'carlito 400 normal',
      'carlito 700 normal',
    ]);
    expect(faces[0]!.bytes.length).toBeGreaterThan(100_000);
  });

  it('reutiliza la caché en la siguiente ejecución', async () => {
    const cache = join(dir, 'cache.json');
    await index(cache).all();
    const cached = JSON.parse(await readFile(cache, 'utf8'));
    expect(Object.keys(cached.files)).toHaveLength(4);
    expect(await index(cache).families()).toEqual(['Caladea', 'Carlito']);
  });
});

describe('rutas de fuentes del sistema', () => {
  it('conoce las carpetas de cada SO', () => {
    expect(
      systemFontDirs('win32', { WINDIR: 'C:\\Windows', LOCALAPPDATA: 'C:\\Users\\a\\AppData\\Local' })[0],
    ).toContain('Fonts');
    expect(systemFontDirs('darwin')).toContain('/Library/Fonts');
    expect(systemFontDirs('linux')).toContain('/usr/share/fonts');
  });
  it('excluye la caché CloudFonts de Office', () => {
    expect(
      isExcludedFontPath('C:\\Users\\a\\AppData\\Local\\Microsoft\\FontCache\\4\\CloudFonts\\Aptos\\1.ttf'),
    ).toBe(true);
    expect(isExcludedFontPath('C:\\Windows\\Fonts\\calibri.ttf')).toBe(false);
  });
});

/** Arma una colección TrueType (.ttc) a partir de fuentes sueltas, recolocando sus tablas. */
function buildTtc(fonts: Uint8Array[]): Uint8Array {
  const headerSize = 12 + 4 * fonts.length;
  const total = headerSize + fonts.reduce((n, f) => n + f.length, 0);
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x74746366);
  view.setUint32(4, 0x00010000);
  view.setUint32(8, fonts.length);
  let cursor = headerSize;
  fonts.forEach((font, i) => {
    view.setUint32(12 + i * 4, cursor);
    out.set(font, cursor);
    // Los offsets de tabla de un TTC son absolutos: desplazarlos.
    const numTables = new DataView(font.buffer, font.byteOffset).getUint16(4);
    for (let t = 0; t < numTables; t++) {
      const p = cursor + 12 + t * 16 + 8;
      view.setUint32(p, view.getUint32(p) + cursor);
    }
    cursor += font.length;
  });
  return out;
}
