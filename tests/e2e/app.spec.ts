import { expect, test } from '@playwright/test';
import { closeAll, launchApp } from './launch';

test('abre Documento1 en blanco con la cinta, el motor y la barra de estado', async () => {
  const app = await launchApp();
  try {
    const win = await app.firstWindow();
    await expect(win.getByRole('tab', { name: 'Inicio' })).toHaveAttribute('aria-selected', 'true');
    await expect(win.locator('.docx-page').first()).toBeVisible({ timeout: 30_000 });
    await expect(win.getByTestId('status-page')).toHaveText(/Página 1 de 1|Page 1 of 1/);
    expect(await win.evaluate(() => window.location.protocol)).toBe('app:');
    expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.getTitle())).toMatch(
      /^Document[o]?1 - OpenWord$/,
    );
  } finally {
    await closeAll(app);
  }
});

test('el renderer no tiene acceso a Node y solo ve window.openword', async () => {
  const app = await launchApp();
  try {
    const win = await app.firstWindow();
    const exposure = await win.evaluate(() => ({
      require: typeof (globalThis as { require?: unknown }).require,
      process: typeof (globalThis as { process?: unknown }).process,
      api: Object.keys(window.openword),
    }));
    expect(exposure).toEqual({
      require: 'undefined',
      process: 'undefined',
      api: ['app', 'doc', 'file', 'fonts'],
    });
  } finally {
    await closeAll(app);
  }
});

test('escribir con teclado real llega al documento (incluida la ñ)', async () => {
  const app = await launchApp();
  try {
    const win = await app.firstWindow();
    const page = win.locator('.docx-page').first();
    await expect(page).toBeVisible({ timeout: 30_000 });
    await page.click({ position: { x: 200, y: 150 } });
    await win.keyboard.type('Año nuevo');
    await expect(win.locator('.docx-page').first()).toContainText('Año nuevo');
  } finally {
    await closeAll(app);
  }
});

test('la CSP bloquea scripts en línea y la red externa', async () => {
  const app = await launchApp();
  try {
    const win = await app.firstWindow();
    await expect(win.locator('.docx-page').first()).toBeVisible({ timeout: 30_000 });
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
  } finally {
    await closeAll(app);
  }
});
