// Ajustes mínimos al paquete OOXML que el motor no hace por sí mismo.
import { strFromU8, strToU8, zipSync, type Zippable } from 'fflate';
import { unzipBounded } from './zip';
import { MAIN_CONTENT_TYPES } from './file-kinds';

export type MainKind = keyof typeof MAIN_CONTENT_TYPES;

/** Ruta de la parte principal según _rels/.rels (normalmente /word/document.xml). */
function mainPartName(entries: Record<string, Uint8Array>): string {
  const rels = entries['_rels/.rels'];
  if (rels) {
    const match = /<Relationship\b[^>]*Type="[^"]*\/officeDocument"[^>]*>/.exec(strFromU8(rels));
    const target = match && /Target="([^"]+)"/.exec(match[0])?.[1];
    if (target) return '/' + target.replace(/^\/+/, '');
  }
  return '/word/document.xml';
}

/**
 * Cambia el content type de la parte principal (p. ej. plantilla .dotx → documento .docx).
 * Sin esto, Word rechaza un .docx cuyo contenido está declarado como plantilla.
 * Las demás partes se copian sin modificar su contenido.
 */
export function setMainContentType(bytes: Uint8Array, kind: MainKind): Uint8Array {
  const entries = unzipBounded(bytes);
  const types = entries['[Content_Types].xml'];
  if (!types) throw new Error('Paquete OOXML sin [Content_Types].xml');
  const part = mainPartName(entries);
  const xml = strFromU8(types);
  const override = new RegExp(
    `(<Override\\b[^>]*PartName="${part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*ContentType=")([^"]+)(")`,
  );
  const overrideReversed = new RegExp(
    `(<Override\\b[^>]*ContentType=")([^"]+)("[^>]*PartName="${part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}")`,
  );
  let patched: string;
  if (override.test(xml)) patched = xml.replace(override, `$1${MAIN_CONTENT_TYPES[kind]}$3`);
  else if (overrideReversed.test(xml))
    patched = xml.replace(overrideReversed, `$1${MAIN_CONTENT_TYPES[kind]}$3`);
  else throw new Error(`No se encontró la declaración de ${part} en [Content_Types].xml`);
  if (patched === xml) return bytes;

  const out: Zippable = {};
  for (const [name, data] of Object.entries(entries)) {
    if (name.endsWith('/')) continue; // entradas de carpeta: innecesarias en OOXML
    out[name] = name === '[Content_Types].xml' ? strToU8(patched) : data;
  }
  return zipSync(out, { level: 6 });
}

export type Paper = 'letter' | 'a4';

/**
 * Ajusta el tamaño de página de un documento en blanco. Carta: 8,5×11" con márgenes de 1"
 * (lo que ya trae el motor). A4: 21×29,7 cm con los márgenes del Word en español
 * (2,5 cm arriba/abajo, 3 cm izquierda/derecha).
 */
export function setBlankPaper(bytes: Uint8Array, paper: Paper): Uint8Array {
  if (paper === 'letter') return bytes;
  const entries = unzipBounded(bytes);
  const doc = entries['word/document.xml'];
  if (!doc) return bytes;
  const xml = strFromU8(doc)
    .replace(/<w:pgSz\b[^>]*\/>/, '<w:pgSz w:w="11906" w:h="16838"/>')
    .replace(
      /<w:pgMar\b[^>]*\/>/,
      '<w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/>',
    );
  const out: Zippable = {};
  for (const [name, data] of Object.entries(entries))
    out[name] = name === 'word/document.xml' ? strToU8(xml) : data;
  return zipSync(out, { level: 6 });
}
