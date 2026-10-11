import { expect, test, type Page } from '@playwright/test';
import { chmodSync, existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import CFB from 'cfb';
import { strFromU8, unzipSync } from 'fflate';
import {
  closeAll,
  FIXTURES,
  launchApp,
  mockDialogs,
  shownMessages,
  waitForDocument,
  windowTitles,
} from './launch';

const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
let app: Awaited<ReturnType<typeof launchApp>>;
let win: Page;

test.afterEach(async () => {
  if (app) await closeAll(app);
});

async function start(options: Parameters<typeof launchApp>[0] = {}): Promise<void> {
  app = await launchApp(options);
  win = await app.firstWindow();
  await waitForDocument(win);
}

async function typeText(text: string): Promise<void> {
  await win
    .locator('.docx-page')
    .first()
    .click({ position: { x: 150, y: 120 } });
  await win.keyboard.press(`${mod}+End`);
  await win.keyboard.type(text);
  await expect(win.locator('.docx-page').first()).toContainText(text.trim());
}

test.describe('corrector ortográfico', () => {
  test.skip(process.platform === 'darwin', 'en macOS el diccionario es el del sistema');

  test('subraya las palabras mal escritas y corrige desde el menú contextual', async () => {
    await start();
    await typeText('Esta es una prueva sencilla. ');
    const marks = win.locator('.ow-misspelled');
    await expect(marks).toHaveCount(1);
    const box = (await marks.first().boundingBox())!;
    await win.mouse.click(box.x + box.width / 2, box.y + box.height / 2 - 4, { button: 'right' });
    await win.getByRole('menuitem', { name: 'prueba', exact: true }).click();
    await expect(win.locator('.docx-page').first()).toContainText('Esta es una prueba sencilla.');
    await expect(marks).toHaveCount(0);
  });

  test('Omitir todo, MAYÚSCULAS y desactivar el corrector en Opciones', async () => {
    await start();
    await typeText('Hola ONUX y xyzzq y xyzzq. ');
    const marks = win.locator('.ow-misspelled');
    await expect(marks).toHaveCount(2); // ONUX se omite por estar en mayúsculas
    const box = (await marks.first().boundingBox())!;
    await win.mouse.click(box.x + box.width / 2, box.y + box.height / 2 - 4, { button: 'right' });
    await win.getByRole('menuitem', { name: 'Omitir todo' }).click();
    await expect(marks).toHaveCount(0);

    await typeText('otra palabrra ');
    await expect(marks).toHaveCount(1);
    await win.getByTestId('tab-file').click();
    await win.getByTestId('backstage-options').click();
    await win.getByTestId('option-spellcheck').uncheck();
    await win.keyboard.press('Escape');
    await expect(marks).toHaveCount(0);
  });
});

test('Opciones: cambiar el idioma de la interfaz a inglés y que se recuerde', async () => {
  await start();
  const userData = app.userData;
  await win.getByTestId('tab-file').click();
  await win.getByTestId('backstage-options').click();
  await win.getByTestId('option-language').selectOption('en');
  await win.keyboard.press('Escape');
  await expect(win.getByTestId('tab-home')).toHaveText('Home');
  await closeAll(app);
  await start({ userData });
  await expect(win.getByTestId('tab-home')).toHaveText('Home');
  expect((await windowTitles(app))[0]).toMatch(/^Document1/);
});

test.describe('LibreOffice', () => {
  test('sin LibreOffice: explica cómo instalarlo al abrir un .doc', async () => {
    await start();
    const dir = mkdtempSync(join(tmpdir(), 'ow-lo-'));
    const doc = join(dir, 'viejo.rtf');
    writeFileSync(doc, '{\\rtf1\\ansi Hola}');
    await mockDialogs(app, { open: [doc], messageBox: [1] });
    await win.evaluate(() => window.openword.file.openDialog());
    expect(await shownMessages(app)).toEqual(['Para abrir «viejo.rtf» se necesita LibreOffice.']);
  });

  test.skip(process.platform === 'win32', 'el soffice simulado es un script de shell');
  test('con LibreOffice: convierte, abre sin guardar y "Guardar" pide un .docx nuevo', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ow-lo-'));
    const fake = join(dir, 'soffice');
    // Imita a soffice: copia un .docx real en <outdir>/documento.docx.
    writeFileSync(
      fake,
      `#!/bin/sh\nwhile [ $# -gt 0 ]; do if [ "$1" = "--outdir" ]; then out="$2"; fi; shift; done\ncp "${join(FIXTURES, 'footer-page-number.docx')}" "$out/documento.docx"\n`,
    );
    chmodSync(fake, 0o755);
    const doc = join(dir, 'informe viejo.doc');
    // Contenedor CFB real con el stream WordDocument (lo que tiene un .doc de Word 97-2003).
    const cfb = CFB.utils.cfb_new();
    CFB.utils.cfb_add(cfb, '/WordDocument', Buffer.alloc(4096, 1));
    const original = Buffer.from(CFB.write(cfb, { type: 'buffer' }) as Buffer);
    writeFileSync(doc, original);

    await start({ args: [doc], env: { OPENWORD_SOFFICE: fake } });
    await expect(win.getByTestId('notice-converted')).toBeVisible();
    expect(await windowTitles(app)).toEqual(['informe viejo.docx - OpenWord']);
    const out = join(dir, 'informe nuevo.docx');
    await mockDialogs(app, { save: out });
    await win.keyboard.press(`${mod}+s`);
    await expect.poll(() => windowTitles(app)).toEqual(['informe nuevo.docx - OpenWord']);
    expect(existsSync(out)).toBe(true);
    expect(readFileSync(doc).equals(original)).toBe(true); // el original no cambia
  });
});

test('recuperación: tras un cierre inesperado, el documento vuelve con sus cambios', async () => {
  const env = { OPENWORD_AUTORECOVER_MS: '1000' };
  await start({ env });
  const userData = app.userData;
  await typeText('Texto que no se guardó ');
  // Esperar a que se escriba la copia de recuperación y "matar" la app.
  const recoveryFiles = () =>
    existsSync(join(userData, 'recovery')) ? readdirSync(join(userData, 'recovery')) : [];
  await expect
    .poll(() => recoveryFiles().filter((f) => f.endsWith('.docx')).length, { timeout: 10_000 })
    .toBe(1);
  app.process().kill('SIGKILL');
  await app.waitForEvent('close').catch(() => undefined);

  await start({ userData, env });
  await expect(win.getByTestId('notice-recovered')).toBeVisible();
  await expect(win.locator('.docx-page').first()).toContainText('Texto que no se guardó');
  expect((await windowTitles(app))[0]).toMatch(/•/);

  const out = join(mkdtempSync(join(tmpdir(), 'ow-rec-')), 'recuperado.docx');
  await mockDialogs(app, { save: out });
  await win.keyboard.press(`${mod}+s`);
  await expect.poll(() => windowTitles(app)).toEqual(['recuperado.docx - OpenWord']);
  expect(strFromU8(unzipSync(new Uint8Array(readFileSync(out)))['word/document.xml']!)).toContain(
    'Texto que no se guardó',
  );
  await expect.poll(() => recoveryFiles().length).toBe(0);
});
