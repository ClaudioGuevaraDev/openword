// Informe de fidelidad frente a Word: `pnpm run fidelity:report`.
// Para cada documento del corpus con un PDF de referencia exportado desde Microsoft Word en
// tests/fidelity/word-reference/<carpeta>__<nombre>.pdf, OpenWord exporta su PDF y se compara
// la paginación. El resultado queda en tests/fidelity/report/ (Markdown y JSON).
import { expect, test } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { closeAll, launchApp, mockDialogs, waitForDocument } from '../e2e/launch';
import { comparePagination, pdfPages } from '../fidelity/pdf-text';

const ROOT = join(__dirname, '..');
const CORPUS = join(ROOT, 'corpus');
const REFERENCE = join(ROOT, 'fidelity', 'word-reference');
const REPORT = join(ROOT, 'fidelity', 'report');

test('informe de fidelidad de paginación frente a Word', async () => {
  test.setTimeout(30 * 60_000);
  const manifest = JSON.parse(readFileSync(join(CORPUS, 'manifest.json'), 'utf8')) as {
    documents: { file: string }[];
  };
  mkdirSync(REPORT, { recursive: true });
  const app = await launchApp();
  const rows: Record<string, unknown>[] = [];
  try {
    const win = await app.firstWindow();
    await waitForDocument(win);
    for (const { file } of manifest.documents) {
      const key = file.replace('/', '__').replace(/\.docx$/, '');
      const base64 = readFileSync(join(CORPUS, file)).toString('base64');
      const ourPdf = join(REPORT, `${key}.openword.pdf`);
      // main escribe el PDF directo a disco (diálogo de guardado simulado): nada grande cruza procesos.
      await mockDialogs(app, { save: ourPdf });
      const ours = await win.evaluate(async (data) => {
        try {
          const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
          const job = await window.openword.print.prepare(bytes);
          const saved = await window.openword.print.savePdf(job.jobId);
          window.openword.print.dispose(job.jobId);
          return saved.status === 'saved' ? { ok: true as const } : { error: JSON.stringify(saved) };
        } catch (error) {
          return { error: String(error) };
        }
      }, base64);
      if ('error' in ours) {
        rows.push({ file, error: ours.error });
        continue;
      }
      const ourPages = await pdfPages(new Uint8Array(readFileSync(ourPdf)));
      const reference = join(REFERENCE, `${key}.pdf`);
      if (!existsSync(reference)) {
        rows.push({ file, ourPages: ourPages.length, reference: false });
        continue;
      }
      const wordPages = await pdfPages(new Uint8Array(readFileSync(reference)));
      rows.push({ file, reference: true, ...comparePagination(ourPages, wordPages) });
    }
  } finally {
    await closeAll(app);
  }

  const withRef = rows.filter((r) => r['reference'] === true) as unknown as {
    file: string;
    pages: { ours: number; word: number };
    matchingBreaks: number;
    firstMismatch: number | null;
  }[];
  const samePages = withRef.filter((r) => r.pages.ours === r.pages.word).length;
  const perfect = withRef.filter((r) => r.firstMismatch === null).length;
  const lines = [
    '# Informe de fidelidad frente a Microsoft Word',
    '',
    `Generado: ${new Date().toISOString()}`,
    '',
    withRef.length === 0
      ? '> No hay PDF de referencia de Word todavía. Ver `docs/FIDELIDAD.md` para generarlos.'
      : `**${withRef.length} documentos con referencia**: mismo número de páginas en ${samePages}; paginación idéntica (mismos saltos) en ${perfect}.`,
    '',
    '| Documento | Páginas OpenWord | Páginas Word | Saltos iguales | Primera diferencia |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...rows.map((r) => {
      if ('error' in r) return `| ${String(r['file'])} | error: ${String(r['error']).slice(0, 60)} | | | |`;
      if (r['reference'] !== true) return `| ${String(r['file'])} | ${String(r['ourPages'])} | — | — | — |`;
      const c = r as unknown as (typeof withRef)[number];
      return `| ${c.file} | ${c.pages.ours} | ${c.pages.word} | ${c.matchingBreaks}/${Math.min(c.pages.ours, c.pages.word)} | ${c.firstMismatch ?? '—'} |`;
    }),
    '',
  ];
  writeFileSync(join(REPORT, 'report.md'), lines.join('\n'));
  writeFileSync(join(REPORT, 'report.json'), JSON.stringify(rows, null, 2));
  expect(
    rows.filter((r) => 'error' in r),
    'documentos que no se pudieron exportar',
  ).toEqual([]);
});
