// Cancelar no deja rastro: abrir cualquier función y cancelarla (Esc, clic fuera, Cancelar,
// cerrar un diálogo nativo) o no hacer nada deja el documento sin cambios ("Guardado"), sin
// ventanas ni menús abiertos y con el foco en el documento para seguir escribiendo.
import type { Page } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { clickDocument, expect, mod, saveAndRead, test } from './fixtures';
import { FIXTURES, mockDialogs, waitForDocument } from './launch';

/** Nada cambió: documento guardado, nada abierto y el foco en el documento. */
async function expectNothingChanged(win: Page, what: string): Promise<void> {
  await expect(win.getByTestId('title-bar'), `${what}: documento sin cambios`).toContainText('Guardado');
  await expect(win.locator('.docx-dialog'), `${what}: diálogo`).toHaveCount(0);
  await expect(win.locator(':popover-open'), `${what}: popover`).toHaveCount(0);
  await expect(win.getByRole('menu'), `${what}: menú`).toHaveCount(0);
  await expect
    .poll(() => win.evaluate(() => document.activeElement?.closest('.docx-content-mount') != null), {
      message: `${what}: el foco vuelve al documento`,
    })
    .toBe(true);
}

/** Documento con un párrafo escrito y guardado, con el cursor dentro. */
async function savedDocument(app: Parameters<typeof mockDialogs>[0], win: Page, path: string): Promise<void> {
  await mockDialogs(app, { save: path });
  await clickDocument(win);
  await win.keyboard.type('Texto de prueba');
  await saveAndRead(app, win, path);
  await mockDialogs(app, {});
  await expectNothingChanged(win, 'documento guardado');
}

test('documento nuevo sin escribir nada: Pie de página y Esc, y Rehacer después', async ({ win }) => {
  await expectNothingChanged(win, 'documento nuevo');
  await win.getByRole('tab', { name: 'Insertar' }).click();
  await win.getByTestId('insert-footer').click();
  await expect(win.getByTestId('docx-hf-chrome')).toBeVisible();
  await win.keyboard.press('Escape');
  await expect(win.getByTestId('docx-hf-chrome')).toHaveCount(0);
  await expectNothingChanged(win, 'salir del pie sin escribir');

  // Rehacer justo después no vuelve a crear el pie vacío (atajo y botón de la barra de título).
  await win.keyboard.press(process.platform === 'darwin' ? 'Meta+Shift+z' : `${mod}+y`);
  await expectNothingChanged(win, 'rehacer con el teclado');
  await win.getByRole('button', { name: /^Rehacer/ }).click();
  await expectNothingChanged(win, 'rehacer con el botón');

  // Y escribir en el pie lo conserva.
  await win.getByRole('tab', { name: 'Insertar' }).click();
  await win.getByTestId('insert-footer').click();
  await win.keyboard.type('Pie escrito');
  await win.keyboard.press('Escape');
  await expect(win.getByTestId('title-bar')).toContainText('Sin guardar');
  await expect(win.locator('.docx-page').first()).toContainText('Pie escrito');
});

test('Insertar: encabezado y pie vacíos, vínculo, tabla, imagen y número de página', async ({
  app,
  win,
  workDir,
}) => {
  await savedDocument(app, win, join(workDir, 'cancelar.docx'));
  const insert = () => win.getByRole('tab', { name: 'Insertar' }).click();

  // Encabezado y pie nuevos: salir sin escribir no deja una parte vacía ni cambios.
  for (const [testId, leave] of [
    ['insert-footer', () => win.keyboard.press('Escape')],
    ['insert-header', () => win.keyboard.press('Escape')],
    ['insert-footer', () => win.getByTestId('hf-close').click()],
    ['insert-header', () => clickDocument(win, { x: 300, y: 400 })],
  ] as const) {
    await insert();
    await win.getByTestId(testId).click();
    await expect(win.getByTestId('docx-hf-chrome')).toBeVisible();
    await leave();
    await expect(win.getByTestId('docx-hf-chrome')).toHaveCount(0);
    await expectNothingChanged(win, `${testId}: salir sin escribir`);
  }

  for (const cancel of [
    () => win.keyboard.press('Escape'),
    () => win.getByRole('button', { name: 'Cancelar' }).click(),
  ]) {
    await insert();
    await win.getByTestId('insert-link').click();
    await expect(win.locator('.docx-hyperlink-popup')).toBeVisible();
    await cancel();
    await expect(win.locator('.docx-hyperlink-popup')).toHaveCount(0);
    await expectNothingChanged(win, 'vínculo');
  }

  await insert();
  await win.getByTestId('insert-table').click();
  await win.keyboard.press('Escape');
  await expectNothingChanged(win, 'cuadrícula de tabla');

  await insert();
  await win.getByTestId('insert-image').click();
  await expectNothingChanged(win, 'imagen (diálogo cancelado)');

  await insert();
  await win.getByTestId('insert-page-number').click();
  await win.keyboard.press('Escape');
  await expectNothingChanged(win, 'menú número de página');
});

test('Inicio: menús, paletas, cuadros de fuente, Párrafo, Reemplazar y Buscar', async ({
  app,
  win,
  workDir,
}) => {
  await savedDocument(app, win, join(workDir, 'cancelar.docx'));
  const home = () => win.getByRole('tab', { name: 'Inicio' }).click();

  for (const name of [
    'Opciones de pegado',
    'Color de fuente',
    'Color de resaltado del texto',
    'Más estilos',
  ]) {
    for (const cancel of ['Escape', 'clic fuera'] as const) {
      await home();
      await win.getByRole('button', { name, exact: true }).click();
      if (cancel === 'Escape') await win.keyboard.press('Escape');
      else await clickDocument(win, { x: 300, y: 400 });
      await expectNothingChanged(win, `${name} (${cancel})`);
    }
  }

  await home();
  await win.getByRole('button', { name: 'Espaciado entre líneas y párrafos' }).click();
  await win.keyboard.press('Escape');
  await expectNothingChanged(win, 'interlineado');

  for (const testId of ['font-family', 'font-size']) {
    await home();
    await win.getByTestId(testId).click();
    await win.keyboard.type('Arial');
    await win.keyboard.press('Escape');
    await expectNothingChanged(win, `${testId}: escribir y Esc`);
  }

  for (const cancel of ['Escape', 'Cancelar'] as const) {
    await home();
    await win.getByRole('button', { name: 'Configuración de párrafo' }).click();
    await win.locator('.docx-dialog').getByRole('spinbutton', { name: 'Antes del texto' }).fill('3');
    if (cancel === 'Escape') await win.keyboard.press('Escape');
    else await win.locator('.docx-dialog').getByRole('button', { name: 'Cancelar' }).click();
    await expectNothingChanged(win, `Párrafo (${cancel})`);
  }

  await home();
  await win.getByTestId('home-replace').click();
  await win.getByTestId('replace-find').fill('prueba');
  await win.getByTestId('replace-with').fill('cambio');
  await win.keyboard.press('Escape');
  await expect(win.getByTestId('replace-dialog')).toHaveCount(0);
  await expectNothingChanged(win, 'Reemplazar');

  await win.keyboard.press(`${mod}+f`);
  await expect(win.locator('.docx-nav__panel-shell')).toBeVisible();
  await win.keyboard.press('Escape');
  await expectNothingChanged(win, 'Buscar');
});

test('Disposición: menús, Configurar página y campos de medida', async ({ app, win, workDir }) => {
  await savedDocument(app, win, join(workDir, 'cancelar.docx'));
  const layout = () => win.getByRole('tab', { name: 'Disposición' }).click();

  for (const testId of ['layout-margins', 'layout-orientation', 'layout-size', 'layout-breaks']) {
    await layout();
    await win.getByTestId(testId).click();
    await win.keyboard.press('Escape');
    await expectNothingChanged(win, testId);
  }

  for (const cancel of ['Escape', 'Cancelar'] as const) {
    await layout();
    await win.getByRole('button', { name: 'Configurar página' }).click();
    await win.locator('.docx-dialog').getByRole('spinbutton', { name: 'Superior' }).fill('5');
    if (cancel === 'Escape') await win.keyboard.press('Escape');
    else await win.locator('.docx-dialog').getByRole('button', { name: 'Cancelar' }).click();
    await expectNothingChanged(win, `Configurar página (${cancel})`);
  }

  for (const testId of ['indent-left', 'space-before']) {
    await layout();
    await win.getByTestId(testId).click();
    await win.keyboard.type('4');
    await win.keyboard.press('Escape');
    await expectNothingChanged(win, `${testId}: escribir y Esc`);
  }
});

test('Pestañas contextuales: imagen, encabezado existente, vista y menú contextual', async ({
  launch,
  workDir,
}) => {
  const path = join(workDir, 'flotante.docx');
  writeFileSync(path, readFileSync(join(FIXTURES, 'float-wrap-comprehensive-test.docx')));
  const app = await launch({ args: [path] });
  const win = await app.firstWindow();
  await waitForDocument(win);
  await mockDialogs(app, {});
  const image = win.locator('.docx-page img').first();
  const selectImage = async () => {
    await image.click();
    await expect(win.getByRole('tab', { name: 'Formato de imagen' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  };
  const imageStillSelected = async (what: string) => {
    await expect(win.getByTestId('title-bar'), what).toContainText('Guardado');
    await expect(win.locator('.docx-dialog'), what).toHaveCount(0);
    await expect(win.locator(':popover-open'), what).toHaveCount(0);
    await expect(win.getByRole('group', { name: 'Imagen seleccionada' }), what).toBeVisible();
  };

  await selectImage();
  await win.getByTestId('image-wrap').click();
  await win.keyboard.press('Escape');
  await imageStillSelected('Ajustar texto');

  await win.getByRole('button', { name: 'Texto alternativo' }).click();
  await expect(win.getByRole('dialog', { name: 'Texto alternativo' }).locator('textarea')).toBeFocused();
  await win.keyboard.type('Una descripción');
  await win.keyboard.press('Escape');
  await imageStillSelected('Texto alternativo');

  for (const cancel of ['Escape', 'Cancelar'] as const) {
    await win.getByRole('button', { name: 'Tamaño y posición' }).click();
    await win.locator('#image-prop-width').fill('50');
    if (cancel === 'Escape') await win.keyboard.press('Escape');
    else await win.locator('.docx-dialog').getByRole('button', { name: 'Cancelar' }).click();
    await imageStillSelected(`Propiedades de imagen (${cancel})`);
  }

  // Salir de la imagen deja el documento intacto y quita la pestaña contextual.
  await win.keyboard.press('Escape');
  await clickDocument(win, { x: 400, y: 120 });
  await expect(win.getByRole('tab', { name: 'Formato de imagen' })).toHaveCount(0);
  await expectNothingChanged(win, 'deseleccionar la imagen');

  for (const testId of ['view-zoom', 'view-theme']) {
    await win.getByRole('tab', { name: 'Vista' }).click();
    await win.getByTestId(testId).click();
    await win.keyboard.press('Escape');
    await expectNothingChanged(win, testId);
  }

  await win
    .locator('.docx-page')
    .first()
    .click({ button: 'right', position: { x: 400, y: 120 } });
  await expect(win.locator('.docx-contextmenu')).toBeVisible();
  await win.keyboard.press('Escape');
  await expect(win.locator('.docx-contextmenu')).toHaveCount(0);
  await expectNothingChanged(win, 'menú contextual');
});

test('Encabezado y pie que ya existen: entrar, tocar opciones y salir no cambia nada', async ({
  launch,
  workDir,
}) => {
  const path = join(workDir, 'pie.docx');
  writeFileSync(path, readFileSync(join(FIXTURES, 'footer-page-number.docx')));
  const app = await launch({ args: [path] });
  const win = await app.firstWindow();
  await waitForDocument(win);
  await clickDocument(win);
  await win.getByRole('tab', { name: 'Insertar' }).click();
  await win.getByTestId('insert-footer').click();
  await expect(win.getByRole('tab', { name: 'Encabezado y pie de página' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await win.getByRole('button', { name: 'Número de página' }).click();
  await win.keyboard.press('Escape');
  await win.getByTestId('hf-footer-distance').click();
  await win.keyboard.type('9');
  await win.keyboard.press('Escape');
  await win.getByTestId('docx-hf-chrome').getByRole('button', { name: 'Opciones' }).click();
  await win.keyboard.press('Escape');
  await win.keyboard.press('Escape');
  await expect(win.getByTestId('docx-hf-chrome')).toHaveCount(0);
  // El pie original sigue en su sitio y nada cambió.
  await expect(win.locator('.docx-page .docx-hf').first()).toBeVisible();
  await expectNothingChanged(win, 'pie existente');
});

test('Archivo: abrir y cerrar, Imprimir, Guardar como, Abrir y Exportar cancelados', async ({
  app,
  win,
  workDir,
}) => {
  await savedDocument(app, win, join(workDir, 'cancelar.docx'));
  const file = () => win.getByRole('button', { name: 'Archivo' }).click();
  const backstage = win.getByTestId('backstage');

  await file();
  await win.keyboard.press('Escape');
  await expect(backstage).toHaveCount(0);
  await expectNothingChanged(win, 'vista Archivo');

  await file();
  await backstage.getByRole('button', { name: 'Imprimir', exact: true }).first().click();
  await expect(win.getByTestId('print-button')).toBeVisible();
  await win.keyboard.press('Escape');
  await expectNothingChanged(win, 'Imprimir');

  for (const section of ['Guardar como', 'Abrir']) {
    await file();
    await backstage.getByRole('button', { name: section, exact: true }).click();
    await expect(backstage).toHaveCount(0);
    await expectNothingChanged(win, `${section} cancelado`);
  }

  await file();
  await backstage.getByRole('button', { name: 'Exportar', exact: true }).first().click();
  await win.getByTestId('export-pdf').click();
  // Cancelado: termina sin mensaje de error ni de guardado.
  await expect(win.getByTestId('export-pdf')).toBeEnabled();
  await expect(win.getByTestId('export-status')).toHaveCount(0);
  await win.keyboard.press('Escape');
  await expectNothingChanged(win, 'Exportar PDF cancelado');
});

test('Tabla: menús de Bordes y Sombreado cancelados', async ({ app, win, workDir }) => {
  const path = join(workDir, 'tabla.docx');
  await mockDialogs(app, { save: path });
  await clickDocument(win);
  await win.getByRole('tab', { name: 'Insertar' }).click();
  await win.getByTestId('insert-table').click();
  await win.getByRole('gridcell', { name: 'Tabla de 2 × 2' }).click();
  await saveAndRead(app, win, path);
  await expectNothingChanged(win, 'tabla guardada');

  for (const open of [
    () => win.getByTestId('table-borders'),
    () => win.getByRole('button', { name: 'Sombreado' }),
  ]) {
    for (const cancel of ['Escape', 'clic fuera'] as const) {
      await win.getByRole('tab', { name: 'Tabla' }).click();
      await open().click();
      if (cancel === 'Escape') await win.keyboard.press('Escape');
      else await win.getByTestId('status-bar').click();
      await expectNothingChanged(win, `tabla (${cancel})`);
    }
  }
});
