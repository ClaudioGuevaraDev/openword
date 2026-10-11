// Ventana oculta de impresión: monta el motor sin contenedor de scroll para que pinte TODAS las páginas.
import { composeFontOrigins, createDocxEditor, defineFontResolver } from '@docx-editor.dev/core';
import { packagedFonts } from '@docx-editor.dev/fonts';
import '@docx-editor.dev/core/styles/editor.css';
import { systemFonts } from './fonts';

const fonts = defineFontResolver((req) => composeFontOrigins([systemFonts, packagedFonts()], req));
const sleep = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
const frame = () => new Promise((ok) => requestAnimationFrame(() => ok(null)));

async function main(): Promise<void> {
  const bytes = await window.openword.printBytes();
  const container = document.getElementById('print-root')!;
  const editor = createDocxEditor({ container, document: bytes, fonts, mode: 'view', zoom: 1, zoomMode: { type: 'fixed' } });
  const deadline = performance.now() + 150_000;
  // Esperar layout + fuentes
  while (performance.now() < deadline) {
    const m = editor.fontMeasurement();
    if (editor.getTotalPages() > 0 && !m.resolving) break;
    await sleep(100);
  }
  await document.fonts.ready;
  await Promise.all([...document.images].map((img) => img.decode().catch(() => undefined)));
  editor.relayout({ sync: true });
  await frame();
  await frame();

  const total = editor.getTotalPages();
  // Esperar a que el DOM tenga todas las páginas
  while (performance.now() < deadline && document.querySelectorAll('.docx-page').length < total) await sleep(100);
  const pages = [...document.querySelectorAll<HTMLElement>('.docx-page')];
  const geometry = editor.getPageGeometry();

  // CSS de impresión: un @page con nombre por tamaño (en puntos)
  const sizes = new Map<string, string>();
  const rules: string[] = [];
  geometry.forEach((g, i) => {
    const key = `s${Math.round(g.box.width)}x${Math.round(g.box.height)}`;
    if (!sizes.has(key)) {
      sizes.set(key, `${g.box.width}px ${g.box.height}px`);
      rules.push(`@page ${key} { size: ${g.box.width}px ${g.box.height}px; margin: 0 }`);
    }
    rules.push(`.docx-page[data-page-index="${i}"] { page: ${key}; }`);
  });
  const style = document.createElement('style');
  style.textContent = `
    ${rules.join('\n')}
    @media print {
      html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
      #print-root, #print-root * { box-shadow: none !important; }
      .docx-page { position: relative !important; left: 0 !important; top: 0 !important; transform: none !important;
        margin: 0 !important; break-after: page; break-inside: avoid; overflow: hidden !important; }
      .docx-page:last-of-type { break-after: auto; }
    }`;
  document.head.appendChild(style);
  await frame();
  await frame();
  const live = [...document.querySelectorAll<HTMLElement>('.docx-page')];
  if (live.length !== total) throw new Error(`páginas en DOM ${live.length} != ${total}`);

  window.openword.printReady({
    pages: total,
    domPages: pages.length,
    sizes: [...sizes.values()],
    measurer: editor.fontMeasurement().measurer,
    debug: live.map((p) => `${p.getAttribute('data-page-index')}:${getComputedStyle(p).getPropertyValue('page')}:${p.style.width}x${p.style.height}:${p.parentElement?.className}`),
    geometry: geometry.map((g) => `${g.index}:${Math.round(g.box.width)}x${Math.round(g.box.height)}`),
  });
}

main().catch((e) => window.openword.printReady({ error: String((e as Error)?.stack ?? e) }));
