import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { extractDocumentPaths } from '../../src/main/cli-args';

describe('extractDocumentPaths', () => {
  const cwd = resolve('/home/ana/docs');
  it('toma solo documentos, ignora el ejecutable, banderas y otros archivos', () => {
    const argv = [
      '/opt/OpenWord/openword',
      '--no-sandbox',
      'informe.docx',
      'foto.png',
      '/tmp/carta.DOC',
      'out/main/index.js',
    ];
    expect(extractDocumentPaths(argv, cwd)).toEqual([join(cwd, 'informe.docx'), resolve('/tmp/carta.DOC')]);
  });
  it('acepta URLs file:// (Linux/macOS) y elimina duplicados', () => {
    const file = resolve('/tmp/a b.docx');
    expect(extractDocumentPaths(['exe', pathToFileURL(file).href, file], cwd)).toEqual([file]);
  });
  it('reconoce todos los formatos de Word asociados', () => {
    const names = ['a.docx', 'b.docm', 'c.dotx', 'd.dotm', 'e.doc', 'f.rtf', 'g.odt', 'h.txt'];
    expect(extractDocumentPaths(['exe', ...names], cwd)).toHaveLength(7);
  });
});
