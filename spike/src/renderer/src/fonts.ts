import { createFontSource, defineFontResolver } from '@docx-editor.dev/core';

type Face = { family: string; weight: number; style: 'normal' | 'italic'; faceIndex: number; bytes: Uint8Array };

/** Resolver que entrega bytes de fuentes REALES del sistema (vía main) para medir con HarfBuzz. */
export const systemFonts = defineFontResolver(async ({ families, defaultFamily }) => {
  const wanted = [...new Set([...families, defaultFamily])];
  const faces: Face[] = await window.openword.resolveFonts(wanted);
  const sources = [];
  for (const f of faces) {
    const r = createFontSource(f.bytes, { family: f.family, weight: f.weight, style: f.style, faceIndex: f.faceIndex }, { maxFontBytes: 64 << 20 });
    if ('source' in r) sources.push(r.source);
    else console.warn('[fonts] rechazada', f.family, JSON.stringify(r.failure));
  }
  console.info(`[fonts] sistema: ${sources.length} caras para ${wanted.join(', ')}`);
  return { sources };
});
