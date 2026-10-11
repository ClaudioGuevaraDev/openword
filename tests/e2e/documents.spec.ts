import { expect, test, type Page } from '@playwright/test';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import {
  FIXTURES,
  MAIN_ENTRY,
  closeAll,
  launchApp,
  mockDialogs,
  sandboxArgs,
  shownMessages,
  waitForDocument,
  windowTitles,
} from './launch';

const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

function workDir(): string {
  return mkdtempSync(join(tmpdir(), 'ow-docs-'));
}

/** Copia un documento de prueba a una carpeta temporal (las pruebas lo modifican). */
function copyFixture(name: string, dir = workDir()): string {
  const target = join(dir, name);
  copyFileSync(join(FIXTURES, name), target);
  return target;
}

async function typeAtStart(win: Page, text: string): Promise<void> {
  await win
    .locator('.docx-page')
    .first()
    .click({ position: { x: 150, y: 120 } });
  await win.keyboard.press(`${mod}+Home`);
  await win.keyboard.type(text);
}

function documentXml(path: string): string {
  return strFromU8(unzipSync(new Uint8Array(readFileSync(path)))['word/document.xml']!);
}

test('abre un .docx pasado por línea de comandos, edita y guarda con Ctrl+S', async () => {
  const path = copyFixture('footer-page-number.docx');
  const app = await launchApp({ args: [path] });
  try {
    const win = await app.firstWindow();
    await waitForDocument(win);
    expect(await windowTitles(app)).toEqual(['footer-page-number.docx - OpenWord']);

    await typeAtStart(win, 'Línea agregada por OpenWord ');
    await expect.poll(() => windowTitles(app)).toEqual(['footer-page-number.docx • - OpenWord']);

    await win.keyboard.press(`${mod}+s`);
    await expect.poll(() => windowTitles(app)).toEqual(['footer-page-number.docx - OpenWord']);
    expect(documentXml(path)).toContain('Línea agregada por OpenWord');

    // El archivo guardado se vuelve a abrir bien y conserva el texto.
    const reopened = await launchApp({ args: [path] });
    try {
      const w2 = await reopened.firstWindow();
      await waitForDocument(w2);
      await expect(w2.locator('.docx-page').first()).toContainText('Línea agregada por OpenWord');
    } finally {
      await closeAll(reopened);
    }
  } finally {
    await closeAll(app);
  }
});

test('documento nuevo: Guardar abre "Guardar como" y agrega la extensión', async () => {
  const dir = workDir();
  const app = await launchApp();
  try {
    const win = await app.firstWindow();
    await waitForDocument(win);
    await mockDialogs(app, { save: join(dir, 'Carta al cliente') });
    await typeAtStart(win, 'Estimado cliente');
    await win.keyboard.press(`${mod}+s`);
    await expect.poll(() => windowTitles(app)).toEqual(['Carta al cliente.docx - OpenWord']);
    expect(documentXml(join(dir, 'Carta al cliente.docx'))).toContain('Estimado cliente');
  } finally {
    await closeAll(app);
  }
});

test('el documento en blanco usa el papel de la región (A4 o Carta)', async () => {
  const dir = workDir();
  const app = await launchApp();
  try {
    const win = await app.firstWindow();
    await waitForDocument(win);
    await mockDialogs(app, { save: join(dir, 'papel.docx') });
    await typeAtStart(win, 'x');
    await win.keyboard.press(`${mod}+s`);
    await expect.poll(() => existsSync(join(dir, 'papel.docx'))).toBe(true);
    const paper = await win.evaluate(() => window.openword.app.info().then((i) => i.paper));
    expect(documentXml(join(dir, 'papel.docx'))).toContain(paper === 'a4' ? 'w:w="11906"' : 'w:w="12240"');
  } finally {
    await closeAll(app);
  }
});

test('cerrar con cambios: Cancelar mantiene la ventana, No guardar la cierra sin escribir', async () => {
  test.skip(process.platform === 'darwin', 'en macOS la app sigue viva sin ventanas');
  const path = copyFixture('footer-page-number.docx');
  const original = readFileSync(path);
  const app = await launchApp({ args: [path] });
  try {
    const win = await app.firstWindow();
    await waitForDocument(win);
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
  } finally {
    await closeAll(app);
  }
});

test('cerrar con cambios y elegir Guardar: guarda y luego cierra', async () => {
  test.skip(process.platform === 'darwin', 'en macOS la app sigue viva sin ventanas');
  const dir = workDir();
  const app = await launchApp();
  const win = await app.firstWindow();
  await waitForDocument(win);
  await typeAtStart(win, 'Guardado al cerrar');
  await expect.poll(async () => (await windowTitles(app))[0]).toContain('•');
  await mockDialogs(app, { messageBox: [0], save: join(dir, 'al-cerrar.docx') });
  await Promise.all([
    app.waitForEvent('close'),
    app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.close()).catch(() => undefined),
  ]);
  expect(documentXml(join(dir, 'al-cerrar.docx'))).toContain('Guardado al cerrar');
});

test('abrir desde un Documento1 sin tocar reutiliza la ventana; abrir lo ya abierto solo lo enfoca', async () => {
  const path = copyFixture('issue-319-sections.docx');
  const app = await launchApp();
  try {
    const win = await app.firstWindow();
    await waitForDocument(win);
    expect(await windowTitles(app)).toHaveLength(1);

    await mockDialogs(app, { open: [path] });
    await win.evaluate(() => window.openword.file.openDialog());
    await expect.poll(() => windowTitles(app)).toEqual(['issue-319-sections.docx - OpenWord']);
    await waitForDocument(win);

    await win.evaluate(() => window.openword.file.openDialog());
    expect(await windowTitles(app)).toEqual(['issue-319-sections.docx - OpenWord']);

    // Otro documento: ahora sí abre una ventana nueva.
    const other = copyFixture('footer-page-number.docx');
    await mockDialogs(app, { open: [other] });
    const newWindow = app.waitForEvent('window');
    await win.evaluate(() => window.openword.file.openDialog());
    await waitForDocument(await newWindow);
    expect(await windowTitles(app)).toEqual([
      'footer-page-number.docx - OpenWord',
      'issue-319-sections.docx - OpenWord',
    ]);

    // Y aparece en Recientes.
    const recent = await win.evaluate(() => window.openword.file.recent());
    expect(recent.map((r) => r.name)).toEqual(['footer-page-number.docx', 'issue-319-sections.docx']);
  } finally {
    await closeAll(app);
  }
});

test('una plantilla .dotx se abre como documento nuevo y se guarda como .docx válido', async () => {
  const dir = workDir();
  const template = join(dir, 'membrete.dotx');
  const entries = unzipSync(new Uint8Array(readFileSync(join(FIXTURES, 'footer-page-number.docx'))));
  entries['[Content_Types].xml'] = strToU8(
    strFromU8(entries['[Content_Types].xml']!).replace(
      'wordprocessingml.document.main+xml',
      'wordprocessingml.template.main+xml',
    ),
  );
  writeFileSync(template, zipSync(entries));

  const app = await launchApp({ args: [template] });
  try {
    const win = await app.firstWindow();
    await waitForDocument(win);
    await expect(win.getByTestId('notice-template')).toBeVisible();
    expect((await windowTitles(app))[0]).toMatch(/^Document[o]?\d - OpenWord$/);

    await mockDialogs(app, { save: join(dir, 'carta.docx') });
    await win.keyboard.press(`${mod}+s`);
    await expect.poll(() => windowTitles(app)).toEqual(['carta.docx - OpenWord']);
    const types = strFromU8(
      unzipSync(new Uint8Array(readFileSync(join(dir, 'carta.docx'))))['[Content_Types].xml']!,
    );
    expect(types).toContain('wordprocessingml.document.main+xml');
    expect(types).not.toContain('template.main+xml');
    expect(readFileSync(template).length).toBeGreaterThan(0); // la plantilla no se toca
  } finally {
    await closeAll(app);
  }
});

test('formatos que requieren LibreOffice o no reconocidos: avisa en lugar de fallar', async () => {
  const dir = workDir();
  const rtf = join(dir, 'viejo.doc');
  writeFileSync(rtf, '{\\rtf1\\ansi Hola}'); // RTF con extensión .doc
  const junk = join(dir, 'roto.docx');
  writeFileSync(junk, 'esto no es un documento');
  const app = await launchApp();
  try {
    const win = await app.firstWindow();
    await waitForDocument(win);
    await mockDialogs(app, { open: [rtf, junk], messageBox: [1, 0] }); // 1 = Cancelar (no abrir la descarga)
    await win.evaluate(() => window.openword.file.openDialog());
    expect(await shownMessages(app)).toEqual([
      'Para abrir «viejo.doc» se necesita LibreOffice.',
      'No se reconoce el formato de «roto.docx».',
    ]);
    expect(await windowTitles(app)).toHaveLength(1);
  } finally {
    await closeAll(app);
  }
});

test('instancia única: un segundo arranque con un archivo lo abre en la app que ya corre', async () => {
  const path = copyFixture('footer-page-number.docx');
  const app = await launchApp();
  try {
    const win = await app.firstWindow();
    await waitForDocument(win);
    const second = spawn(
      (await app.evaluate(() => process.execPath)) as string,
      [MAIN_ENTRY, path, ...sandboxArgs()],
      { env: { ...process.env, OPENWORD_USER_DATA: app.userData }, stdio: 'ignore' },
    );
    const exitCode = await new Promise<number | null>((resolve) => second.on('exit', resolve));
    expect(exitCode).toBe(0);
    await expect.poll(() => windowTitles(app)).toEqual(['footer-page-number.docx - OpenWord']);
  } finally {
    await closeAll(app);
  }
});
