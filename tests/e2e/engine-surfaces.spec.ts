// Superficies flotantes que pinta el motor (popup de vínculo, diálogos, menú contextual, panel de
// navegación) y las propias que las acompañan. La app no carga el preflight de Tailwind, así que
// cualquier control del motor que dependa de él puede salirse de su caja: cada prueba abre una
// superficie, adjunta una captura y comprueba que sus controles quedan dentro.
import type { Locator, Page } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { clickDocument, expect, mod, test, typeInDocument } from './fixtures';
import { FIXTURES, waitForDocument } from './launch';

/** Controles que se salen del rectángulo de la superficie (o la superficie, del viewport). */
async function overflows(surface: Locator): Promise<string[]> {
  return surface.evaluate((root) => {
    const box = root.getBoundingClientRect();
    const problems: string[] = [];
    if (box.left < -1 || box.top < -1 || box.right > innerWidth + 1 || box.bottom > innerHeight + 1)
      problems.push(`la superficie sale del viewport (${Math.round(box.left)},${Math.round(box.top)})`);
    for (const el of root.querySelectorAll('input, textarea, select, button')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.left < box.left - 1 || r.right > box.right + 1) {
        const name = el.getAttribute('aria-label') ?? el.getAttribute('placeholder') ?? el.textContent;
        problems.push(
          `${el.tagName.toLowerCase()} «${name?.trim()}» sale ${Math.round(Math.max(box.left - r.left, r.right - box.right))} px`,
        );
      }
    }
    return problems;
  });
}

async function expectSurfaceFits(win: Page, surface: Locator, name: string): Promise<void> {
  await expect(surface).toBeVisible();
  // Entrada de la cinta y de los popovers: la captura y las medidas, con la animación terminada.
  await win.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );
  const path = test.info().outputPath(`${name}.png`);
  await win.screenshot({ path });
  await test.info().attach(name, { path, contentType: 'image/png' });
  expect(await overflows(surface), name).toEqual([]);
}

test('vínculo: popup de edición y popup del vínculo creado', async ({ win }) => {
  await typeInDocument(win, 'Sitio web');
  await win.keyboard.press(`${mod}+a`);
  await win.getByRole('tab', { name: 'Insertar' }).click();
  await win.getByTestId('insert-link').click();
  const popup = win.locator('.docx-hyperlink-popup');
  await expectSurfaceFits(win, popup, 'vinculo-edicion');

  await win.getByTestId('hyperlink-popup-text').fill('Sitio web');
  await win.getByPlaceholder('https://example.com').fill('https://example.com/una/ruta/bastante/larga');
  await win.getByRole('button', { name: 'Aplicar' }).click();
  await win.locator('.docx-page').getByRole('link', { name: 'Sitio web' }).first().click();
  await expectSurfaceFits(win, popup, 'vinculo-vista');
});

test('diálogos de Párrafo y Configurar página', async ({ win }) => {
  await clickDocument(win);
  await win.getByRole('button', { name: 'Configuración de párrafo' }).click();
  await expectSurfaceFits(win, win.locator('.docx-dialog'), 'parrafo');
  await win.keyboard.press('Escape');
  await expect(win.locator('.docx-dialog')).toHaveCount(0);

  await win.getByRole('tab', { name: 'Disposición' }).click();
  await win.getByTestId('layout-margins').click();
  await win.getByRole('menuitem', { name: /Márgenes personalizados/ }).click();
  await expectSurfaceFits(win, win.locator('.docx-dialog'), 'configurar-pagina');
});

test('imagen: propiedades y texto alternativo', async ({ launch, workDir }) => {
  const path = join(workDir, 'flotante.docx');
  writeFileSync(path, readFileSync(join(FIXTURES, 'float-wrap-comprehensive-test.docx')));
  const app = await launch({ args: [path] });
  const win = await app.firstWindow();
  await waitForDocument(win);
  await win.locator('.docx-page img').first().click();
  await expect(win.getByRole('tab', { name: 'Formato de imagen' })).toHaveAttribute('aria-selected', 'true');

  await win.getByRole('button', { name: 'Tamaño y posición' }).click();
  await expectSurfaceFits(win, win.locator('.docx-dialog'), 'propiedades-imagen');
  await win.keyboard.press('Escape');
  // Esc cierra el diálogo y la imagen sigue seleccionada.
  await expect(win.locator('.docx-dialog')).toHaveCount(0);
  await expect(win.getByRole('group', { name: 'Imagen seleccionada' })).toBeVisible();

  await win.getByRole('button', { name: 'Texto alternativo' }).click();
  await expectSurfaceFits(win, win.getByRole('dialog', { name: 'Texto alternativo' }), 'texto-alternativo');
});

test('menú contextual, Reemplazar y panel de navegación', async ({ win }) => {
  await typeInDocument(win, 'Texto de prueba');
  await win
    .locator('.docx-page')
    .first()
    .click({ button: 'right', position: { x: 150, y: 120 } });
  await expectSurfaceFits(win, win.locator('.docx-contextmenu'), 'menu-contextual');
  await win.keyboard.press('Escape');

  await win.getByTestId('home-replace').click();
  await expectSurfaceFits(win, win.getByTestId('replace-dialog'), 'reemplazar');
  await win.keyboard.press('Escape');

  await win.getByRole('tab', { name: 'Vista' }).click();
  await win.getByTestId('show-navigation').click();
  await expectSurfaceFits(win, win.locator('.docx-nav__panel-shell'), 'navegacion');
});

test('tema oscuro: popup de vínculo y diálogo de Párrafo', async ({ win }) => {
  await win.getByRole('tab', { name: 'Vista' }).click();
  await win.getByTestId('view-theme').click();
  await win.getByRole('menuitemradio', { name: 'Oscuro' }).click();
  await expect(win.locator('html')).toHaveAttribute('data-theme', 'dark');

  await clickDocument(win);
  await win.keyboard.press(`${mod}+k`);
  await expectSurfaceFits(win, win.locator('.docx-hyperlink-popup'), 'vinculo-oscuro');
  await win.keyboard.press('Escape');

  await win.getByRole('tab', { name: 'Inicio' }).click();
  await win.getByRole('button', { name: 'Configuración de párrafo' }).click();
  await expectSurfaceFits(win, win.locator('.docx-dialog'), 'parrafo-oscuro');
});

/** Abre "Opciones" de la barra `bar` y devuelve si el menú queda encima (true) o debajo. */
async function optionsOpenUpward(win: Page, bar: Locator, name: string): Promise<boolean> {
  await bar.getByRole('button', { name: 'Opciones' }).click();
  const menu = bar.locator('.docx-hf-chrome__options-menu');
  await expectSurfaceFits(win, menu, name);
  const [barBox, menuBox] = await Promise.all([bar.boundingBox(), menu.boundingBox()]);
  return menuBox!.y + menuBox!.height <= barBox!.y + 1;
}

test('Opciones de pie y nota al pie se abren hacia arriba; las del encabezado, hacia abajo', async ({
  win,
}) => {
  const chrome = win.getByTestId('docx-hf-chrome');
  await win.getByRole('tab', { name: 'Insertar' }).click();
  await win.getByTestId('insert-footer').click();
  expect(await optionsOpenUpward(win, chrome, 'opciones-pie')).toBe(true);
  await win.getByTestId('hf-close').click();

  await win.getByRole('tab', { name: 'Insertar' }).click();
  await win.getByTestId('insert-header').click();
  expect(await optionsOpenUpward(win, chrome, 'opciones-encabezado')).toBe(false);
  await win.getByTestId('hf-close').click();

  await clickDocument(win);
  await win.getByRole('tab', { name: 'Referencias' }).click();
  await win.getByTestId('insert-footnote').click();
  expect(await optionsOpenUpward(win, win.getByTestId('docx-notes-banner'), 'opciones-nota')).toBe(true);
});
