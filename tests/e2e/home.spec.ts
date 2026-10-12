import type { Page } from '@playwright/test';
import { join } from 'node:path';
import { mockDialogs } from './launch';
import { clickDocument, expect, mod, saveAndRead, test as base, type App } from './fixtures';

const test = base.extend<{ out: string }>({
  // Cada prueba empieza con el cursor en la página y "Guardar como" simulado hacia `out`.
  out: [
    async ({ app, win, workDir }, use) => {
      const out = join(workDir, 'resultado.docx');
      await mockDialogs(app, { save: out });
      await clickDocument(win);
      await use(out);
    },
    { auto: true },
  ],
});

/** Guarda y devuelve word/document.xml del archivo resultante. */
async function savedXml(app: App, win: Page, out: string): Promise<string> {
  return (await saveAndRead(app, win, out))['word/document.xml']!;
}

async function typeAndSelectAll(win: Page, text: string): Promise<void> {
  await win.keyboard.type(text);
  // Esperar a que el motor procese lo tecleado antes de seleccionar.
  await expect(win.locator('.docx-page').first()).toContainText(text);
  await win.keyboard.press(`${mod}+a`);
  await expect.poll(() => win.evaluate(() => window.getSelection()?.toString() ?? '')).toContain(text);
}

test('negrita, cursiva y centrar desde la cinta reflejan el estado y se guardan', async ({
  app,
  win,
  out,
}) => {
  await typeAndSelectAll(win, 'Texto con formato');
  await win.getByRole('button', { name: 'Negrita', exact: true }).click();
  await win.getByRole('button', { name: 'Cursiva', exact: true }).click();
  await win.getByRole('button', { name: 'Centrar', exact: true }).click();
  await expect(win.getByRole('button', { name: 'Negrita', exact: true, pressed: true })).toBeVisible();
  await expect(win.getByRole('button', { name: 'Cursiva', exact: true, pressed: true })).toBeVisible();
  await expect(win.getByRole('button', { name: 'Centrar', exact: true, pressed: true })).toBeVisible();
  const xml = await savedXml(app, win, out);
  expect(xml).toMatch(/<w:b\/>|<w:b w:val="(1|true)"\/>/);
  expect(xml).toMatch(/<w:i\/>|<w:i w:val="(1|true)"\/>/);
  expect(xml).toContain('<w:jc w:val="center"/>');
});

test('fuente y tamaño escritos en los cuadros combinados', async ({ app, win, out }) => {
  await typeAndSelectAll(win, 'Tamaño y fuente');
  const size = win.getByTestId('font-size');
  await size.fill('16');
  await size.press('Enter');
  await expect(size).toHaveValue('16');
  const family = win.getByTestId('font-family');
  await family.fill('Liberation Serif');
  await family.press('Enter');
  await expect(family).toHaveValue('Liberation Serif');
  const xml = await savedXml(app, win, out);
  expect(xml).toContain('<w:sz w:val="32"/>');
  expect(xml).toMatch(/w:ascii="Liberation Serif"/);
});

test('Agrandar fuente con Ctrl+Mayús+> sigue los pasos de Word', async ({ win }) => {
  await typeAndSelectAll(win, 'Más grande');
  const size = win.getByTestId('font-size');
  await expect(size).toHaveValue('11'); // Calibri 11 del documento en blanco
  await win.keyboard.press(`${mod}+Shift+>`);
  await expect(size).toHaveValue('12');
  await win.keyboard.press(`${mod}+Shift+>`);
  await expect(size).toHaveValue('14');
  await win.keyboard.press(`${mod}+Shift+<`);
  await expect(size).toHaveValue('12');
});

test('color de fuente y resaltado desde las paletas', async ({ app, win, out }) => {
  await typeAndSelectAll(win, 'Colores');
  await win.getByRole('button', { name: 'Color de fuente', exact: true }).click();
  await win.getByRole('button', { name: 'Rojo oscuro' }).click();
  await win.getByRole('button', { name: 'Color de resaltado del texto', exact: true }).click();
  await win.getByRole('button', { name: 'Amarillo', exact: true }).click();
  const xml = await savedXml(app, win, out);
  expect(xml).toContain('<w:color w:val="C00000"/>');
  expect(xml).toContain('<w:highlight w:val="yellow"/>');
});

test('galería de estilos aplica Título 1 (Heading1)', async ({ app, win, out }) => {
  await win.keyboard.type('Capítulo uno');
  await win.getByTestId('style-gallery').getByRole('button', { name: 'Título 1', exact: true }).click();
  await expect(
    win.getByTestId('style-gallery').getByRole('button', { name: 'Título 1', exact: true, pressed: true }),
  ).toBeVisible();
  const xml = await savedXml(app, win, out);
  expect(xml).toMatch(/<w:pStyle w:val="Heading1"\/>/);
});

test('Pegar desde la cinta usa el portapapeles del sistema', async ({ app, win }) => {
  await app.evaluate(({ clipboard }) => clipboard.writeText('Texto pegado desde fuera'));
  await win.getByTestId('paste').click();
  await expect(win.locator('.docx-page').first()).toContainText('Texto pegado desde fuera');
});

test('barra de estado: palabras y zoom', async ({ win }) => {
  await win.keyboard.type('una dos tres cuatro');
  await expect(win.getByTestId('status-words')).toHaveText('4 palabras');
  const zoom = win.getByTestId('zoom-percent');
  const before = await zoom.textContent();
  await win.getByLabel('Acercar').click();
  await expect(zoom).not.toHaveText(before ?? '');
  await zoom.click();
  await expect(zoom).toHaveText('100 %');
});

test('interlineado 1,5 desde el menú y diálogo Párrafo desde el iniciador del grupo', async ({
  app,
  win,
  out,
}) => {
  await win.keyboard.type('Interlineado');
  await win.getByLabel('Espaciado entre líneas y párrafos').click();
  await win.getByRole('menuitemradio', { name: '1,5' }).click();
  await win.getByLabel('Configuración de párrafo').click();
  await expect(win.getByRole('dialog')).toBeVisible();
  await win.keyboard.press('Escape');
  await expect(win.getByRole('dialog')).toHaveCount(0);
  const xml = await savedXml(app, win, out);
  expect(xml).toMatch(/<w:spacing[^>]*w:line="360"[^>]*w:lineRule="auto"/);
});

test('color Automático quita el color directo', async ({ app, win, out }) => {
  await typeAndSelectAll(win, 'Auto');
  await win.getByRole('button', { name: 'Color de fuente', exact: true }).click();
  await win.getByRole('button', { name: 'Rojo oscuro' }).click();
  await win.getByRole('button', { name: 'Color de fuente', exact: true }).click();
  await win.getByRole('button', { name: 'Automático' }).click();
  const xml = await savedXml(app, win, out);
  expect(xml).not.toContain('w:val="C00000"');
});

test('teclado: las flechas recorren las pestañas; Archivo es modal y Esc devuelve el foco', async ({
  win,
}) => {
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

test('tabla desde la cuadrícula solo con el teclado', async ({ win }) => {
  await win.getByRole('tab', { name: 'Insertar' }).click();
  await win.getByTestId('insert-table').click();
  await expect(win.getByRole('gridcell', { name: 'Tabla de 1 × 1' })).toBeFocused();
  await win.keyboard.press('ArrowRight');
  await win.keyboard.press('ArrowDown');
  await expect(win.getByRole('gridcell', { name: 'Tabla de 2 × 2' })).toBeFocused();
  await win.keyboard.press('Enter');
  await expect(win.getByRole('tab', { name: 'Tabla' })).toBeVisible();
});
