import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import CFB from 'cfb';
import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { MAIN_CONTENT_TYPES, sniffFileKind } from '../../src/shared/file-kinds';

const listCfb = (bytes: Uint8Array) => CFB.read(bytes, { type: 'buffer' }).FileIndex.map((e) => e.name);
const fixture = (name: string) => new Uint8Array(readFileSync(join(__dirname, '../fixtures', name)));

function ooxml(contentType: string): Uint8Array {
  return zipSync({
    '[Content_Types].xml': strToU8(
      `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="${contentType}"/></Types>`,
    ),
    'word/document.xml': strToU8('<w:document/>'),
  });
}

function cfbWith(stream: string): Uint8Array {
  const doc = CFB.utils.cfb_new();
  CFB.utils.cfb_add(doc, `/${stream}`, Buffer.from('x'.repeat(5000)));
  return new Uint8Array(CFB.write(doc, { type: 'buffer' }) as Buffer);
}

describe('sniffFileKind', () => {
  it('reconoce documentos reales de Word', () => {
    expect(sniffFileKind(fixture('comprehensive-word-element-test.docx'), listCfb)).toBe('docx');
  });

  it.each(Object.entries(MAIN_CONTENT_TYPES))('distingue %s por el content type principal', (kind, ct) => {
    expect(sniffFileKind(ooxml(ct), listCfb)).toBe(kind);
  });

  it('reconoce ODT por su mimetype', () => {
    const odt = zipSync({
      mimetype: strToU8('application/vnd.oasis.opendocument.text'),
      'content.xml': strToU8('<x/>'),
    });
    expect(sniffFileKind(odt, listCfb)).toBe('odt');
  });

  it('distingue .doc binario de OOXML protegido con contraseña', () => {
    expect(sniffFileKind(cfbWith('WordDocument'), listCfb)).toBe('doc');
    expect(sniffFileKind(cfbWith('EncryptedPackage'), listCfb)).toBe('encrypted');
  });

  it('reconoce RTF, Word XML y HTML aunque se llamen .doc', () => {
    expect(sniffFileKind(strToU8('{\\rtf1\\ansi hola}'), listCfb)).toBe('rtf');
    expect(
      sniffFileKind(
        strToU8(
          '﻿<?xml version="1.0"?><?mso-application progid="Word.Document"?><w:wordDocument xmlns:w="x">',
        ),
        listCfb,
      ),
    ).toBe('word-xml');
    expect(sniffFileKind(strToU8('<!DOCTYPE html><html><body>hola</body></html>'), listCfb)).toBe('html');
  });

  it('devuelve unknown para basura, ZIP ajenos y archivos vacíos', () => {
    expect(sniffFileKind(new Uint8Array(0), listCfb)).toBe('unknown');
    expect(sniffFileKind(strToU8('hola mundo, esto no es Word'), listCfb)).toBe('unknown');
    expect(sniffFileKind(zipSync({ 'a.txt': strToU8('x') }), listCfb)).toBe('unknown');
    const truncated = fixture('comprehensive-word-element-test.docx').subarray(0, 100);
    expect(sniffFileKind(truncated, listCfb)).toBe('unknown');
  });
});
