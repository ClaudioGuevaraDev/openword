import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FIXTURES, mockDialogs } from './launch';
import { clickDocument, expect, mod, test, type App } from './fixtures';

/** Tamaños de página (pt) de un PDF generado por Chromium, en orden. */
function pdfPageSizes(pdf: Buffer): string[] {
  const text = pdf.toString('latin1');
  return [...text.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g)].map(
    (m) => `${Math.round(Number(m[1]))}x${Math.round(Number(m[2]))}`,
  );
}

const hiddenWindows = (app: App) =>
  app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((w) => !w.isVisible()).length);

test.describe('con un documento de secciones', () => {
  test.use({ appOptions: { args: [join(FIXTURES, 'issue-319-sections.docx')] } });

  test(
    'Exportar a PDF: todas las páginas, con orientación mixta (A4 vertical y horizontal)',
    { tag: '@slow' },
    async ({ app, win, workDir }) => {
      const out = join(workDir, 'contrato');
      await mockDialogs(app, { save: out });
      await win.getByRole('button', { name: 'Archivo' }).click();
      await win.getByTestId('backstage-export').click();
      await win.getByTestId('export-pdf').click();
      await expect(win.getByTestId('export-status')).toHaveText('Se guardó «contrato.pdf».', {
        timeout: 60_000,
      });
      const pdf = readFileSync(`${out}.pdf`);
      expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
      expect(pdfPageSizes(pdf)).toEqual(['595x842', '595x842', '595x842', '842x595']);
      await expect.poll(() => hiddenWindows(app)).toBe(0); // la ventana de impresión se descartó
    },
  );
});

test.describe('con un documento de 6 páginas', () => {
  test.use({ appOptions: { args: [join(FIXTURES, 'footer-page-number.docx')] } });

  test('Ctrl+P abre Imprimir con vista previa; Imprimir usa el diálogo del sistema', async ({ app, win }) => {
    await clickDocument(win);
    await win.keyboard.press(`${mod}+p`);
    await expect(win.getByTestId('backstage-print')).toHaveAttribute('aria-current', 'page');
    await expect(win.getByTestId('print-pages')).toHaveText('6 páginas', { timeout: 60_000 });
    await expect(win.getByTestId('preview-page')).toHaveCount(6);
    await expect.poll(() => hiddenWindows(app)).toBe(1);

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
    await expect.poll(() => hiddenWindows(app)).toBe(0);
  });

  test('cerrar la ventana del documento descarta un trabajo de impresión pendiente', async ({ app, win }) => {
    await win.keyboard.press(`${mod}+p`);
    await expect(win.getByTestId('print-pages')).toHaveText('6 páginas', { timeout: 60_000 });
    await expect.poll(() => hiddenWindows(app)).toBe(1);
    if (process.platform === 'darwin') {
      // En macOS la app sigue viva sin ventanas: basta con que no quede la oculta de impresión.
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()
          .find((w) => w.isVisible())!
          .close(),
      );
      await expect
        .poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length))
        .toBe(0);
      return;
    }
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
});
