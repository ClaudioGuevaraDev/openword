import { expect, test, type Page } from '@playwright/test';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { closeAll, FIXTURES, launchApp, mockDialogs, waitForDocument } from './launch';

const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

let app: Awaited<ReturnType<typeof launchApp>>;
let win: Page;

test.afterEach(async () => {
  await closeAll(app);
});

async function open(fixture: string): Promise<void> {
  app = await launchApp({ args: [join(FIXTURES, fixture)] });
  win = await app.firstWindow();
  await waitForDocument(win);
}

/** Tamaños de página (pt) de un PDF generado por Chromium, en orden. */
function pdfPageSizes(pdf: Buffer): string[] {
  const text = pdf.toString('latin1');
  return [...text.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g)].map(
    (m) => `${Math.round(Number(m[1]))}x${Math.round(Number(m[2]))}`,
  );
}

const hiddenWindows = () =>
  app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((w) => !w.isVisible()).length);

test('Exportar a PDF: todas las páginas, con orientación mixta (A4 vertical y horizontal)', async () => {
  await open('issue-319-sections.docx');
  const out = join(mkdtempSync(join(tmpdir(), 'ow-pdf-')), 'contrato');
  await mockDialogs(app, { save: out });
  await win.getByTestId('tab-file').click();
  await win.getByTestId('backstage-export').click();
  await win.getByTestId('export-pdf').click();
  await expect(win.getByTestId('export-status')).toHaveText('Se guardó «contrato.pdf».', { timeout: 60_000 });
  const pdf = readFileSync(`${out}.pdf`);
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  expect(pdfPageSizes(pdf)).toEqual(['595x842', '595x842', '595x842', '842x595']);
  await expect.poll(hiddenWindows).toBe(0); // la ventana de impresión se descartó
});

test('Ctrl+P abre Imprimir con vista previa; Imprimir usa el diálogo del sistema', async () => {
  await open('footer-page-number.docx');
  await win
    .locator('.docx-page')
    .first()
    .click({ position: { x: 150, y: 120 } });
  await win.keyboard.press(`${mod}+p`);
  await expect(win.getByTestId('backstage-print')).toHaveAttribute('aria-current', 'page');
  await expect(win.getByTestId('print-pages')).toHaveText('6 páginas', { timeout: 60_000 });
  await expect(win.getByTestId('preview-page')).toHaveCount(6);
  expect(await hiddenWindows()).toBe(1);

  // El diálogo de impresión del sistema no se puede automatizar: se simula en la ventana oculta.
  await app.evaluate(({ BrowserWindow }) => {
    const g = globalThis as unknown as { __owPrinted: unknown[] };
    g.__owPrinted = [];
    for (const w of BrowserWindow.getAllWindows().filter((x) => !x.isVisible())) {
      w.webContents.print = ((options: unknown, callback?: (ok: boolean, reason: string) => void) => {
        g.__owPrinted.push(options);
        callback?.(true, '');
      }) as typeof w.webContents.print;
    }
  });
  await win.getByTestId('print-button').click();
  await expect(win.getByRole('status')).toHaveText('Documento enviado a la impresora.');
  const printed = await app.evaluate(
    () => (globalThis as unknown as { __owPrinted: { silent: boolean }[] }).__owPrinted,
  );
  expect(printed).toEqual([{ silent: false, printBackground: true }]);

  await win.keyboard.press('Escape');
  await expect(win.getByTestId('backstage')).toHaveCount(0);
  await expect.poll(hiddenWindows).toBe(0);
});

test('cerrar la ventana del documento descarta un trabajo de impresión pendiente', async () => {
  await open('footer-page-number.docx');
  await win.keyboard.press(`${mod}+p`);
  await expect(win.getByTestId('print-pages')).toHaveText('6 páginas', { timeout: 60_000 });
  expect(await hiddenWindows()).toBe(1);
  await Promise.all([
    app.waitForEvent('close'),
    app
      .evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()
          .find((w) => w.isVisible())!
          .close(),
      )
      .catch(() => undefined),
  ]);
});
