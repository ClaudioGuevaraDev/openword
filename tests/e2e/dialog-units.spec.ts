// Párrafo y Configurar página muestran y aplican las medidas en la unidad de la app (cm o
// pulgadas, según la región del sistema), no en las pulgadas fijas del motor. La prueba lee la
// unidad que muestra el diálogo, así vale en cualquier máquina.
import type { Locator } from '@playwright/test';
import { join } from 'node:path';
import { clickDocument, expect, saveAndRead, test as base } from './fixtures';
import { mockDialogs } from './launch';

const test = base.extend<{ out: string }>({
  out: async ({ app, workDir }, use) => {
    const out = join(workDir, 'unidades.docx');
    await mockDialogs(app, { save: out });
    await use(out);
  },
});

/** Twips por unidad de la fila de diálogo `row` (lee su sufijo: "cm" o "pulg."). */
async function twipsPerUnit(row: Locator): Promise<number> {
  const unit = (await row.locator('.docx-dialog__unit').textContent())?.trim();
  expect(['cm', 'pulg.']).toContain(unit);
  return unit === 'cm' ? 1440 / 2.54 : 1440;
}

test('Párrafo: sangría y tabulación en la unidad de la app', async ({ app, win, out }) => {
  await clickDocument(win);
  await win.keyboard.type('Texto con sangría');
  await win.getByRole('button', { name: 'Configuración de párrafo' }).click();
  const dialog = win.locator('.docx-dialog');
  const indent = dialog.locator('[data-docx-field="indentLeft"]');
  const perUnit = await twipsPerUnit(indent);

  await indent.getByRole('spinbutton', { name: 'Antes del texto' }).fill('1');
  await dialog.getByRole('combobox', { name: 'Especial' }).selectOption('firstLine');
  const by = dialog.locator('[data-docx-field="specialBy"]');
  expect(await twipsPerUnit(by)).toBe(perUnit);
  await by.getByRole('spinbutton', { name: 'En' }).fill('0.5');
  await dialog.getByRole('spinbutton', { name: 'Posición', exact: true }).fill('2');
  await dialog.getByRole('button', { name: 'Fijar' }).click();
  // La tabulación nueva aparece en la lista con su posición en la misma unidad.
  await expect(dialog.getByRole('button', { name: /^Eliminar la tabulación en 2/ })).toBeVisible();
  await dialog.getByRole('button', { name: 'Aceptar' }).click();
  await expect(dialog).toHaveCount(0);

  const xml = (await saveAndRead(app, win, out))['word/document.xml']!;
  expect(xml).toContain(`w:left="${Math.round(perUnit)}"`);
  expect(xml).toContain(`w:firstLine="${Math.round(0.5 * perUnit)}"`);
  expect(xml).toContain(`w:pos="${Math.round(2 * perUnit)}"`);
});

test('Configurar página: márgenes y tamaños de papel en la unidad de la app', async ({ app, win, out }) => {
  await win.getByRole('tab', { name: 'Disposición' }).click();
  await win.getByTestId('layout-margins').click();
  await win.getByRole('menuitem', { name: /Márgenes personalizados/ }).click();
  const dialog = win.locator('.docx-dialog');
  const top = dialog.locator('[data-docx-field="marginTop"]');
  const perUnit = await twipsPerUnit(top);

  // Los tamaños del selector, con las medidas en esa unidad (A4 = 21 × 29,7 cm).
  const a4 = perUnit === 1440 ? 'A4 (8,27" × 11,69")' : 'A4 (21 × 29,7 cm)';
  await expect(
    dialog.getByRole('combobox', { name: 'Tamaño' }).locator('option', { hasText: a4 }),
  ).toHaveCount(1);

  await top.getByRole('spinbutton', { name: 'Superior' }).fill('3');
  await dialog.getByRole('button', { name: 'Aplicar' }).click();
  await expect(dialog).toHaveCount(0);

  const xml = (await saveAndRead(app, win, out))['word/document.xml']!;
  expect(xml).toContain(`w:top="${Math.round(3 * perUnit)}"`);
});
