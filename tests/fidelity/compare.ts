// Comparación semántica de dos paquetes .docx: mismas partes, binarios idénticos y XML
// equivalente tras normalizar lo que no cambia el significado (indentación, orden de
// atributos, prefijos de namespace, rsid, w14:paraId/textId y xml:space).
import { strFromU8, unzipSync } from 'fflate';
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  preserveOrder: true,
  trimValues: false,
  ignoreDeclaration: true,
  ignorePiTags: true,
  parseTagValue: false,
  parseAttributeValue: false,
});

const IGNORED_ATTRIBUTES = new Set([
  'w:rsid',
  'w:rsidR',
  'w:rsidRPr',
  'w:rsidRDefault',
  'w:rsidP',
  'w:rsidDel',
  'w:rsidSect',
  'w:rsidTr',
  'w14:paraId',
  'w14:textId',
  'xml:space',
  'mc:Ignorable',
]);

// Marcas de revisión: su w:id solo debe ser único; Word y el motor los renumeran.
const REVISION_ELEMENTS = new Set([
  'ins',
  'del',
  'moveFrom',
  'moveTo',
  'rPrChange',
  'pPrChange',
  'sectPrChange',
  'tblPrChange',
  'trPrChange',
  'tcPrChange',
  'tblGridChange',
  'numberingChange',
  'cellIns',
  'cellDel',
  'cellMerge',
]);
const WML = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

/** rId → "tipo|destino|modo", para comparar referencias por lo que apuntan y no por su número. */
type RelationshipMap = Map<string, string>;

type Node = Record<string, unknown>;
interface Canon {
  n: string;
  a: [string, string][];
  c: (Canon | { t: string })[];
}

function qualified(name: string, scope: Record<string, string>): string {
  const i = name.indexOf(':');
  if (i < 0) return `{${scope[''] ?? ''}}${name}`;
  const prefix = name.slice(0, i);
  if (prefix === 'xml') return name;
  return `{${scope[prefix] ?? prefix}}${name.slice(i + 1)}`;
}

/** Ids de marcadores renumerados por orden de aparición (inicio y fin quedan emparejados). */
type BookmarkIds = Map<string, string>;

function canon(
  nodes: Node[],
  rels: RelationshipMap,
  bookmarks: BookmarkIds,
  parentScope: Record<string, string> = {},
): (Canon | { t: string })[] {
  const out: (Canon | { t: string })[] = [];
  for (const node of nodes) {
    if ('#text' in node) {
      const text = String(node['#text']);
      if (text.trim() !== '') out.push({ t: text });
      continue;
    }
    const tag = Object.keys(node).find((k) => k !== ':@');
    if (!tag) continue;
    const attrs = (node[':@'] ?? {}) as Record<string, string>;
    const scope = { ...parentScope };
    for (const [a, v] of Object.entries(attrs)) {
      if (a === '@xmlns') scope[''] = v;
      else if (a.startsWith('@xmlns:')) scope[a.slice(7)] = v;
    }
    const name = qualified(tag, scope);
    const isRevision = name.startsWith(`{${WML}}`) && REVISION_ELEMENTS.has(name.slice(WML.length + 2));
    const isBookmark = name === `{${WML}}bookmarkStart` || name === `{${WML}}bookmarkEnd`;
    const clean = Object.entries(attrs)
      .filter(([a]) => !a.startsWith('@xmlns') && !IGNORED_ATTRIBUTES.has(a.slice(1)))
      .map(([a, v]): [string, string] => {
        const key = a.includes(':') ? qualified(a.slice(1), scope) : a.slice(1);
        const value = String(v);
        // Referencias a relaciones (r:id, r:embed…): se comparan por su destino.
        if (isBookmark && key === `{${WML}}id`) {
          if (!bookmarks.has(value)) bookmarks.set(value, `#${bookmarks.size}`);
          return [key, bookmarks.get(value)!];
        }
        return [key, key.startsWith(`{${REL_NS}}`) ? (rels.get(value) ?? `?${value}`) : value];
      })
      .filter(([key]) => !(isRevision && key === `{${WML}}id`))
      .sort(([x], [y]) => x.localeCompare(y));
    out.push({ n: name, a: clean, c: canon(node[tag] as Node[], rels, bookmarks, scope) });
  }
  return out;
}

export interface PackageDiff {
  readonly missingParts: string[];
  readonly addedParts: string[];
  readonly changedBinaries: string[];
  readonly changedXml: { part: string; original: string; saved: string }[];
  readonly xmlEqual: number;
}

const files = (zip: Record<string, Uint8Array>) => Object.keys(zip).filter((k) => !k.endsWith('/'));
const isXml = (name: string) => /\.(xml|rels|vml)$/i.test(name);

export function canonicalXml(xml: string, rels: RelationshipMap = new Map()): string {
  return JSON.stringify(canon(parser.parse(xml) as Node[], rels, new Map()));
}

function relationshipsOf(zip: Record<string, Uint8Array>, part: string): RelationshipMap {
  const slash = part.lastIndexOf('/');
  const relsPath = `${part.slice(0, slash + 1)}_rels/${part.slice(slash + 1)}.rels`;
  const data = zip[relsPath];
  const map: RelationshipMap = new Map();
  if (!data) return map;
  for (const m of strFromU8(data).matchAll(/<Relationship\b[^>]*>/g)) {
    const attr = (n: string) => new RegExp(`\\b${n}="([^"]*)"`).exec(m[0])?.[1] ?? '';
    map.set(attr('Id'), `${attr('Type')}|${attr('Target')}|${attr('TargetMode')}`);
  }
  return map;
}

/** Un .rels se compara como conjunto de destinos (los Id y los duplicados no importan). */
function canonicalRels(xml: string): string {
  const set = new Set<string>();
  for (const m of xml.matchAll(/<Relationship\b[^>]*>/g)) {
    const attr = (n: string) => new RegExp(`\\b${n}="([^"]*)"`).exec(m[0])?.[1] ?? '';
    set.add(`${attr('Type')}|${attr('Target')}|${attr('TargetMode')}`);
  }
  return JSON.stringify([...set].sort());
}

export function comparePackages(original: Uint8Array, saved: Uint8Array): PackageDiff {
  const a = unzipSync(original);
  const b = unzipSync(saved);
  const diff: PackageDiff = {
    missingParts: files(a).filter((k) => !(k in b)),
    addedParts: files(b).filter((k) => !(k in a)),
    changedBinaries: [],
    changedXml: [],
    xmlEqual: 0,
  };
  for (const name of files(a)) {
    const after = b[name];
    if (!after) continue;
    const before = a[name]!;
    if (isXml(name)) {
      const rels = name.endsWith('.rels');
      const x = rels
        ? canonicalRels(strFromU8(before))
        : canonicalXml(strFromU8(before), relationshipsOf(a, name));
      const y = rels
        ? canonicalRels(strFromU8(after))
        : canonicalXml(strFromU8(after), relationshipsOf(b, name));
      if (x === y) {
        (diff as { xmlEqual: number }).xmlEqual++;
      } else {
        let i = 0;
        while (i < x.length && x[i] === y[i]) i++;
        diff.changedXml.push({
          part: name,
          original: x.slice(Math.max(0, i - 80), i + 120),
          saved: y.slice(Math.max(0, i - 80), i + 120),
        });
      }
    } else if (Buffer.compare(Buffer.from(before), Buffer.from(after)) !== 0) {
      diff.changedBinaries.push(name);
    }
  }
  return diff;
}
