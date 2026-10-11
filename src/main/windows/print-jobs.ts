// Imprimir y exportar a PDF sin la licencia Pro del motor: una ventana oculta monta el
// documento en un contenedor SIN scroll (así el motor pinta TODAS las páginas), aplica
// @page con el tamaño de cada sección y Chromium genera el PDF o imprime ese mismo DOM.
import { app, BrowserWindow, dialog, ipcMain, type WebContents } from 'electron';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { IpcChannel, type PrintJob, type PrintRenderInfo, type SaveResult } from '@shared/ipc-contract';
import { APP_ORIGIN } from '../app-url';
import { hardenWebContents } from '../security';

const RENDER_TIMEOUT_MS = 5 * 60_000;

interface Job {
  readonly id: string;
  readonly owner: WebContents;
  readonly win: BrowserWindow;
  readonly bytes: Uint8Array;
  pdf: Uint8Array | null;
  displayName: string;
  rendered: (result: PrintRenderInfo | { error: string }) => void;
}

export class PrintJobs {
  private readonly jobs = new Map<string, Job>();
  private readonly byPrintWindow = new Map<number, Job>();

  constructor(private readonly devServerUrl: string | undefined) {}

  /** ¿Este webContents es una ventana de impresión? (para validar su IPC). */
  jobForPrintWindow(contents: WebContents): Job | undefined {
    return this.byPrintWindow.get(contents.id);
  }

  async prepare(owner: WebContents, bytes: Uint8Array, displayName: string): Promise<PrintJob> {
    const win = new BrowserWindow({
      show: false,
      width: 1200,
      height: 900,
      webPreferences: {
        preload: join(__dirname, '../preload/index.cjs'),
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
        backgroundThrottling: false, // oculta pero debe pintar
      },
    });
    hardenWebContents(win.webContents);
    const id = randomUUID();
    let resolveRendered!: (result: PrintRenderInfo | { error: string }) => void;
    const rendered = new Promise<PrintRenderInfo | { error: string }>(
      (resolve) => (resolveRendered = resolve),
    );
    const job: Job = { id, owner, win, bytes, pdf: null, displayName, rendered: resolveRendered };
    this.jobs.set(id, job);
    this.byPrintWindow.set(win.webContents.id, job);
    // Si se cierra la ventana del documento, se descarta su trabajo.
    owner.once('destroyed', () => this.dispose(id));

    try {
      const timeout = new Promise<{ error: string }>((resolve) =>
        setTimeout(
          () => resolve({ error: 'La preparación de la impresión tardó demasiado.' }),
          RENDER_TIMEOUT_MS,
        ),
      );
      await win.loadURL(this.devServerUrl ? `${this.devServerUrl}/print.html` : `${APP_ORIGIN}/print.html`);
      const info = await Promise.race([rendered, timeout]);
      if ('error' in info) throw new Error(info.error);
      const pdf = await win.webContents.printToPDF({
        preferCSSPageSize: true,
        printBackground: true,
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        generateTaggedPDF: true,
        generateDocumentOutline: true,
      });
      job.pdf = new Uint8Array(pdf.buffer, pdf.byteOffset, pdf.byteLength);
      return { jobId: id, pdf: job.pdf, pages: info.pages };
    } catch (error) {
      this.dispose(id);
      throw error;
    }
  }

  print(owner: WebContents, jobId: string): Promise<{ ok: boolean; error?: string }> {
    const job = this.ownedJob(owner, jobId);
    return new Promise((resolve) => {
      // Diálogo de impresión del sistema (impresora, copias, páginas).
      job.win.webContents.print({ silent: false, printBackground: true }, (success, failureReason) => {
        // "cancelled" no es un error para el usuario.
        resolve(
          success || failureReason === 'cancelled' ? { ok: success } : { ok: false, error: failureReason },
        );
      });
    });
  }

  async savePdf(owner: WebContents, jobId: string): Promise<SaveResult> {
    const job = this.ownedJob(owner, jobId);
    if (!job.pdf) return { status: 'error', message: 'El PDF todavía no está listo.' };
    const parent = BrowserWindow.fromWebContents(owner);
    const base = basename(job.displayName, extname(job.displayName));
    const options: Electron.SaveDialogOptions = {
      title: 'Exportar a PDF',
      defaultPath: join(app.getPath('documents'), `${base}.pdf`),
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    };
    const result = parent
      ? await dialog.showSaveDialog(parent, options)
      : await dialog.showSaveDialog(options);
    if (result.canceled || !result.filePath) return { status: 'canceled' };
    const target =
      extname(result.filePath).toLowerCase() === '.pdf' ? result.filePath : `${result.filePath}.pdf`;
    try {
      await writeFile(target, job.pdf);
      return { status: 'saved', displayName: basename(target) };
    } catch (error) {
      return { status: 'error', message: (error as Error).message };
    }
  }

  dispose(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    this.jobs.delete(jobId);
    if (!job.win.isDestroyed()) {
      this.byPrintWindow.delete(job.win.webContents.id);
      job.win.destroy();
    }
  }

  disposeOwnedBy(owner: WebContents, jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job && job.owner === owner) this.dispose(jobId);
  }

  private ownedJob(owner: WebContents, jobId: string): Job {
    const job = this.jobs.get(jobId);
    if (!job || job.owner !== owner) throw new Error('Trabajo de impresión desconocido');
    return job;
  }
}

/** Handlers que usa la ventana de impresión (solo ventanas de impresión registradas). */
export function registerPrintWindowIpc(jobs: PrintJobs): void {
  ipcMain.handle(IpcChannel.printSourceBytes, (event) => {
    const job = jobs.jobForPrintWindow(event.sender);
    if (!job) throw new Error('No es una ventana de impresión');
    return job.bytes;
  });
  ipcMain.on(IpcChannel.printRendered, (event, result: PrintRenderInfo | { error: string }) => {
    jobs.jobForPrintWindow(event.sender)?.rendered(result);
  });
}
