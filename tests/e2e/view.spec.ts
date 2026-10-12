import { expect, test, type Page } from '@playwright/test';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { strFromU8, unzipSync } from 'fflate';
import { closeAll, FIXTURES, launchApp, mockDialogs, waitForDocument } from './launch';

const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
const replaceKey = process.platform === 'darwin' ? 'Control+h' : `${mod}+h`;

let app: Awaited<ReturnType<typeof launchApp>>;
let win: Page;

test.afterEach(async () => {
  await closeAll(app);
});

async function open(args: string[] = []): Promise<void> {
  app = await launchApp({ args });
  win = await app.firstWindow();
  await waitForDocument(win);
}

test('Ctrl+F abre el panel de navegación en Buscar; muestra los títulos del documento', async () => {
  await open([join(FIXTURES, 'comprehensive-word-element-test.docx')]);
  await win
    .locator('.docx-page')
    .first()
    .click({ position: { x: 300, y: 300 } });
  await win.keyboard.press(`${mod}+f`);
  await expect(win.getByRole('tab', { name: 'Buscar' })).toHaveAttribute('aria-selected', 'true');
  await win.getByRole('tab', { name: 'Títulos' }).click();
  await expect(win.getByText('2. Heading Levels').first()).toBeVisible();
});

test('Ctrl+H: Reemplazar todo cuenta, reemplaza y Esc cierra el cuadro', async () => {
  await open();
  const out = join(mkdtempSync(join(tmpdir(), 'ow-view-')), 'r.docx');
  await mockDialogs(app, { save: out });
  await win
    .locator('.docx-page')
    .first()
    .click({ position: { x: 150, y: 120 } });
  await win.keyboard.type('gato perro gato pájaro Gato');
  await expect(win.locator('.docx-page').first()).toContainText('Gato');
  await win.keyboard.press(replaceKey);
  await expect(win.getByTestId('replace-dialog')).toBeVisible();
  await win.getByTestId('replace-find').fill('gato');
  await win.getByTestId('replace-with').fill('felino');
  await win.getByTestId('replace-dialog').getByLabel('Coincidir mayúsculas y minúsculas').check();
  await win.getByTestId('replace-all').click();
  await expect(win.getByTestId('replace-status')).toHaveText('Se realizaron 2 reemplazos.');
  await win.keyboard.press('Escape');
  await expect(win.getByTestId('replace-dialog')).toHaveCount(0);
  // Deshacer revierte los reemplazos (uno por paso: el motor no agrupa replaceMatch).
  await win.keyboard.press(`${mod}+z`);
  await win.keyboard.press(`${mod}+z`);
  await expect(win.locator('.docx-page').first()).toContainText('gato perro gato');
  await win.keyboard.press(`${mod}+y`);
  await win.keyboard.press(`${mod}+y`);
  await expect(win.locator('.docx-page').first()).toContainText('felino perro felino');
  await win.keyboard.press(`${mod}+s`);
  await expect
    .poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.getTitle()))
    .toBe('r.docx - OpenWord');
  const xml = strFromU8(unzipSync(new Uint8Array(readFileSync(out)))['word/document.xml']!);
  expect(xml).toContain('felino perro felino pájaro Gato');
});

test('zoom: 100 %, ancho de página y una página', async () => {
  await open();
  await win.getByTestId('tab-view').click();
  const percent = win.getByTestId('zoom-percent');
  await win.getByTestId('zoom-100').click();
  await expect(percent).toHaveText('100 %');
  await win.getByTestId('zoom-one-page').click();
  await expect(percent).not.toHaveText('100 %');
  const onePage = Number((await percent.textContent())!.replace(/\D/g, ''));
  expect(onePage).toBeLessThan(100);
  // La página completa queda visible dentro del área del documento.
  const fits = await win.evaluate(() => {
    const page = document.querySelector('.docx-page')!.getBoundingClientRect();
    const view = document.querySelector('.docx-editor__scroll-container')!.getBoundingClientRect();
    return page.height <= view.height && page.width <= view.width;
  });
  expect(fits).toBe(true);
  await win.getByTestId('zoom-page-width').click();
  await expect(percent).not.toHaveText(`${onePage} %`);
});

test('la regla se oculta y la preferencia se recuerda al volver a abrir', async () => {
  await open();
  const userData = app.userData;
  await expect(win.getByTestId('ruler')).toBeVisible();
  await win.getByTestId('tab-view').click();
  await win.getByTestId('show-ruler').uncheck();
  await expect(win.getByTestId('ruler')).toHaveCount(0);
  await closeAll(app);
  app = await launchApp({ userData });
  win = await app.firstWindow();
  await waitForDocument(win);
  await expect(win.getByTestId('ruler')).toHaveCount(0);
});

test('modo oscuro: Vista › Modo › Oscuro activa el tema de la app y del motor', async () => {
  await open();
  await win.getByTestId('tab-view').click();
  await win.getByTestId('view-theme').click();
  await win.getByRole('menuitemradio', { name: 'Oscuro' }).click();
  await expect(win.getByTestId('app')).toHaveClass(/\bdark\b/);
  expect(await win.evaluate(() => document.documentElement.dataset['theme'])).toBe('dark');
  await win.getByTestId('view-theme').click();
  await win.getByRole('menuitemradio', { name: 'Claro' }).click();
  await expect(win.getByTestId('app')).not.toHaveClass(/\bdark\b/);
});
