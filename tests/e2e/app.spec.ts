import { windowTitles } from './launch';
import { clickDocument, expect, test } from './fixtures';

test(
  'abre Documento1 en blanco con la cinta, el motor y la barra de estado',
  { tag: '@smoke' },
  async ({ app, win }) => {
    await expect(win.getByRole('tab', { name: 'Inicio' })).toHaveAttribute('aria-selected', 'true');
    await expect(win.locator('.docx-page').first()).toBeVisible();
    await expect(win.getByTestId('status-page')).toHaveText(/Página 1 de 1|Page 1 of 1/);
    expect(await win.evaluate(() => window.location.protocol)).toBe('app:');
    await expect.poll(() => windowTitles(app)).toEqual([expect.stringMatching(/^Document[o]?1 - OpenWord$/)]);
  },
);

test('el renderer no tiene acceso a Node y solo ve window.openword', { tag: '@smoke' }, async ({ win }) => {
  const exposure = await win.evaluate(() => ({
    require: typeof (globalThis as { require?: unknown }).require,
    process: typeof (globalThis as { process?: unknown }).process,
    api: Object.keys(window.openword),
  }));
  expect(exposure).toEqual({
    require: 'undefined',
    process: 'undefined',
    api: [
      'app',
      'window',
      'doc',
      'file',
      'clipboard',
      'menu',
      'print',
      'settings',
      'spell',
      'recovery',
      'fonts',
    ],
  });
});

test('escribir con teclado real llega al documento (incluida la ñ)', { tag: '@smoke' }, async ({ win }) => {
  await clickDocument(win, { x: 200, y: 150 });
  await win.keyboard.type('Año nuevo');
  await expect(win.locator('.docx-page').first()).toContainText('Año nuevo');
});

test('la CSP bloquea scripts en línea y la red externa', { tag: '@smoke' }, async ({ win }) => {
  const result = await win.evaluate(async () => {
    let inlineRan = false;
    (window as { __inline?: () => void }).__inline = () => (inlineRan = true);
    const s = document.createElement('script');
    s.textContent = 'window.__inline()';
    document.body.appendChild(s);
    let fetchBlocked = false;
    try {
      await fetch('https://example.com/');
    } catch {
      fetchBlocked = true;
    }
    return { inlineRan, fetchBlocked };
  });
  expect(result).toEqual({ inlineRan: false, fetchBlocked: true });
});
