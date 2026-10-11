import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { ensureBuiltInStyles } from '../../src/shared/builtin-styles';

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const docx = (body: string, styles: string, extra: Record<string, string> = {}) =>
  zipSync({
    'word/document.xml': strToU8(`<w:document ${W}><w:body>${body}</w:body></w:document>`),
    'word/styles.xml': strToU8(`<w:styles ${W}>${styles}</w:styles>`),
    ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, strToU8(v)])),
  });
const styleIds = (bytes: Uint8Array) =>
  [...strFromU8(unzipSync(bytes)['word/styles.xml']!).matchAll(/w:styleId="([^"]+)"/g)].map((m) => m[1]);

describe('ensureBuiltInStyles', () => {
  it('agrega los estilos integrados usados que faltan (también en notas y encabezados)', () => {
    const input = docx(
      '<w:p><w:pPr><w:pStyle w:val="TOC2"/></w:pPr></w:p><w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/></w:tblPr></w:tbl>',
      '<w:style w:styleId="Normal"/>',
      {
        'word/footnotes.xml': `<w:footnotes ${W}><w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr></w:r></w:footnotes>`,
      },
    );
    const ids = styleIds(ensureBuiltInStyles(input));
    expect(ids).toEqual(expect.arrayContaining(['Normal', 'TOC2', 'TableGrid', 'FootnoteReference']));
    const styles = strFromU8(unzipSync(ensureBuiltInStyles(input))['word/styles.xml']!);
    expect(styles).toMatch(/w:styleId="FootnoteReference".*<w:vertAlign w:val="superscript"\/>/);
    expect(styles).toMatch(/w:styleId="TOC2".*<w:ind w:left="220"\/>/);
  });

  it('no toca estilos ya definidos ni inventa estilos desconocidos', () => {
    const input = docx(
      '<w:p><w:pPr><w:pStyle w:val="TOC1"/></w:pPr><w:r><w:rPr><w:rStyle w:val="MiEstilo"/></w:rPr></w:r></w:p>',
      '<w:style w:styleId="TOC1"><w:name w:val="toc 1"/></w:style>',
    );
    expect(ensureBuiltInStyles(input)).toBe(input);
  });
});
