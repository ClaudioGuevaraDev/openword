// Auditoría automática de accesibilidad (axe-core, WCAG 2.2 A/AA) de la interfaz propia de
// OpenWord. Se excluye lo que pinta el motor (páginas y reglas): no es interfaz propia.
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function audit(win: Page, include: string) {
  const { violations } = await new AxeBuilder({ page: win })
    // Electron no permite abrir pestañas nuevas, que es como axe junta los resultados de los
    // iframes; el modo legacy audita en la misma página (la interfaz no tiene iframes).
    .setLegacyMode()
    .include(include)
    .exclude('.docx-page')
    // Las reglas y sus marcadores de sangría también son del motor.
    .exclude('[data-testid="ruler"]')
    // Muestras «AaBbCc» de la galería: reproducen el color del estilo del documento (como en
    // Word) y son decorativas; el nombre del estilo, con contraste suficiente, da la información.
    .exclude('[data-testid="style-gallery"] [aria-hidden="true"]')
    .withTags(WCAG)
    .analyze();
  // Mensaje legible si falla: regla, impacto y los primeros nodos afectados.
  return violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.nodes
        .slice(0, 3)
        .map((n) => n.target.join(' '))
        .join(', ')}`,
  );
}

test.describe('accesibilidad (axe)', { tag: '@a11y' }, () => {
  test('cinta, barra de título y barra de estado', async ({ win }) => {
    for (const tab of ['Inicio', 'Insertar', 'Disposición', 'Referencias', 'Vista']) {
      await win.getByRole('tab', { name: tab }).click();
      expect(await audit(win, '[data-testid="app"]'), `pestaña ${tab}`).toEqual([]);
    }
  });

  test('tema oscuro', async ({ win }) => {
    await win.getByRole('tab', { name: 'Vista' }).click();
    await win.getByTestId('view-theme').click();
    await win.getByRole('menuitemradio', { name: 'Oscuro' }).click();
    await expect(win.locator('html')).toHaveAttribute('data-theme', 'dark');
    for (const tab of ['Inicio', 'Vista']) {
      await win.getByRole('tab', { name: tab }).click();
      expect(await audit(win, '[data-testid="app"]'), `pestaña ${tab} (oscuro)`).toEqual([]);
    }
  });

  test('vista Archivo (Backstage) y sus secciones', async ({ win }) => {
    await win.getByRole('button', { name: 'Archivo' }).click();
    const backstage = win.getByTestId('backstage');
    await expect(backstage).toBeVisible();
    expect(await audit(win, '[data-testid="backstage"]'), 'Información').toEqual([]);
    await backstage.getByRole('button', { name: 'Opciones' }).click();
    await expect(win.getByTestId('options')).toBeVisible();
    expect(await audit(win, '[data-testid="backstage"]'), 'Opciones').toEqual([]);
  });

  test('menús y ventanas emergentes abiertos', async ({ win }) => {
    await win.getByRole('tab', { name: 'Disposición' }).click();
    await win.getByTestId('layout-margins').click();
    await expect(win.getByRole('menu')).toBeVisible();
    expect(await audit(win, '[role="menu"]'), 'menú Márgenes').toEqual([]);
    await win.keyboard.press('Escape');

    await win.getByRole('tab', { name: 'Insertar' }).click();
    await win.getByTestId('insert-table').click();
    await expect(win.getByRole('grid')).toBeVisible();
    expect(await audit(win, '[role="dialog"]:has([role="grid"])'), 'cuadrícula de tabla').toEqual([]);
  });
});
