import { expect, test, type ElectronApplication, type Page } from '@playwright/test';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { strFromU8, unzipSync } from 'fflate';
import { closeAll, launchApp, mockDialogs, waitForDocument } from './launch';

const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

let app: ElectronApplication;
let win: Page;
let out: string;

test.beforeEach(async () => {
  app = await launchApp();
  win = await app.firstWindow();
  await waitForDocument(win);
  out = join(mkdtempSync(join(tmpdir(), 'ow-home-')), 'resultado.docx');
  await mockDialogs(app, { save: out });
  await win
    .locator('.docx-page')
    .first()
    .click({ position: { x: 150, y: 120 } });
});

test.afterEach(async () => {
  await closeAll(app);
});

/** Guarda y devuelve word/document.xml del archivo resultante. */
async function savedXml(): Promise<string> {
  await win.keyboard.press(`${mod}+s`);
  await expect
    .poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.getTitle()))
    .toBe('resultado.docx - OpenWord');
  return strFromU8(unzipSync(new Uint8Array(readFileSync(out)))['word/document.xml']!);
}

async function typeAndSelectAll(text: string): Promise<void> {
  await win.keyboard.type(text);
  // Esperar a que el motor procese lo tecleado antes de seleccionar.
  await expect(win.locator('.docx-page').first()).toContainText(text);
  await win.keyboard.press(`${mod}+a`);
  await expect.poll(() => win.evaluate(() => window.getSelection()?.toString() ?? '')).toContain(text);
}

test('negrita, cursiva y centrar desde la cinta reflejan el estado y se guardan', async () => {
  await typeAndSelectAll('Texto con formato');
  await win.getByTestId('bold').click();
  await win.getByTestId('italic').click();
  await win.getByTestId('align-center').click();
  await expect(win.getByTestId('bold')).toHaveAttribute('aria-pressed', 'true');
  await expect(win.getByTestId('align-center')).toHaveAttribute('aria-pressed', 'true');
  const xml = await savedXml();
  expect(xml).toMatch(/<w:b\/>|<w:b w:val="(1|true)"\/>/);
  expect(xml).toMatch(/<w:i\/>|<w:i w:val="(1|true)"\/>/);
  expect(xml).toContain('<w:jc w:val="center"/>');
});

test('fuente y tamaño escritos en los cuadros combinados', async () => {
  await typeAndSelectAll('Tamaño y fuente');
  const size = win.getByTestId('font-size');
  await size.fill('16');
  await size.press('Enter');
  await expect(size).toHaveValue('16');
  const family = win.getByTestId('font-family');
  await family.fill('Liberation Serif');
  await family.press('Enter');
  await expect(family).toHaveValue('Liberation Serif');
  const xml = await savedXml();
  expect(xml).toContain('<w:sz w:val="32"/>');
  expect(xml).toMatch(/w:ascii="Liberation Serif"/);
});

test('Agrandar fuente con Ctrl+Mayús+> sigue los pasos de Word', async () => {
  await typeAndSelectAll('Más grande');
  const size = win.getByTestId('font-size');
  const before = await size.inputValue(); // Calibri 11 del documento en blanco
  expect(before).toBe('11');
  await win.keyboard.press(`${mod}+Shift+>`);
  await expect(size).toHaveValue('12');
  await win.keyboard.press(`${mod}+Shift+>`);
  await expect(size).toHaveValue('14');
  await win.keyboard.press(`${mod}+Shift+<`);
  await expect(size).toHaveValue('12');
});

test('color de fuente y resaltado desde las paletas', async () => {
  await typeAndSelectAll('Colores');
  await win.getByLabel('Color de fuente: más colores').click();
  await win.getByRole('button', { name: 'Rojo oscuro' }).click();
  await win.getByLabel('Color de resaltado del texto: más colores').click();
  await win.getByRole('button', { name: 'Amarillo', exact: true }).click();
  const xml = await savedXml();
  expect(xml).toContain('<w:color w:val="C00000"/>');
  expect(xml).toContain('<w:highlight w:val="yellow"/>');
});

test('galería de estilos aplica Título 1 (Heading1)', async () => {
  await win.keyboard.type('Capítulo uno');
  await win.getByTestId('style-gallery').getByRole('button', { name: 'Título 1', exact: true }).click();
  await expect(
    win.getByTestId('style-gallery').getByRole('button', { name: 'Título 1', exact: true, pressed: true }),
  ).toBeVisible();
  const xml = await savedXml();
  expect(xml).toMatch(/<w:pStyle w:val="Heading1"\/>/);
});

test('Pegar desde la cinta usa el portapapeles del sistema', async () => {
  await app.evaluate(({ clipboard }) => clipboard.writeText('Texto pegado desde fuera'));
  await win.getByTestId('paste').click();
  await expect(win.locator('.docx-page').first()).toContainText('Texto pegado desde fuera');
});

test('barra de estado: palabras y zoom', async () => {
  await win.keyboard.type('una dos tres cuatro');
  await expect(win.getByTestId('status-words')).toHaveText('4 palabras');
  const zoom = win.getByTestId('zoom-percent');
  const before = await zoom.textContent();
  await win.getByLabel('Acercar').click();
  await expect(zoom).not.toHaveText(before ?? '');
  await zoom.click();
  await expect(zoom).toHaveText('100 %');
});

test('interlineado 1,5 desde el menú y diálogo Párrafo desde el iniciador del grupo', async () => {
  await win.keyboard.type('Interlineado');
  await win.getByLabel('Espaciado entre líneas y párrafos').click();
  await win.getByRole('menuitemradio', { name: '1,5' }).click();
  await win.getByLabel('Configuración de párrafo').click();
  await expect(win.getByRole('dialog')).toBeVisible();
  await win.keyboard.press('Escape');
  await expect(win.getByRole('dialog')).toHaveCount(0);
  const xml = await savedXml();
  expect(xml).toMatch(/<w:spacing[^>]*w:line="360"[^>]*w:lineRule="auto"/);
});

test('color Automático quita el color directo', async () => {
  await typeAndSelectAll('Auto');
  await win.getByLabel('Color de fuente: más colores').click();
  await win.getByRole('button', { name: 'Rojo oscuro' }).click();
  await win.getByLabel('Color de fuente: más colores').click();
  await win.getByRole('button', { name: 'Automático' }).click();
  const xml = await savedXml();
  expect(xml).not.toContain('w:val="C00000"');
});

test('teclado: las flechas recorren las pestañas; Archivo es modal y Esc devuelve el foco', async () => {
  await win.getByRole('tab', { name: 'Inicio' }).focus();
  await win.keyboard.press('ArrowRight');
  await expect(win.getByRole('tab', { name: 'Insertar' })).toBeFocused();
  await expect(win.getByRole('tab', { name: 'Insertar' })).toHaveAttribute('aria-selected', 'true');
  await win.keyboard.press('End');
  await expect(win.getByRole('tab', { name: 'Vista' })).toBeFocused();

  const file = win.getByRole('button', { name: 'Archivo' });
  await file.click();
  await expect(file).toHaveAttribute('aria-expanded', 'true');
  await expect(win.getByRole('button', { name: 'Volver al documento' })).toBeFocused();
  // La cinta queda inerte (sin foco ni lector de pantalla) detrás del Backstage.
  await expect(win.locator('[inert] #ribbon-tab-view')).toHaveCount(1);
  await win.keyboard.press('Escape');
  await expect(win.getByTestId('backstage')).toBeHidden();
  await expect(file).toBeFocused();
  await expect(win.getByRole('tab', { name: 'Vista' })).toHaveAttribute('aria-selected', 'true');
});

test('tabla desde la cuadrícula solo con el teclado', async () => {
  await win.getByTestId('tab-insert').click();
  await win.getByTestId('insert-table').click();
  await expect(win.getByRole('gridcell', { name: 'Tabla de 1 × 1' })).toBeFocused();
  await win.keyboard.press('ArrowRight');
  await win.keyboard.press('ArrowDown');
  await expect(win.getByRole('gridcell', { name: 'Tabla de 2 × 2' })).toBeFocused();
  await win.keyboard.press('Enter');
  await expect(win.getByRole('tab', { name: 'Tabla' })).toBeVisible();
});
