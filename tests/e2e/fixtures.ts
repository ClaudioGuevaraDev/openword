// Fixtures de Playwright para OpenWord: cada prueba recibe la app ya arrancada (`app`) y su
// primera ventana con el documento pintado (`win`). Al terminar, la app se cierra, su carpeta
// de datos se borra y, si la prueba falló, se adjunta una captura de cada ventana. Una
// excepción de JavaScript en cualquier ventana hace fallar la prueba.
import { expect, test as base, type ElectronApplication, type Page, type TestInfo } from '@playwright/test';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { strFromU8, unzipSync } from 'fflate';
import { closeAll, launchApp, waitForDocument, windowTitles } from './launch';

export { expect };

export type App = Awaited<ReturnType<typeof launchApp>>;

export interface LaunchOptions {
  readonly args?: string[];
  readonly userData?: string;
  readonly env?: Record<string, string>;
}

/** Tecla modificadora de los atajos: ⌘ en macOS, Ctrl en Windows y Linux. */
export const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

interface Fixtures {
  /** Opciones del arranque de `app` (con `test.use({ appOptions })`). */
  appOptions: LaunchOptions;
  /** Errores de página esperados por la prueba (no la hacen fallar). */
  allowedPageErrors: readonly RegExp[];
  /** Arranca una instancia más (p. ej. para reabrir con la misma carpeta de datos). */
  launch: (options?: LaunchOptions) => Promise<App>;
  /** La app arrancada con `appOptions`. */
  app: App;
  /** Primera ventana de `app`, con el documento ya pintado. */
  win: Page;
  /** Carpeta vacía para los archivos de la prueba (dentro de test-results). */
  workDir: string;
}

export const test = base.extend<Fixtures>({
  appOptions: [{}, { option: true }],
  allowedPageErrors: [[], { option: true }],

  launch: async ({ allowedPageErrors }, use, testInfo) => {
    const apps: { app: App; ownsUserData: boolean }[] = [];
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    const watch = (page: Page) => {
      page.on('pageerror', (error) => {
        if (!allowedPageErrors.some((re) => re.test(error.message)))
          pageErrors.push(error.stack ?? error.message);
      });
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
    };

    await use(async (options = {}) => {
      const app = await launchApp(options);
      // La carpeta de datos temporal es de la prueba solo si la creó launchApp.
      apps.push({ app, ownsUserData: !options.userData });
      app.windows().forEach(watch);
      app.on('window', watch);
      return app;
    });

    const failed = testInfo.status !== testInfo.expectedStatus;
    for (const [i, { app }] of apps.entries()) {
      if (failed) await attachScreenshots(app, i, testInfo);
      await closeAll(app);
    }
    // Se borra al final: una instancia posterior puede reutilizar la carpeta de una anterior.
    for (const { app, ownsUserData } of apps)
      if (ownsUserData) rmSync(app.userData, { recursive: true, force: true, maxRetries: 3 });
    if (consoleErrors.length > 0)
      await testInfo.attach('errores de consola', {
        body: consoleErrors.join('\n'),
        contentType: 'text/plain',
      });
    expect(pageErrors, 'excepciones de JavaScript en la app').toEqual([]);
  },

  app: async ({ launch, appOptions }, use) => {
    await use(await launch(appOptions));
  },

  win: async ({ app }, use) => {
    await use(await documentWindow(app));
  },

  // Playwright exige desestructurar el primer argumento aunque no use otros fixtures.
  workDir: async ({}, use, testInfo) => {
    const dir = testInfo.outputPath('work');
    mkdirSync(dir, { recursive: true });
    await use(dir);
  },
});

async function attachScreenshots(app: ElectronApplication, index: number, testInfo: TestInfo): Promise<void> {
  for (const [w, page] of app.windows().entries()) {
    const body = await page.screenshot({ timeout: 5_000 }).catch(() => null);
    if (body)
      await testInfo.attach(`app${index + 1}-ventana${w + 1}.png`, { body, contentType: 'image/png' });
  }
}

/** Primera ventana de una instancia, con el documento ya pintado. */
export async function documentWindow(app: ElectronApplication): Promise<Page> {
  const win = await app.firstWindow();
  await waitForDocument(win);
  return win;
}

/** Clic en la primera página (por defecto, cerca del inicio del texto). */
export async function clickDocument(win: Page, position = { x: 150, y: 120 }): Promise<void> {
  await win.locator('.docx-page').first().click({ position });
}

/** Clic en el documento y escribe con el teclado real. */
export async function typeInDocument(win: Page, text: string): Promise<void> {
  await clickDocument(win);
  await win.keyboard.type(text);
}

/** Espera a que el título de alguna ventana sea `title` (el nombre se actualiza en main). */
export async function expectWindowTitle(app: ElectronApplication, title: string): Promise<void> {
  await expect.poll(() => windowTitles(app)).toContain(title);
}

/** Partes de texto de un .docx guardado (word/document.xml, word/styles.xml…). */
export function readPackage(path: string): Record<string, string> {
  const parts = unzipSync(new Uint8Array(readFileSync(path)));
  return Object.fromEntries(Object.entries(parts).map(([name, data]) => [name, strFromU8(data)]));
}

/** Guarda con Ctrl+S (el diálogo ya simulado con `mockDialogs`) y devuelve el paquete. */
export async function saveAndRead(
  app: ElectronApplication,
  win: Page,
  path: string,
): Promise<Record<string, string>> {
  await win.keyboard.press(`${mod}+s`);
  await expectWindowTitle(app, `${path.split(/[\\/]/).pop()} - OpenWord`);
  return readPackage(path);
}
