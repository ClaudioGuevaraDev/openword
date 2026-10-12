import { join } from 'node:path';
import { FIXTURES, closeAll, mockDialogs, waitForDocument } from './launch';
import { clickDocument, expect, mod, saveAndRead, test } from './fixtures';

const replaceKey = process.platform === 'darwin' ? 'Control+h' : `${mod}+h`;

test.describe('con un documento de ejemplo', () => {
  test.use({ appOptions: { args: [join(FIXTURES, 'comprehensive-word-element-test.docx')] } });

  test('Ctrl+F abre el panel de navegación en Buscar; muestra los títulos del documento', async ({ win }) => {
    await clickDocument(win, { x: 300, y: 300 });
    await win.keyboard.press(`${mod}+f`);
    await expect(win.getByRole('tab', { name: 'Buscar' })).toHaveAttribute('aria-selected', 'true');
    await win.getByRole('tab', { name: 'Títulos' }).click();
    await expect(win.getByText('2. Heading Levels').first()).toBeVisible();
  });
});

test('Ctrl+H: Reemplazar todo cuenta, reemplaza y Esc cierra el cuadro', async ({ app, win, workDir }) => {
  const out = join(workDir, 'r.docx');
  await mockDialogs(app, { save: out });
  await clickDocument(win);
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
  const pkg = await saveAndRead(app, win, out);
  expect(pkg['word/document.xml']).toContain('felino perro felino pájaro Gato');
});

test('Esc desde el documento cierra Reemplazar, quita los resaltados y deja el foco en el documento', async ({
  win,
}) => {
  await clickDocument(win);
  await win.keyboard.type('uno dos uno');
  await win.keyboard.press(replaceKey);
  await win.getByTestId('replace-find').fill('uno');
  await win.getByTestId('find-next').click();
  await expect(win.getByTestId('replace-status')).toHaveText(/2/);
  await clickDocument(win);
  await win.keyboard.press('Escape');
  await expect(win.getByTestId('replace-dialog')).toHaveCount(0);
  // Con el foco de vuelta en el documento, lo escrito llega a la página.
  await win.keyboard.type(' fin');
  await expect(win.locator('.docx-page').first()).toContainText('fin');
});

test('zoom: 100 %, ancho de página y una página', async ({ win }) => {
  await win.getByRole('tab', { name: 'Vista' }).click();
  const percent = win.getByTestId('zoom-percent');
  await win.getByTestId('zoom-100').click();
  await expect(percent).toHaveText('100 %');
  await win.getByTestId('zoom-one-page').click();
  await expect(percent).not.toHaveText('100 %');
  const onePage = Number((await percent.textContent())!.replace(/\D/g, ''));
  expect(onePage).toBeLessThan(100);
  // La página completa queda visible dentro del área del documento.
  await expect
    .poll(() =>
      win.evaluate(() => {
        const page = document.querySelector('.docx-page')!.getBoundingClientRect();
        const view = document.querySelector('.docx-editor__scroll-container')!.getBoundingClientRect();
        return page.height <= view.height && page.width <= view.width;
      }),
    )
    .toBe(true);
  await win.getByTestId('zoom-page-width').click();
  await expect(percent).not.toHaveText(`${onePage} %`);
});

test('la regla se oculta y la preferencia se recuerda al volver a abrir', async ({ app, win, launch }) => {
  await expect(win.getByTestId('ruler')).toBeVisible();
  await win.getByRole('tab', { name: 'Vista' }).click();
  await win.getByRole('checkbox', { name: 'Regla' }).uncheck();
  await expect(win.getByTestId('ruler')).toHaveCount(0);
  await closeAll(app);
  const again = await launch({ userData: app.userData });
  const win2 = await again.firstWindow();
  await waitForDocument(win2);
  await expect(win2.getByTestId('ruler')).toHaveCount(0);
});

test('modo oscuro: Vista › Modo › Oscuro activa el tema de la app y del motor', async ({ win }) => {
  await win.getByRole('tab', { name: 'Vista' }).click();
  await win.getByTestId('view-theme').click();
  await win.getByRole('menuitemradio', { name: 'Oscuro' }).click();
  await expect(win.getByTestId('app')).toHaveClass(/\bdark\b/);
  await expect(win.locator('html')).toHaveAttribute('data-theme', 'dark');
  await win.getByTestId('view-theme').click();
  await win.getByRole('menuitemradio', { name: 'Claro' }).click();
  await expect(win.getByTestId('app')).not.toHaveClass(/\bdark\b/);
});
