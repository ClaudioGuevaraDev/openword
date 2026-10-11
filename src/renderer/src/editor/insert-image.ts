// Insertar imagen: el motor acepta PNG, JPEG y GIF. BMP, WebP y SVG se convierten a PNG
// con un canvas (Chromium los decodifica) antes de insertarlos.
import type { DocxEditorInstance } from '@docx-editor.dev/core';
import { executeImageCommand } from '@docx-editor.dev/core/editor';
import { normalizeImageBytes } from '@docx-editor.dev/react';

const MAX_SIDE = 8000;

async function toPng(bytes: Uint8Array, name: string): Promise<Uint8Array> {
  const isSvg = /\.svg$/i.test(name) || new TextDecoder().decode(bytes.subarray(0, 512)).includes('<svg');
  const blob = new Blob([bytes as BlobPart], { type: isSvg ? 'image/svg+xml' : 'application/octet-stream' });
  let source: CanvasImageSource & { width: number; height: number };
  if (isSvg) {
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      source = img;
    } finally {
      URL.revokeObjectURL(url);
    }
  } else {
    source = await createImageBitmap(blob);
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(source.width || 1, source.height || 1));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round((source.width || 300) * scale));
  canvas.height = Math.max(1, Math.round((source.height || 150) * scale));
  canvas.getContext('2d')?.drawImage(source, 0, 0, canvas.width, canvas.height);
  const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!png) throw new Error('No se pudo convertir la imagen.');
  return new Uint8Array(await png.arrayBuffer());
}

/** Inserta una imagen en la posición del cursor. Devuelve un mensaje de error o null. */
export async function insertImage(
  editor: DocxEditorInstance,
  bytes: Uint8Array,
  name: string,
): Promise<string | null> {
  let normalized = normalizeImageBytes(bytes);
  if (!normalized.ok) {
    try {
      normalized = normalizeImageBytes(await toPng(bytes, name));
    } catch {
      return `No se pudo leer la imagen «${name}».`;
    }
  }
  if (!normalized.ok) return `Formato de imagen no soportado: «${name}».`;
  // Como Word: una imagen más ancha que el área de texto se reduce para caber.
  const page = editor.snapshot().pageSetup;
  const maxWidthPt = page
    ? (page.pageWidthTwips - page.marginsTwips.left - page.marginsTwips.right) / 20
    : 6.5 * 72;
  const ratio = Math.min(1, maxWidthPt / normalized.widthPoints);
  const result = await executeImageCommand(editor, {
    type: 'insertImage',
    data: normalized.bytes,
    mime: normalized.mime,
    widthPoints: normalized.widthPoints * ratio,
    heightPoints: normalized.heightPoints * ratio,
    description: name,
  });
  return result.ok
    ? null
    : `No se pudo insertar la imagen: ${'reason' in result ? String(result.reason) : 'error'}`;
}
