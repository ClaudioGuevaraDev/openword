// Spike de OpenWord (hito 0): valida el motor docx-editor dentro de Electron.
import { app, BrowserWindow, dialog, ipcMain, net, protocol, session, shell } from 'electron';
import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join, normalize, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const SELFTEST = process.env.SPIKE_SELFTEST; // ruta de un .docx: modo automático
const OUT_DIR = process.env.SPIKE_OUT ?? join(app.getPath('temp'), 'openword-spike');
const report: Record<string, unknown> = {};
const t0 = Date.now();

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, codeCache: true } },
]);

const RENDERER_DIR = join(__dirname, '../renderer');
const CSP =
  "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' blob: data:; font-src 'self' blob: data:; connect-src 'self' blob: data:; " +
  "worker-src 'self' blob:; object-src 'none'; base-uri 'none'";

function registerAppProtocol(): void {
  protocol.handle('app', async (request) => {
    const url = new URL(request.url);
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    const target = normalize(join(RENDERER_DIR, rel));
    if (!target.startsWith(RENDERER_DIR + sep)) return new Response('forbidden', { status: 403 });
    const res = await net.fetch(pathToFileURL(target).toString());
    const headers = new Headers(res.headers);
    if (target.endsWith('.wasm')) headers.set('Content-Type', 'application/wasm');
    if (target.endsWith('.html')) headers.set('Content-Security-Policy', CSP);
    return new Response(res.body, { status: res.status, headers });
  });
}

function pageUrl(page: 'index' | 'print'): string {
  const dev = process.env.ELECTRON_RENDERER_URL;
  return dev ? `${dev}/${page}.html` : `app://openword/${page}.html`;
}

// ---------- Fuentes del sistema (Linux: fc-list) ----------
type FontFace = { file: string; index: number; family: string; style: string; weight: number; italic: boolean };
let fontIndex: Promise<FontFace[]> | undefined;

function fcWeightToCss(w: number): number {
  // fontconfig: 80 regular, 200 bold, 50 light, 210 black…
  if (w >= 205) return 900;
  if (w >= 195) return 700;
  if (w >= 180) return 600;
  if (w >= 100) return 500;
  if (w >= 75) return 400;
  if (w >= 50) return 300;
  return 200;
}

function loadFontIndex(): Promise<FontFace[]> {
  fontIndex ??= new Promise((done) => {
    if (process.platform !== 'linux') return done([]);
    execFile('fc-list', ['--format', '%{file}|%{index}|%{family[0]}|%{style[0]}|%{weight}|%{slant}\n'], { maxBuffer: 32 << 20 }, (err, out) => {
      if (err) return done([]);
      const faces: FontFace[] = [];
      for (const line of out.split('\n')) {
        const [file, index, family, style, weight, slant] = line.split('|');
        if (!file || !family || !/\.(ttf|otf|ttc)$/i.test(file)) continue;
        const idx = Number(index) || 0;
        if (idx >> 16 !== 0) continue; // instancias con nombre de fuentes variables: solo la instancia por defecto
        faces.push({ file, index: idx, family, style, weight: fcWeightToCss(Number(weight)), italic: Number(slant) > 0 });
      }
      done(faces);
    });
  });
  return fontIndex;
}

// ---------- IPC ----------
ipcMain.handle('fonts:families', async () => [...new Set((await loadFontIndex()).map((f) => f.family))].sort());

ipcMain.handle('fonts:resolve', async (_e, families: string[]) => {
  const wanted = new Set(families.map((f) => f.toLowerCase()));
  const faces = (await loadFontIndex()).filter((f) => wanted.has(f.family.toLowerCase()));
  const seen = new Set<string>();
  const result: { family: string; weight: number; style: 'normal' | 'italic'; faceIndex: number; bytes: Uint8Array }[] = [];
  for (const f of faces) {
    const key = `${f.family.toLowerCase()}|${f.weight}|${f.italic}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ family: f.family, weight: f.weight, style: f.italic ? 'italic' : 'normal', faceIndex: f.index, bytes: new Uint8Array(await readFile(f.file)) });
  }
  return result;
});

ipcMain.handle('doc:initial', async () => {
  const path = SELFTEST ?? process.argv.find((a) => a.toLowerCase().endsWith('.docx'));
  if (!path) return null;
  return { name: path.split(/[\\/]/).pop(), bytes: new Uint8Array(await readFile(resolve(path))), selftest: Boolean(SELFTEST) };
});

ipcMain.handle('doc:open', async () => {
  const r = await dialog.showOpenDialog({ filters: [{ name: 'Word', extensions: ['docx', 'docm', 'dotx'] }], properties: ['openFile'] });
  if (r.canceled || !r.filePaths[0]) return null;
  return { name: r.filePaths[0].split(/[\\/]/).pop(), bytes: new Uint8Array(await readFile(r.filePaths[0])) };
});

ipcMain.handle('doc:saveAs', async (_e, bytes: Uint8Array, suggested: string) => {
  const r = await dialog.showSaveDialog({ defaultPath: suggested, filters: [{ name: 'Word', extensions: ['docx'] }] });
  if (r.canceled || !r.filePath) return false;
  await writeFile(r.filePath, bytes);
  return true;
});

ipcMain.handle('doc:pdf', async (_e, bytes: Uint8Array, outPath?: string) => {
  const pdf = await renderPdf(bytes);
  let target = outPath;
  if (!target) {
    const r = await dialog.showSaveDialog({ filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    if (r.canceled || !r.filePath) return null;
    target = r.filePath;
  }
  await writeFile(target, pdf.data);
  return { path: target, ...pdf.info };
});

ipcMain.on('selftest:report', (_e, key: string, value: unknown) => {
  report[key] = value;
  console.log(`[selftest] ${key}:`, JSON.stringify(value));
});

ipcMain.handle('selftest:finish', async () => {
  report.totalMs = Date.now() - t0;
  await writeFile(join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`[selftest] DONE -> ${join(OUT_DIR, 'report.json')}`);
  setTimeout(() => app.exit(0), 200);
});

ipcMain.handle('selftest:outDir', () => OUT_DIR);

ipcMain.handle('selftest:writeFile', async (_e, name: string, bytes: Uint8Array) => {
  await writeFile(join(OUT_DIR, name.replace(/[\\/]/g, '_')), bytes);
});

ipcMain.handle('selftest:screenshot', async (e, name: string) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win) return;
  const img = await Promise.race([win.webContents.capturePage(), new Promise<never>((_, no) => setTimeout(() => no(new Error('capture timeout')), 10_000))]);
  await writeFile(join(OUT_DIR, name.replace(/[\\/]/g, '_')), img.toPNG());
});

// Escribe texto con eventos de teclado reales (mismo camino que el usuario).
ipcMain.handle('selftest:type', async (e, text: string) => {
  const wc = e.sender;
  for (const ch of text) {
    wc.sendInputEvent({ type: 'keyDown', keyCode: ch });
    wc.sendInputEvent({ type: 'char', keyCode: ch });
    wc.sendInputEvent({ type: 'keyUp', keyCode: ch });
    await new Promise((r) => setTimeout(r, 15));
  }
});

// ---------- Impresión / PDF con ventana oculta ----------
type PrintInfo = { pages: number; domPages: number; sizes: string[]; measurer: string; ms: number };

async function renderPdf(bytes: Uint8Array): Promise<{ data: Buffer; info: PrintInfo }> {
  const started = Date.now();
  const win = new BrowserWindow({
    show: false,
    width: 1000,
    height: 800,
    webPreferences: { preload: join(__dirname, '../preload/index.cjs'), sandbox: true, contextIsolation: true, backgroundThrottling: false },
  });
  try {
    const ready = new Promise<Omit<PrintInfo, 'ms'>>((ok, fail) => {
      const onReady = (e: Electron.IpcMainEvent, info: Omit<PrintInfo, 'ms'> | { error: string }) => {
        if (e.sender !== win.webContents) return;
        ipcMain.off('print:ready', onReady);
        'error' in info ? fail(new Error(info.error)) : ok(info);
      };
      ipcMain.on('print:ready', onReady);
      setTimeout(() => fail(new Error('print timeout')), 180_000);
    });
    ipcMain.handleOnce('print:bytes', () => bytes);
    await win.loadURL(pageUrl('print'));
    const info = await ready;
    const data = await win.webContents.printToPDF({
      preferCSSPageSize: true,
      printBackground: true,
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      generateTaggedPDF: true,
      generateDocumentOutline: true,
    });
    return { data, info: { ...info, ms: Date.now() - started } };
  } finally {
    ipcMain.removeHandler('print:bytes');
    win.destroy();
  }
}

// ---------- Ventana principal ----------
function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    show: !SELFTEST,
    title: 'OpenWord (spike)',
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
    },
  });
  if (process.platform !== 'darwin') win.removeMenu();
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https?|mailto):/i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.on('console-message', (details) => {
    if (SELFTEST && details.level !== 'debug') console.log(`[renderer:${details.level}] ${details.message}`);
  });
  win.webContents.on('context-menu', (_e, params) => {
    report.lastContextMenu = { misspelledWord: params.misspelledWord, suggestions: params.dictionarySuggestions };
  });
  void win.loadURL(pageUrl('index'));
  if (SELFTEST) win.showInactive();
}

app.whenReady().then(async () => {
  const { mkdir } = await import('node:fs/promises');
  await mkdir(OUT_DIR, { recursive: true });
  registerAppProtocol();
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) =>
    cb(permission === 'clipboard-read' || permission === 'clipboard-sanitized-write'),
  );
  session.defaultSession.setSpellCheckerLanguages(['es', 'en-US']);
  createWindow();
});

app.on('window-all-closed', () => app.quit());
