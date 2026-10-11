import { commandForSlot } from '@docx-editor.dev/core';
import { unzipSync } from 'fflate';

type AnyEditor = {
  getTotalPages(): number;
  save(): Promise<ArrayBuffer>;
  exec(cmd: unknown): unknown;
  query(q: unknown): unknown;
  focus(): unknown;
  on(ev: string, h: (...a: unknown[]) => void): () => void;
  fontMeasurement?: () => { measurer: string; resolving: boolean };
  getDocumentHandle(): { revision?: number };
};

const r = (k: string, v: unknown) => window.openword.selftest.report(k, v);
const shot = (n: string) => window.openword.selftest.screenshot(n).catch((e: unknown) => r('screenshotError', String(e)));
const sleep = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

async function waitFor(cond: () => boolean, timeoutMs: number): Promise<boolean> {
  const end = performance.now() + timeoutMs;
  while (performance.now() < end) {
    if (cond()) return true;
    await sleep(100);
  }
  return false;
}

function zipSummary(bytes: Uint8Array) {
  return unzipSync(bytes);
}

export async function runSelftest(editorIn: unknown, name: string): Promise<void> {
  const editor = editorIn as AnyEditor;
  const t0 = performance.now();
  const outDir = await window.openword.selftest.outDir();
  try {
    r('fixture', name);
    // 1. Apertura + fuentes
    const opened = await waitFor(() => editor.getTotalPages() > 0, 120_000);
    r('firstLayoutMs', Math.round(performance.now() - t0));
    await waitFor(() => editor.fontMeasurement?.().resolving === false && editor.fontMeasurement?.().measurer === 'shaped', 60_000);
    await sleep(500);
    r('opened', opened);
    r('openMs', Math.round(performance.now() - t0));
    r('pages', editor.getTotalPages());
    r('fontMeasurement', editor.fontMeasurement?.());
    r('domPagesInViewport', document.querySelectorAll('.docx-page').length);

    // 1b. Guardar SIN editar: round-trip de partes del paquete
    const saved = new Uint8Array(await editor.save());
    await window.openword.selftest.writeFile(`${name}.roundtrip.docx`, saved);
    await shot(`${name}.open.png`);
    const initial = (await window.openword.initialDocument()) as { bytes: Uint8Array };
    const a = zipSummary(initial.bytes);
    const b = zipSummary(saved);
    const missing = Object.keys(a).filter((k) => !(k in b));
    const added = Object.keys(b).filter((k) => !(k in a));
    const changedBinary = Object.keys(a).filter((k) => k in b && !/\.(xml|rels)$/i.test(k) && !eq(a[k], b[k]));
    const changedXml = Object.keys(a).filter((k) => k in b && /\.(xml|rels)$/i.test(k) && !eq(a[k], b[k]));
    r('roundTrip', { savedBytes: saved.length, parts: Object.keys(a).length, missing, added, changedBinary, changedXml });


    // 2. Corrector: atributo del motor y diccionario de Chromium
    const pagesLayer = document.querySelector('.docx-pages');
    r('spellcheckAttrByEngine', pagesLayer?.getAttribute('spellcheck') ?? (pagesLayer ? 'none' : 'no .docx-pages'));
    pagesLayer?.setAttribute('spellcheck', 'true');
    r('dictionary', {
      ortografiaMal: window.openword.isWordMisspelled('ortografai'),
      holaBien: window.openword.isWordMisspelled('hola'),
      sugerencias: window.openword.wordSuggestions('ortografai'),
    });

    // 3. Comandos de la cinta
    editor.focus();
    const cmds: Record<string, unknown> = {};
    for (const slot of ['text.bold', 'text.italic', 'alignment.center', 'list.bullet', 'history.undo', 'history.undo', 'history.undo', 'history.undo']) {
      const c = commandForSlot(slot as never);
      cmds[slot + '#' + Object.keys(cmds).length] = c ? editor.exec(c) : 'sin comando';
    }
    cmds['insertTable'] = editor.exec({ type: 'insertTable', rows: 2, cols: 3 });
    cmds['undoTable'] = editor.exec({ type: 'undo' });
    r('commands', cmds);

    // 4. Texto vía teclado real + latencia
    let changes = 0;
    const off = editor.on('change', () => changes++);
    const before = changes;
    const tType = performance.now();
    await window.openword.selftest.type('Hola mundo ñandú ');
    await waitFor(() => changes > before, 5000);
    await window.openword.selftest.type('Esto es una prueva de ortografai. ');
    await sleep(1500);
    await shot(`${name}.typed.png`);
    // Corrector propio (alternativa §7): palabras → webFrame.isWordMisspelled → findMatches → setHighlights
    {
      const ed = editor as unknown as { findMatches(q: string, o?: object): { blockId: string; start: number; length: number }[]; setHighlights(n: string, r: unknown[], o?: object): { applied: number } };
      const tSpell = performance.now();
      const paras = editor.query({ type: 'paragraphs' }) as { text: string }[];
      const words = new Set(paras.flatMap((p) => p.text.match(/\p{L}+/gu) ?? []));
      const bad = [...words].filter((w) => w.length > 2 && window.openword.isWordMisspelled(w));
      const ranges = bad.flatMap((w) => ed.findMatches(w, { matchCase: true, wholeWord: true }));
      const res = ed.setHighlights('spelling', ranges, { className: 'ow-misspelled', color: 'transparent' });
      const st = document.createElement('style');
      st.textContent = '.ow-misspelled{background:none!important;border-bottom:2px dotted #e00!important}';
      document.head.appendChild(st);
      r('customSpell', { ms: Math.round(performance.now() - tSpell), uniqueWords: words.size, misspelled: bad.slice(0, 15), ranges: ranges.length, applied: res.applied });
      await sleep(500);
      await shot(`${name}.spell.png`);
    }
    r('typing', { ms: Math.round(performance.now() - tType), changes: changes - before });
    // Latencia por tecla: enviar 1 carácter y esperar el evento change
    const lat: number[] = [];
    for (const ch of 'latencia') {
      const c0 = changes;
      const t = performance.now();
      await window.openword.selftest.type(ch);
      await waitFor(() => changes > c0, 5000);
      await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
      lat.push(Math.round(performance.now() - t));
    }
    lat.sort((x, y) => x - y);
    r('keystrokeLatencyMs', { samples: lat, median: lat[Math.floor(lat.length / 2)] });
    off();
    try {
      const paras = editor.query({ type: 'paragraphs' }) as { text: string }[];
      const words = paras.map((p) => p.text).join(' ').split(/\s+/).filter(Boolean).length;
      r('wordCount', { paragraphs: paras.length, words, first: paras[0]?.text.slice(0, 60) });
    } catch (e) {
      r('wordCount', `error: ${String(e)}`);
    }

    // 6. PDF de todas las páginas (documento ya editado)
    const edited = new Uint8Array(await editor.save());
    r('savedAfterEditBytes', edited.length);
    const pdf = await window.openword.exportPdf(edited, `${outDir}/${name.replace(/\.docx$/i, '')}.pdf`);
    r('pdf', pdf);
  } catch (e) {
    r('error', String((e as Error)?.stack ?? e));
  } finally {
    await window.openword.selftest.finish();
  }
}

function eq(x: Uint8Array, y: Uint8Array): boolean {
  if (x.length !== y.length) return false;
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
  return true;
}
