// Lector mínimo de fuentes sfnt (TTF/OTF/TTC): solo nombres, peso y estilo, leyendo
// únicamente las cabeceras y las tablas `name` y `OS/2` (no el archivo completo).

export interface SfntFace {
  /** Índice de la cara dentro de un .ttc (0 en archivos sueltos). */
  readonly faceIndex: number;
  /** Familia "legacy" (nameID 1): la que Word guarda en w:rFonts, p. ej. "Calibri Light". */
  readonly family: string;
  /** Subfamilia legacy (nameID 2): Regular, Bold, Italic, Bold Italic. */
  readonly subfamily: string;
  /** Familia tipográfica (nameID 16), si existe: p. ej. "Calibri". */
  readonly typographicFamily: string | null;
  /** Peso CSS (100–900) según OS/2.usWeightClass. */
  readonly weight: number;
  readonly italic: boolean;
}

/** Lectura aleatoria de bytes (archivo en disco o buffer en pruebas). */
export type ReadAt = (offset: number, length: number) => Promise<Uint8Array>;

const TAG_TTCF = 0x74746366; // 'ttcf'
const SFNT_VERSIONS = new Set([0x00010000, 0x4f54544f /* OTTO */, 0x74727565 /* true */]);
const MAX_FACES = 64;
const MAX_NAME_TABLE = 512 * 1024;

export async function readSfntFaces(readAt: ReadAt): Promise<SfntFace[]> {
  const head = await readAt(0, 12);
  if (head.length < 12) return [];
  const view = dv(head);
  const tag = view.getUint32(0);
  if (tag === TAG_TTCF) {
    const count = Math.min(view.getUint32(8), MAX_FACES);
    const offsets = dv(await readAt(12, count * 4));
    const faces: SfntFace[] = [];
    for (let i = 0; i < count && (i + 1) * 4 <= offsets.byteLength; i++) {
      const face = await readFace(readAt, offsets.getUint32(i * 4), i);
      if (face) faces.push(face);
    }
    return faces;
  }
  if (!SFNT_VERSIONS.has(tag)) return [];
  const face = await readFace(readAt, 0, 0);
  return face ? [face] : [];
}

async function readFace(readAt: ReadAt, offset: number, faceIndex: number): Promise<SfntFace | null> {
  const header = dv(await readAt(offset, 12));
  if (header.byteLength < 12 || !SFNT_VERSIONS.has(header.getUint32(0))) return null;
  const numTables = Math.min(header.getUint16(4), 128);
  const dir = dv(await readAt(offset + 12, numTables * 16));
  const tables = new Map<string, { offset: number; length: number }>();
  for (let i = 0; i < numTables && (i + 1) * 16 <= dir.byteLength; i++) {
    const p = i * 16;
    const tagName = String.fromCharCode(
      dir.getUint8(p),
      dir.getUint8(p + 1),
      dir.getUint8(p + 2),
      dir.getUint8(p + 3),
    );
    tables.set(tagName, { offset: dir.getUint32(p + 8), length: dir.getUint32(p + 12) });
  }

  const nameTable = tables.get('name');
  if (!nameTable || nameTable.length < 6) return null;
  const names = parseNameTable(await readAt(nameTable.offset, Math.min(nameTable.length, MAX_NAME_TABLE)));
  const family = names.get(1);
  if (!family) return null;
  const subfamily = names.get(2) ?? 'Regular';

  let weight = /bold/i.test(subfamily) ? 700 : 400;
  let italic = /italic|oblique/i.test(subfamily);
  const os2 = tables.get('OS/2');
  if (os2 && os2.length >= 64) {
    const t = dv(await readAt(os2.offset, 64));
    const weightClass = t.getUint16(4);
    if (weightClass >= 1 && weightClass <= 1000) weight = clampWeight(weightClass);
    const fsSelection = t.getUint16(62);
    italic = (fsSelection & 0x01) !== 0 || italic;
  }

  return { faceIndex, family, subfamily, typographicFamily: names.get(16) ?? null, weight, italic };
}

function clampWeight(w: number): number {
  return Math.min(900, Math.max(100, Math.round(w / 100) * 100));
}

/** Devuelve nameID → texto, prefiriendo Windows/Unicode en inglés (EE. UU.). */
function parseNameTable(bytes: Uint8Array): Map<number, string> {
  const view = dv(bytes);
  const result = new Map<number, { text: string; score: number }>();
  if (view.byteLength < 6) return new Map();
  const count = view.getUint16(2);
  const storage = view.getUint16(4);
  for (let i = 0; i < count; i++) {
    const p = 6 + i * 12;
    if (p + 12 > view.byteLength) break;
    const platform = view.getUint16(p);
    const encoding = view.getUint16(p + 2);
    const language = view.getUint16(p + 4);
    const nameId = view.getUint16(p + 6);
    if (nameId !== 1 && nameId !== 2 && nameId !== 16 && nameId !== 17) continue;
    const length = view.getUint16(p + 8);
    const start = storage + view.getUint16(p + 10);
    if (start + length > bytes.length) continue;
    const raw = bytes.subarray(start, start + length);

    let text: string | null = null;
    let score = 0;
    if (platform === 3 && (encoding === 1 || encoding === 10)) {
      text = utf16be(raw);
      score = language === 0x0409 ? 3 : 2;
    } else if (platform === 0) {
      text = utf16be(raw);
      score = 2;
    } else if (platform === 1 && encoding === 0) {
      text = latin1(raw);
      score = language === 0 ? 1 : 0;
    }
    if (!text) continue;
    text = text.replace(/\0/g, '').trim();
    if (!text) continue;
    const prev = result.get(nameId);
    if (!prev || score > prev.score) result.set(nameId, { text, score });
  }
  return new Map([...result].map(([id, v]) => [id, v.text]));
}

function utf16be(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i + 1 < bytes.length; i += 2) out += String.fromCharCode((bytes[i]! << 8) | bytes[i + 1]!);
  return out;
}

function latin1(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) out += String.fromCharCode(b);
  return out;
}

function dv(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}
