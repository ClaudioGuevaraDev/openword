import type { Page } from '@playwright/test';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import {
  FIXTURES,
  MAIN_ENTRY,
  mockDialogs,
  sandboxArgs,
  shownMessages,
  waitForDocument,
  windowTitles,
} from './launch';
import { clickDocument, documentWindow, expect, mod, readPackage, test } from './fixtures';

/** Copia un documento de prueba a `dir` (las pruebas lo modifican). */
function copyFixture(name: string, dir: string): string {
  const target = join(dir, name);
  copyFileSync(join(FIXTURES, name), target);
  return target;
}

async function typeAtStart(win: Page, text: string): Promise<void> {
  await clickDocument(win);
  await win.keyboard.press(`${mod}+Home`);
  await win.keyboard.type(text);
}

function documentXml(path: string): string {
  return readPackage(path)['word/document.xml']!;
}

test('abre un .docx pasado por línea de comandos, edita y guarda con Ctrl+S', async ({ launch, workDir }) => {
  const path = copyFixture('footer-page-number.docx', workDir);
  const app = await launch({ args: [path] });
  const win = await documentWindow(app);
  await expect.poll(() => windowTitles(app)).toEqual(['footer-page-number.docx - OpenWord']);

  await typeAtStart(win, 'Línea agregada por OpenWord ');
  await expect.poll(() => windowTitles(app)).toEqual(['footer-page-number.docx • - OpenWord']);

  await win.keyboard.press(`${mod}+s`);
  await expect.poll(() => windowTitles(app)).toEqual(['footer-page-number.docx - OpenWord']);
  expect(documentXml(path)).toContain('Línea agregada por OpenWord');

  // El archivo guardado se vuelve a abrir bien y conserva el texto.
  const w2 = await documentWindow(await launch({ args: [path] }));
  await expect(w2.locator('.docx-page').first()).toContainText('Línea agregada por OpenWord');
});

test('documento nuevo: Guardar abre "Guardar como" y agrega la extensión', async ({ app, win, workDir }) => {
  await mockDialogs(app, { save: join(workDir, 'Carta al cliente') });
  await typeAtStart(win, 'Estimado cliente');
  await win.keyboard.press(`${mod}+s`);
  await expect.poll(() => windowTitles(app)).toEqual(['Carta al cliente.docx - OpenWord']);
  expect(documentXml(join(workDir, 'Carta al cliente.docx'))).toContain('Estimado cliente');
});

test('el documento en blanco usa el papel de la región (A4 o Carta)', async ({ app, win, workDir }) => {
  await mockDialogs(app, { save: join(workDir, 'papel.docx') });
  await typeAtStart(win, 'x');
  await win.keyboard.press(`${mod}+s`);
  await expect.poll(() => existsSync(join(workDir, 'papel.docx'))).toBe(true);
  const paper = await win.evaluate(() => window.openword.app.info().then((i) => i.paper));
  expect(documentXml(join(workDir, 'papel.docx'))).toContain(paper === 'a4' ? 'w:w="11906"' : 'w:w="12240"');
});

test('cerrar con cambios: Cancelar mantiene la ventana, No guardar la cierra sin escribir', async ({
  launch,
  workDir,
}) => {
  test.skip(process.platform === 'darwin', 'en macOS la app sigue viva sin ventanas');
  const path = copyFixture('footer-page-number.docx', workDir);
  const original = readFileSync(path);
  const app = await launch({ args: [path] });
  const win = await documentWindow(app);
  await typeAtStart(win, 'cambio sin guardar ');
  await expect.poll(() => windowTitles(app)).toEqual(['footer-page-number.docx • - OpenWord']);

  await mockDialogs(app, { messageBox: [2] }); // Cancelar
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.close());
  await expect
    .poll(() => shownMessages(app))
    .toEqual(['¿Desea guardar los cambios en «footer-page-number.docx»?']);
  expect(await windowTitles(app)).toHaveLength(1);

  await mockDialogs(app, { messageBox: [1] }); // No guardar
  // En Win/Linux la app termina al cerrar la última ventana (la evaluación puede cortarse).
  await Promise.all([
    app.waitForEvent('close'),
    app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.close()).catch(() => undefined),
  ]);
  expect(readFileSync(path).equals(original)).toBe(true);
});

test('cerrar con cambios y elegir Guardar: guarda y luego cierra', async ({ app, win, workDir }) => {
  test.skip(process.platform === 'darwin', 'en macOS la app sigue viva sin ventanas');
  await typeAtStart(win, 'Guardado al cerrar');
  await expect.poll(() => windowTitles(app)).toEqual([expect.stringContaining('•')]);
  await mockDialogs(app, { messageBox: [0], save: join(workDir, 'al-cerrar.docx') });
  await Promise.all([
    app.waitForEvent('close'),
    app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.close()).catch(() => undefined),
  ]);
  expect(documentXml(join(workDir, 'al-cerrar.docx'))).toContain('Guardado al cerrar');
});

test('abrir desde un Documento1 sin tocar reutiliza la ventana; abrir lo ya abierto solo lo enfoca', async ({
  app,
  win,
  workDir,
}) => {
  const path = copyFixture('issue-319-sections.docx', workDir);
  await expect.poll(() => windowTitles(app)).toHaveLength(1);

  await mockDialogs(app, { open: [path] });
  await win.evaluate(() => window.openword.file.openDialog());
  await expect.poll(() => windowTitles(app)).toEqual(['issue-319-sections.docx - OpenWord']);
  await waitForDocument(win);

  await win.evaluate(() => window.openword.file.openDialog());
  expect(await windowTitles(app)).toEqual(['issue-319-sections.docx - OpenWord']);

  // Otro documento: ahora sí abre una ventana nueva.
  const other = copyFixture('footer-page-number.docx', workDir);
  await mockDialogs(app, { open: [other] });
  const newWindow = app.waitForEvent('window');
  await win.evaluate(() => window.openword.file.openDialog());
  await waitForDocument(await newWindow);
  await expect
    .poll(() => windowTitles(app))
    .toEqual(['footer-page-number.docx - OpenWord', 'issue-319-sections.docx - OpenWord']);

  // Y aparece en Recientes.
  await expect
    .poll(() => win.evaluate(() => window.openword.file.recent().then((r) => r.map((f) => f.name))))
    .toEqual(['footer-page-number.docx', 'issue-319-sections.docx']);
});

test('una plantilla .dotx se abre como documento nuevo y se guarda como .docx válido', async ({
  launch,
  workDir,
}) => {
  const template = join(workDir, 'membrete.dotx');
  const entries = unzipSync(new Uint8Array(readFileSync(join(FIXTURES, 'footer-page-number.docx'))));
  entries['[Content_Types].xml'] = strToU8(
    strFromU8(entries['[Content_Types].xml']!).replace(
      'wordprocessingml.document.main+xml',
      'wordprocessingml.template.main+xml',
    ),
  );
  writeFileSync(template, zipSync(entries));

  const app = await launch({ args: [template] });
  const win = await documentWindow(app);
  await expect(win.getByTestId('notice-template')).toBeVisible();
  await expect.poll(() => windowTitles(app)).toEqual([expect.stringMatching(/^Document[o]?\d - OpenWord$/)]);

  await mockDialogs(app, { save: join(workDir, 'carta.docx') });
  await win.keyboard.press(`${mod}+s`);
  await expect.poll(() => windowTitles(app)).toEqual(['carta.docx - OpenWord']);
  const types = readPackage(join(workDir, 'carta.docx'))['[Content_Types].xml'];
  expect(types).toContain('wordprocessingml.document.main+xml');
  expect(types).not.toContain('template.main+xml');
  expect(readFileSync(template).length).toBeGreaterThan(0); // la plantilla no se toca
});

test('formatos que requieren LibreOffice o no reconocidos: avisa en lugar de fallar', async ({
  app,
  win,
  workDir,
}) => {
  const rtf = join(workDir, 'viejo.doc');
  writeFileSync(rtf, '{\\rtf1\\ansi Hola}'); // RTF con extensión .doc
  const junk = join(workDir, 'roto.docx');
  writeFileSync(junk, 'esto no es un documento');
  await mockDialogs(app, { open: [rtf, junk], messageBox: [1, 0] }); // 1 = Cancelar (no abrir la descarga)
  await win.evaluate(() => window.openword.file.openDialog());
  await expect
    .poll(() => shownMessages(app))
    .toEqual([
      'Para abrir «viejo.doc» se necesita LibreOffice.',
      'No se reconoce el formato de «roto.docx».',
    ]);
  expect(await windowTitles(app)).toHaveLength(1);
});

test('instancia única: un segundo arranque con un archivo lo abre en la app que ya corre', async ({
  app,
  workDir,
}) => {
  const path = copyFixture('footer-page-number.docx', workDir);
  // Mismo entorno que launchApp: sin LibreOffice y con la carpeta de datos de la primera instancia.
  const second = spawn(
    (await app.evaluate(() => process.execPath)) as string,
    [MAIN_ENTRY, path, ...sandboxArgs()],
    {
      env: { ...process.env, OPENWORD_SOFFICE: 'none', OPENWORD_USER_DATA: app.userData },
      stdio: 'ignore',
    },
  );
  // Si no le pasa el archivo a la primera y termina, se mata para no dejar un proceso colgado.
  const exitCode = await new Promise<number | null>((resolve, reject) => {
    const timer = setTimeout(() => {
      second.kill('SIGKILL');
      reject(new Error('el segundo arranque no terminó en 20 s'));
    }, 20_000);
    second.on('exit', (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });
  expect(exitCode).toBe(0);
  await expect.poll(() => windowTitles(app)).toEqual(['footer-page-number.docx - OpenWord']);
});
