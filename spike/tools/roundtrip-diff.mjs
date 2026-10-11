// Compara un .docx original con el guardado por el motor: partes, binarios y XML canónico.
// Uso: node tools/roundtrip-diff.mjs original.docx guardado.docx
import { readFileSync } from 'node:fs';
import { unzipSync, strFromU8 } from 'fflate';
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@', preserveOrder: true, trimValues: false, ignoreDeclaration: true, parseTagValue: false, parseAttributeValue: false });
// Atributos que Word/el motor agregan o quitan sin cambiar el significado.
const IGNORED_ATTR = new Set(['w:rsid', 'w:rsidR', 'w:rsidRPr', 'w:rsidRDefault', 'w:rsidP', 'w:rsidDel', 'w:rsidSect', 'w:rsidTr', 'w14:paraId', 'w14:textId', 'xml:space', 'mc:Ignorable']);

function qname(name, scope) {
  const i = name.indexOf(':');
  const prefix = i < 0 ? '' : name.slice(0, i);
  const local = i < 0 ? name : name.slice(i + 1);
  if (prefix === 'xml') return name;
  return `{${scope[prefix] ?? prefix}}${local}`;
}

function canon(nodes, parentScope = {}) {
  const out = [];
  for (const node of nodes) {
    if ('#text' in node) {
      if (node['#text'].trim() !== '') out.push({ t: node['#text'] });
      continue;
    }
    const tag = Object.keys(node).find((k) => k !== ':@');
    if (!tag || tag.startsWith('?')) continue;
    const attrs = node[':@'] ?? {};
    const scope = { ...parentScope };
    for (const [a, v] of Object.entries(attrs)) {
      if (a === '@xmlns') scope[''] = v;
      else if (a.startsWith('@xmlns:')) scope[a.slice(7)] = v;
    }
    const cleanAttrs = Object.entries(attrs)
      .filter(([a]) => !a.startsWith('@xmlns') && !IGNORED_ATTR.has(a.slice(1)))
      .map(([a, v]) => [a.includes(':') ? qname(a.slice(1), scope) : a.slice(1), v])
      .sort(([x], [y]) => x.localeCompare(y));
    out.push({ n: qname(tag, scope), a: cleanAttrs, c: canon(node[tag], scope) });
  }
  return out;
}

const a = unzipSync(readFileSync(process.argv[2]));
const b = unzipSync(readFileSync(process.argv[3]));
const files = (z) => Object.keys(z).filter((k) => !k.endsWith('/'));
const res = { missing: files(a).filter((k) => !(k in b)), added: files(b).filter((k) => !(k in a)), binaryChanged: [], xmlSemanticDiff: [], xmlEqual: 0 };
for (const k of files(a)) {
  if (!(k in b)) continue;
  if (/\.(xml|rels)$/i.test(k)) {
    const x = JSON.stringify(canon(parser.parse(strFromU8(a[k]))));
    const y = JSON.stringify(canon(parser.parse(strFromU8(b[k]))));
    if (x === y) res.xmlEqual++;
    else {
      let i = 0;
      while (i < x.length && x[i] === y[i]) i++;
      res.xmlSemanticDiff.push({ part: k, at: i, original: x.slice(Math.max(0, i - 60), i + 100), saved: y.slice(Math.max(0, i - 60), i + 100) });
    }
  } else if (Buffer.compare(Buffer.from(a[k]), Buffer.from(b[k])) !== 0) res.binaryChanged.push(k);
}
console.log(JSON.stringify(res, null, 1));
