import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import CFB from 'cfb';
import { strFromU8, unzipSync, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { MAIN_CONTENT_TYPES, sniffFileKind } from '../../src/shared/file-kinds';
import { setBlankPaper, setMainContentType } from '../../src/shared/package-patch';
import { unzipBounded, ZipTooLargeError } from '../../src/shared/zip';

const listCfb = (bytes: Uint8Array) => CFB.read(bytes, { type: 'buffer' }).FileIndex.map((e) => e.name);
const demo = new Uint8Array(
  readFileSync(join(__dirname, '../fixtures/comprehensive-word-element-test.docx')),
);

describe('setMainContentType', () => {
  it('convierte el tipo de la parte principal y conserva todas las demás partes', () => {
    const asTemplate = setMainContentType(demo, 'dotx');
    expect(sniffFileKind(asTemplate, listCfb)).toBe('dotx');
    const back = setMainContentType(asTemplate, 'docx');
    expect(sniffFileKind(back, listCfb)).toBe('docx');

    const before = unzipSync(demo);
    const after = unzipSync(back);
    const files = (z: Record<string, Uint8Array>) =>
      Object.keys(z)
        .filter((k) => !k.endsWith('/'))
        .sort();
    expect(files(after)).toEqual(files(before));
    for (const name of files(before)) {
      if (name === '[Content_Types].xml') continue;
      expect(Buffer.from(after[name]!).equals(Buffer.from(before[name]!)), name).toBe(true);
    }
    expect(strFromU8(after['[Content_Types].xml']!)).toContain(MAIN_CONTENT_TYPES.docx);
  });

  it('no toca el archivo si ya tiene el tipo pedido', () => {
    expect(setMainContentType(demo, 'docx')).toBe(demo);
  });
});

describe('setBlankPaper', () => {
  it('A4 cambia tamaño y márgenes; Carta deja el documento igual', async () => {
    const { blankDocumentBytes } = await import('@docx-editor.dev/core/editor');
    const blank = blankDocumentBytes();
    expect(setBlankPaper(blank, 'letter')).toBe(blank);
    const xml = strFromU8(unzipSync(setBlankPaper(blank, 'a4'))['word/document.xml']!);
    expect(xml).toContain('<w:pgSz w:w="11906" w:h="16838"/>');
    expect(xml).toContain('w:left="1701"');
  });
});

describe('unzipBounded', () => {
  it('rechaza un paquete que se expande por encima del límite sin inflarlo', () => {
    const zipped = zipSync({ 'a.xml': new Uint8Array(4096), 'b.xml': new Uint8Array(4096) });
    expect(Object.keys(unzipBounded(zipped, 10_000))).toEqual(['a.xml', 'b.xml']);
    expect(() => unzipBounded(zipped, 5000)).toThrow(ZipTooLargeError);
  });
});
