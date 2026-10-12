// Ventana oculta de impresión. Monta el motor SIN contenedor con scroll: así no virtualiza
// y construye todas las páginas. Luego fija @page por tamaño de sección y avisa a main,
// que genera el PDF o imprime este mismo DOM.
import { composeFontOrigins, createDocxEditor, defineFontResolver } from '@docx-editor.dev/core';
import '@docx-editor.dev/core/styles/editor.css';
import { bundledFonts, systemFonts } from '../editor/fonts';
import { errorMessage } from '@shared/errors';
import { pageCss } from './page-css';

const fonts = defineFontResolver((request) => composeFontOrigins([systemFonts, bundledFonts], request));
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

async function render(): Promise<void> {
  const bytes = await window.openword.print.sourceBytes();
  const container = document.getElementById('print-root');
  if (!container) throw new Error('Falta #print-root');
  const editor = createDocxEditor({
    container,
    document: bytes,
    fonts,
    mode: 'view',
    zoom: 1,
    zoomMode: { type: 'fixed' },
  });

  // 1. Layout listo y fuentes resueltas (medición con HarfBuzz).
  const deadline = performance.now() + 4 * 60_000;
  while (performance.now() < deadline) {
    if (editor.getTotalPages() > 0 && !editor.fontMeasurement().resolving) break;
    await sleep(100);
  }
  await document.fonts.ready;
  await Promise.all([...document.images].map((img) => img.decode().catch(() => undefined)));
  editor.relayout({ sync: true });
  await frame();
  await frame();

  // 2. Todas las páginas en el DOM (el motor no virtualiza sin contenedor de scroll).
  const total = editor.getTotalPages();
  while (performance.now() < deadline && document.querySelectorAll('.docx-page').length < total)
    await sleep(100);
  const painted = document.querySelectorAll('.docx-page').length;
  if (painted !== total) throw new Error(`Se pintaron ${painted} de ${total} páginas.`);

  // 3. CSS de impresión: un @page con nombre por cada tamaño de página (orientación mixta).
  const geometry = editor
    .getPageGeometry()
    .map((g) => ({ index: g.index, width: g.box.width, height: g.box.height }));
  const { css, sizes } = pageCss(geometry);
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  await frame();
  await frame();

  window.openword.print.rendered({
    ok: true,
    pages: total,
    sizes,
    measurer: editor.fontMeasurement().measurer,
  });
}

render().catch((error: unknown) => window.openword.print.rendered({ ok: false, error: errorMessage(error) }));
