// Detección del tipo de documento por su CONTENIDO (no por la extensión): un .doc puede ser
// en realidad RTF o HTML, y un .docx protegido con contraseña es un contenedor CFB.
import { strFromU8, unzipSync } from 'fflate';

export type FileKind =
  | 'docx' // documento OOXML
  | 'docm' // documento con macros
  | 'dotx' // plantilla
  | 'dotm' // plantilla con macros
  | 'doc' // Word 97-2003 binario
  | 'rtf'
  | 'odt'
  | 'word-xml' // Word 2003 XML / Flat OPC
  | 'html' // HTML guardado como .doc
  | 'encrypted' // OOXML protegido con contraseña
  | 'unknown';

/** Formatos que el motor abre directamente. */
export const NATIVE_KINDS: ReadonlySet<FileKind> = new Set(['docx', 'docm', 'dotx', 'dotm']);
/** Formatos que necesitan conversión con LibreOffice (hito 7). */
export const CONVERTIBLE_KINDS: ReadonlySet<FileKind> = new Set(['doc', 'rtf', 'odt', 'word-xml', 'html']);

export const MAIN_CONTENT_TYPES = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml',
  docm: 'application/vnd.ms-word.document.macroEnabled.main+xml',
  dotx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml',
  dotm: 'application/vnd.ms-word.template.macroEnabledTemplate.main+xml',
} as const;

const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];
const CFB_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

function startsWith(bytes: Uint8Array, magic: readonly number[]): boolean {
  return magic.every((b, i) => bytes[i] === b);
}

/** Lista los nombres de los streams de un contenedor CFB (lo inyecta main, que tiene `cfb`). */
export type CfbStreamLister = (bytes: Uint8Array) => readonly string[];

export function sniffFileKind(bytes: Uint8Array, listCfbStreams?: CfbStreamLister): FileKind {
  if (bytes.length < 8) return 'unknown';

  if (startsWith(bytes, ZIP_MAGIC)) return sniffZip(bytes);

  if (startsWith(bytes, CFB_MAGIC)) {
    if (!listCfbStreams) return 'doc';
    let streams: readonly string[];
    try {
      streams = listCfbStreams(bytes);
    } catch {
      return 'unknown';
    }
    if (streams.includes('EncryptedPackage')) return 'encrypted';
    if (streams.includes('WordDocument')) return 'doc';
    return 'unknown';
  }

  const head = textHead(bytes);
  if (head.startsWith('{\\rtf')) return 'rtf';
  if (head.startsWith('<?xml') || head.startsWith('<')) {
    if (/<w:wordDocument[\s>]|<pkg:package[\s>]/.test(head)) return 'word-xml';
    if (/<html[\s>]|<!doctype html/i.test(head)) return 'html';
  }
  if (/^mime-version:/i.test(head) && /text\/html/i.test(head)) return 'html'; // MHT
  return 'unknown';
}

function sniffZip(bytes: Uint8Array): FileKind {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes, {
      filter: (file) => file.name === '[Content_Types].xml' || file.name === 'mimetype',
    });
  } catch {
    return 'unknown';
  }
  const mimetype = entries['mimetype'];
  if (mimetype && strFromU8(mimetype).trim() === 'application/vnd.oasis.opendocument.text') return 'odt';

  const types = entries['[Content_Types].xml'];
  if (!types) return 'unknown';
  const xml = strFromU8(types);
  for (const [kind, contentType] of Object.entries(MAIN_CONTENT_TYPES)) {
    if (xml.includes(`"${contentType}"`)) return kind as keyof typeof MAIN_CONTENT_TYPES;
  }
  return 'unknown';
}

function textHead(bytes: Uint8Array): string {
  let start = 0;
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) start = 3; // BOM UTF-8
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(start, start + 2048)).trimStart();
}
