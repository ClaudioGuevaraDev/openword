import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { comparePackages } from '../fidelity/compare';

const W =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const rels = (entries: string) =>
  `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${entries}</Relationships>`;
const pkg = (doc: string, relsXml: string, extra: Record<string, Uint8Array> = {}) =>
  zipSync({ 'word/document.xml': strToU8(doc), 'word/_rels/document.xml.rels': strToU8(relsXml), ...extra });
const link = (id: string, url: string) =>
  `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${url}" TargetMode="External"/>`;

describe('comparePackages', () => {
  it('ignora formato, rsid, prefijos y renumeración coherente de relaciones y marcadores', () => {
    const a = pkg(
      `<w:document ${W}>\n  <w:body><w:p w:rsidR="00A1"><w:bookmarkStart w:id="5" w:name="x"/><w:hyperlink r:id="rId7"><w:r><w:t xml:space="preserve">Hola</w:t></w:r></w:hyperlink><w:bookmarkEnd w:id="5"/></w:p></w:body></w:document>`,
      rels(link('rId7', 'https://a.example')),
    );
    const b = pkg(
      `<x:document xmlns:x="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:rel="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><x:body><x:p><x:bookmarkStart x:name="x" x:id="0"/><x:hyperlink rel:id="rId1"><x:r><x:t>Hola</x:t></x:r></x:hyperlink><x:bookmarkEnd x:id="0"/></x:p></x:body></x:document>`,
      rels(link('rId1', 'https://a.example')),
    );
    const diff = comparePackages(a, b);
    expect(diff.changedXml).toEqual([]);
    expect(diff.missingParts).toEqual([]);
  });

  it('detecta texto cambiado, un vínculo que apunta a otro sitio, partes perdidas y binarios alterados', () => {
    const base = (text: string, url: string, img: number[]) =>
      pkg(
        `<w:document ${W}><w:body><w:p><w:hyperlink r:id="rId1"><w:r><w:t>${text}</w:t></w:r></w:hyperlink></w:p></w:body></w:document>`,
        rels(link('rId1', url)),
        {
          'word/media/image1.png': new Uint8Array(img),
        },
      );
    const diff = comparePackages(
      base('Hola', 'https://a.example', [1, 2]),
      base('Adiós', 'https://b.example', [1, 3]),
    );
    expect(diff.changedXml.map((c) => c.part).sort()).toEqual([
      'word/_rels/document.xml.rels',
      'word/document.xml',
    ]);
    expect(diff.changedBinaries).toEqual(['word/media/image1.png']);
    const lost = comparePackages(base('Hola', 'https://a.example', [1]), pkg(`<w:document ${W}/>`, rels('')));
    expect(lost.missingParts).toEqual(['word/media/image1.png']);
  });
});
