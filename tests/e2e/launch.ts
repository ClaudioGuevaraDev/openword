import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

export const FIXTURES = resolve(__dirname, '../fixtures');
export const MAIN_ENTRY = resolve(__dirname, '../../out/main/index.js');

export function sandboxArgs(): string[] {
  // Ubuntu restringe el sandbox SUID de Chromium fuera de los paquetes instalados.
  return process.platform === 'linux' ? ['--no-sandbox'] : [];
}

/** Arranca el build de producción (out/) con una carpeta de datos propia. */
export async function launchApp(
  options: { args?: string[]; userData?: string; env?: Record<string, string> } = {},
): Promise<ElectronApplication & { userData: string }> {
  const userData = options.userData ?? mkdtempSync(join(tmpdir(), 'ow-e2e-'));
  // Interfaz en español en cualquier SO (los runners de Windows y macOS están en inglés),
  // salvo que la prueba ya haya guardado sus propias opciones en esa carpeta.
  const settings = join(userData, 'settings.json');
  if (!existsSync(settings)) writeFileSync(settings, JSON.stringify({ uiLanguage: 'es' }));
  const app = await electron.launch({
    args: [MAIN_ENTRY, ...(options.args ?? []), ...sandboxArgs()],
    // Sin LibreOffice salvo que la prueba lo pida (resultado igual en cualquier máquina).
    env: { ...process.env, OPENWORD_SOFFICE: 'none', OPENWORD_USER_DATA: userData, ...options.env },
  });
  return Object.assign(app, { userData });
}

export async function waitForDocument(win: Page): Promise<void> {
  await win.locator('.docx-page').first().waitFor({ state: 'visible', timeout: 30_000 });
}

export function windowTitles(app: ElectronApplication): Promise<string[]> {
  return app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .map((w) => w.getTitle())
      .sort(),
  );
}

/** Respuestas simuladas para los diálogos nativos (no se pueden automatizar). */
export async function mockDialogs(
  app: ElectronApplication,
  responses: { save?: string | null; open?: string[] | null; messageBox?: number[] },
): Promise<void> {
  await app.evaluate(({ dialog }, r) => {
    const g = globalThis as unknown as { __owMessages: string[] };
    g.__owMessages = [];
    const box = [...(r.messageBox ?? [])];
    dialog.showSaveDialog = (async () =>
      r.save
        ? { canceled: false, filePath: r.save }
        : { canceled: true, filePath: '' }) as typeof dialog.showSaveDialog;
    dialog.showOpenDialog = (async () =>
      r.open
        ? { canceled: false, filePaths: r.open }
        : { canceled: true, filePaths: [] }) as typeof dialog.showOpenDialog;
    dialog.showMessageBox = (async (...args: unknown[]) => {
      const options = (args.length > 1 ? args[1] : args[0]) as { message: string };
      g.__owMessages.push(options.message);
      return { response: box.shift() ?? 0, checkboxChecked: false };
    }) as typeof dialog.showMessageBox;
  }, responses);
}

export function shownMessages(app: ElectronApplication): Promise<string[]> {
  return app.evaluate(() => (globalThis as unknown as { __owMessages: string[] }).__owMessages ?? []);
}

/** Cierra sin preguntar (destruye las ventanas) y termina la app si sigue viva. */
export async function closeAll(app: ElectronApplication): Promise<void> {
  try {
    const proc = app.process();
    if (proc.exitCode !== null || proc.signalCode !== null) return;
  } catch {
    return; // Playwright ya liberó la app
  }
  try {
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().forEach((w) => w.destroy()));
  } catch {
    // La app ya terminó.
  }
  const closed = await Promise.race([
    app.close().then(
      () => true,
      () => true,
    ),
    new Promise<false>((resolve) => setTimeout(() => resolve(false), 10_000)),
  ]);
  if (!closed) {
    console.warn('[e2e] la app no terminó en 10 s tras cerrar sus ventanas: se mata el proceso');
    app.process().kill('SIGKILL');
  }
}
