// Fuentes para medir con HarfBuzz: primero las REALES instaladas en el sistema (p. ej.
// Calibri en Windows con Office); si faltan, sustitutos métricos OFL empaquetados
// (Carlito→Calibri, Caladea→Cambria, Liberation→Times/Arial/Courier).
import { createFontSource, defineFontResolver, type FontSource } from '@docx-editor.dev/core';
import { packagedFonts } from '@docx-editor.dev/fonts';

export const systemFonts = defineFontResolver(async ({ families, defaultFamily }) => {
  const [faces, supportedFamilies] = await Promise.all([
    window.openword.fonts.resolve([...new Set([...families, defaultFamily])]),
    window.openword.fonts.families(),
  ]);
  const sources: FontSource[] = [];
  for (const face of faces) {
    const created = createFontSource(
      face.bytes,
      { family: face.family, weight: face.weight, style: face.style, faceIndex: face.faceIndex },
      { maxFontBytes: 64 * 1024 * 1024 },
    );
    if ('source' in created) sources.push(created.source);
    else console.warn(`[fuentes] ${face.family} ${face.weight} ${face.style}: ${created.failure.reason}`);
  }
  // supportedFamilies: el selector de fuentes ofrece todas las instaladas.
  return { sources, supportedFamilies };
});

export const bundledFonts = packagedFonts();
