// Estilos integrados de Word. El motor usa algunos (p. ej. FootnoteReference al insertar una
// nota, TOC1… en la tabla de contenido) aunque la plantilla en blanco no los define; Word
// ignora un estilo inexistente (la llamada de nota saldría sin superíndice). Al guardar se
// agregan, con la definición estándar de Word (plantilla Normal), los que se usan y faltan.
import { strFromU8, strToU8, zipSync, type Zippable } from 'fflate';
import { unzipBounded } from './zip';

const HIDDEN = '<w:uiPriority w:val="99"/><w:semiHidden/><w:unhideWhenUsed/>';

const tocLevel = (n: number) =>
  `<w:style w:type="paragraph" w:styleId="TOC${n}"><w:name w:val="toc ${n}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:autoRedefine/><w:uiPriority w:val="39"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="100"/>${n > 1 ? `<w:ind w:left="${(n - 1) * 220}"/>` : ''}</w:pPr></w:style>`;

const headerFooter = (id: string, name: string) =>
  `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:tabs><w:tab w:val="center" w:pos="4680"/><w:tab w:val="right" w:pos="9360"/></w:tabs><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:style>`;

const noteText = (id: string, name: string) =>
  `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/>${HIDDEN}<w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>`;

const noteReference = (id: string, name: string) =>
  `<w:style w:type="character" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="DefaultParagraphFont"/>${HIDDEN}<w:rPr><w:vertAlign w:val="superscript"/></w:rPr></w:style>`;

export const BUILT_IN_STYLES: Readonly<Record<string, string>> = {
  FootnoteText: noteText('FootnoteText', 'footnote text'),
  FootnoteReference: noteReference('FootnoteReference', 'footnote reference'),
  EndnoteText: noteText('EndnoteText', 'endnote text'),
  EndnoteReference: noteReference('EndnoteReference', 'endnote reference'),
  ...Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`TOC${i + 1}`, tocLevel(i + 1)])),
  TOCHeading: `<w:style w:type="paragraph" w:styleId="TOCHeading"><w:name w:val="TOC Heading"/><w:basedOn w:val="Heading1"/><w:next w:val="Normal"/><w:uiPriority w:val="39"/><w:unhideWhenUsed/><w:qFormat/><w:pPr><w:outlineLvl w:val="9"/></w:pPr></w:style>`,
  Header: headerFooter('Header', 'header'),
  Footer: headerFooter('Footer', 'footer'),
  Hyperlink: `<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:basedOn w:val="DefaultParagraphFont"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style>`,
  PlaceholderText: `<w:style w:type="character" w:styleId="PlaceholderText"><w:name w:val="Placeholder Text"/><w:basedOn w:val="DefaultParagraphFont"/><w:uiPriority w:val="99"/><w:semiHidden/><w:rPr><w:color w:val="808080"/></w:rPr></w:style>`,
  TableGrid: `<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:basedOn w:val="TableNormal"/><w:uiPriority w:val="39"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders></w:tblPr></w:style>`,
};

const STORY_PART = /^word\/(document|header\d*|footer\d*|footnotes|endnotes|comments)\.xml$/;

/** Ids de estilo usados en el contenido (pStyle, rStyle, tblStyle). */
export function referencedStyleIds(parts: Readonly<Record<string, Uint8Array>>): Set<string> {
  const ids = new Set<string>();
  for (const [name, data] of Object.entries(parts)) {
    if (!STORY_PART.test(name)) continue;
    for (const m of strFromU8(data).matchAll(/<w:(?:pStyle|rStyle|tblStyle)\s+w:val="([^"]+)"/g))
      ids.add(m[1]!);
  }
  return ids;
}

/** Agrega a styles.xml los estilos integrados que el documento usa y no define. */
export function ensureBuiltInStyles(bytes: Uint8Array): Uint8Array {
  const parts = unzipBounded(bytes);
  const styles = parts['word/styles.xml'];
  if (!styles) return bytes;
  const xml = strFromU8(styles);
  const defined = new Set([...xml.matchAll(/w:styleId="([^"]+)"/g)].map((m) => m[1]!));
  const missing = [...referencedStyleIds(parts)].filter((id) => !defined.has(id) && BUILT_IN_STYLES[id]);
  // TOCHeading se basa en Heading1: solo si existe.
  const toAdd = missing.filter((id) => id !== 'TOCHeading' || defined.has('Heading1'));
  if (toAdd.length === 0 || !xml.includes('</w:styles>')) return bytes;
  const patched = xml.replace('</w:styles>', `${toAdd.map((id) => BUILT_IN_STYLES[id]).join('')}</w:styles>`);
  const out: Zippable = {};
  for (const [name, data] of Object.entries(parts)) {
    if (name.endsWith('/')) continue;
    out[name] = name === 'word/styles.xml' ? strToU8(patched) : data;
  }
  return zipSync(out, { level: 6 });
}
