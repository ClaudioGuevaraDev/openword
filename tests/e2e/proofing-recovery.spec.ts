import type { Page } from '@playwright/test';
import { chmodSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import CFB from 'cfb';
import { closeAll, FIXTURES, killApp, mockDialogs, shownMessages, windowTitles } from './launch';
import { clickDocument, documentWindow, expect, mod, saveAndRead, test } from './fixtures';

/** Escribe al final del documento y espera a que el motor lo muestre. */
async function typeText(win: Page, text: string): Promise<void> {
  await clickDocument(win);
  await win.keyboard.press(`${mod}+End`);
  await win.keyboard.type(text);
  await expect(win.locator('.docx-page').first()).toContainText(text.trim());
}

test.describe('corrector ortográfico', () => {
  test.skip(process.platform === 'darwin', 'en macOS el diccionario es el del sistema');

  test('subraya las palabras mal escritas y corrige desde el menú contextual', async ({ win }) => {
    await typeText(win, 'Esta es una prueva sencilla. ');
    const marks = win.locator('.ow-misspelled');
    await expect(marks).toHaveCount(1);
    // El subrayado es una capa debajo del texto: se hace clic derecho sobre la palabra.
    await win.locator('.docx-page').getByText('prueva').click({ button: 'right' });
    await win.getByRole('menuitem', { name: 'prueba', exact: true }).click();
    await expect(win.locator('.docx-page').first()).toContainText('Esta es una prueba sencilla.');
    await expect(marks).toHaveCount(0);
  });

  test('Omitir todo, MAYÚSCULAS y desactivar el corrector en Opciones', async ({ win }) => {
    await typeText(win, 'Hola ONUX y xyzzq y xyzzq. ');
    const marks = win.locator('.ow-misspelled');
    await expect(marks).toHaveCount(2); // ONUX se omite por estar en mayúsculas
    await win.locator('.docx-page').getByText('xyzzq').first().click({ button: 'right' });
    await win.getByRole('menuitem', { name: 'Omitir todo' }).click();
    await expect(marks).toHaveCount(0);

    await typeText(win, 'otra palabrra ');
    await expect(marks).toHaveCount(1);
    await win.getByRole('button', { name: 'Archivo' }).click();
    await win.getByTestId('backstage-options').click();
    await win.getByRole('checkbox', { name: 'Revisar la ortografía mientras escribe' }).uncheck();
    await win.keyboard.press('Escape');
    await expect(marks).toHaveCount(0);
  });
});

test('Opciones: cambiar el idioma de la interfaz a inglés y que se recuerde', async ({
  app,
  win,
  launch,
}) => {
  await win.getByRole('button', { name: 'Archivo' }).click();
  await win.getByTestId('backstage-options').click();
  await win.getByRole('combobox', { name: 'Idioma de la interfaz' }).selectOption('en');
  await win.keyboard.press('Escape');
  await expect(win.getByRole('tab', { name: 'Home' })).toBeVisible();
  await closeAll(app);
  const again = await launch({ userData: app.userData });
  const win2 = await documentWindow(again);
  await expect(win2.getByRole('tab', { name: 'Home' })).toBeVisible();
  await expect.poll(() => windowTitles(again)).toEqual([expect.stringMatching(/^Document1/)]);
});

test.describe('LibreOffice', () => {
  test('sin LibreOffice: explica cómo instalarlo al abrir un .doc', async ({ app, win, workDir }) => {
    const doc = join(workDir, 'viejo.rtf');
    writeFileSync(doc, '{\\rtf1\\ansi Hola}');
    await mockDialogs(app, { open: [doc], messageBox: [1] });
    await win.evaluate(() => window.openword.file.openDialog());
    await expect.poll(() => shownMessages(app)).toEqual(['Para abrir «viejo.rtf» se necesita LibreOffice.']);
  });

  test('con LibreOffice: convierte, abre sin guardar y "Guardar" pide un .docx nuevo', async ({
    launch,
    workDir,
  }) => {
    test.skip(process.platform === 'win32', 'el soffice simulado es un script de shell');
    const fake = join(workDir, 'soffice');
    // Imita a soffice: copia un .docx real en <outdir>/documento.docx.
    writeFileSync(
      fake,
      `#!/bin/sh\nwhile [ $# -gt 0 ]; do if [ "$1" = "--outdir" ]; then out="$2"; fi; shift; done\ncp "${join(FIXTURES, 'footer-page-number.docx')}" "$out/documento.docx"\n`,
    );
    chmodSync(fake, 0o755);
    const doc = join(workDir, 'informe viejo.doc');
    // Contenedor CFB real con el stream WordDocument (lo que tiene un .doc de Word 97-2003).
    const cfb = CFB.utils.cfb_new();
    CFB.utils.cfb_add(cfb, '/WordDocument', Buffer.alloc(4096, 1));
    const original = Buffer.from(CFB.write(cfb, { type: 'buffer' }) as Buffer);
    writeFileSync(doc, original);

    const app = await launch({ args: [doc], env: { OPENWORD_SOFFICE: fake } });
    const win = await documentWindow(app);
    await expect(win.getByTestId('notice-converted')).toBeVisible();
    await expect.poll(() => windowTitles(app)).toEqual(['informe viejo.docx - OpenWord']);
    const out = join(workDir, 'informe nuevo.docx');
    await mockDialogs(app, { save: out });
    await win.keyboard.press(`${mod}+s`);
    await expect.poll(() => windowTitles(app)).toEqual(['informe nuevo.docx - OpenWord']);
    expect(existsSync(out)).toBe(true);
    expect(readFileSync(doc).equals(original)).toBe(true); // el original no cambia
  });
});

test('recuperación: tras un cierre inesperado, el documento vuelve con sus cambios', async ({
  launch,
  workDir,
}) => {
  const env = { OPENWORD_AUTORECOVER_MS: '1000' };
  const crashed = await launch({ env });
  const userData = crashed.userData;
  await typeText(await documentWindow(crashed), 'Texto que no se guardó ');
  // Esperar a que se escriba la copia de recuperación y "matar" la app.
  const recoveryFiles = () =>
    existsSync(join(userData, 'recovery')) ? readdirSync(join(userData, 'recovery')) : [];
  await expect
    .poll(() => recoveryFiles().filter((f) => f.endsWith('.docx')).length, { timeout: 10_000 })
    .toBe(1);
  killApp(crashed);
  await crashed.waitForEvent('close').catch(() => undefined);

  const app = await launch({ userData, env });
  const win = await documentWindow(app);
  await expect(win.getByTestId('notice-recovered')).toBeVisible();
  await expect(win.locator('.docx-page').first()).toContainText('Texto que no se guardó');
  await expect.poll(() => windowTitles(app)).toEqual([expect.stringContaining('•')]);

  const out = join(workDir, 'recuperado.docx');
  await mockDialogs(app, { save: out });
  const pkg = await saveAndRead(app, win, out);
  expect(pkg['word/document.xml']).toContain('Texto que no se guardó');
  await expect.poll(() => recoveryFiles().length).toBe(0);
});
