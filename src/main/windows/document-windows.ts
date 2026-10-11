// Una ventana por documento, como Word: abrir, guardar, reutilizar "Documento1" y
// preguntar antes de cerrar con cambios sin guardar.
import { app, BrowserWindow, dialog, shell, type WebContents } from 'electron';
import { randomUUID } from 'node:crypto';
import { basename, extname, join } from 'node:path';
import { CONVERTIBLE_KINDS, NATIVE_KINDS } from '@shared/file-kinds';
import type { DocumentNotice, LoadedDocument, SaveResult } from '@shared/ipc-contract';
import { IpcChannel } from '@shared/ipc-contract';
import { pickUiLanguage } from '@shared/locale';
import { setMainContentType } from '@shared/package-patch';
import { readDocumentFile } from '../documents/open';
import type { RecentFiles } from '../documents/recent';
import type { RecoveryStore } from '../documents/recovery';
import { writeDocxAtomic } from '../documents/save-atomic';
import { createDocumentWindow } from '../window';

type SaveKind = 'docx' | 'docm';

/** Conversión de formatos antiguos (.doc, .rtf, .odt…) con LibreOffice, si está instalado. */
export interface Converter {
  find(): Promise<string | null>;
  convert(soffice: string, path: string): Promise<Uint8Array>;
}

const LIBREOFFICE_DOWNLOAD = 'https://www.libreoffice.org/download/download-libreoffice/';

interface DocRecord {
  readonly id: string;
  readonly win: BrowserWindow;
  displayName: string;
  filePath: string | null;
  /** Formato con que se guardará. */
  saveKind: SaveKind;
  /** Plantilla abierta como documento nuevo: al guardar se corrige el content type. */
  fromTemplate: boolean;
  dirty: boolean;
  untouched: boolean;
  /** Ya se resolvió la pregunta de guardar: el próximo close no vuelve a preguntar. */
  closeConfirmed: boolean;
  /** Se guardó al menos una vez en esta sesión. */
  savedOnce: boolean;
  prompting: Promise<boolean> | null;
  pending: LoadedDocument;
}

const samePath = (a: string, b: string) =>
  process.platform === 'linux' ? a === b : a.toLowerCase() === b.toLowerCase();

export class DocumentWindows {
  private readonly records = new Map<number, DocRecord>(); // por webContents.id
  private untitledCounter = 0;
  private readonly saveAnswers = new Map<string, (saved: boolean) => void>();

  constructor(
    private readonly devServerUrl: string | undefined,
    private readonly recents: RecentFiles,
    private readonly converter: Converter,
    private readonly recovery: RecoveryStore,
    /** Idioma de la interfaz (Opciones o, en "automático", el del sistema). */
    private readonly uiLanguage: () => 'es' | 'en' = () => pickUiLanguage(app.getPreferredSystemLanguages()),
  ) {}

  // ---------- consulta ----------

  fromWebContents(contents: WebContents): DocRecord | undefined {
    return this.records.get(contents.id);
  }

  all(): DocRecord[] {
    return [...this.records.values()];
  }

  // ---------- crear / abrir ----------

  /** "Documento1", "Documento2"… (o "Document1" con la interfaz en inglés), como Word. */
  private nextUntitledName(): string {
    this.untitledCounter += 1;
    const base = this.uiLanguage() === 'es' ? 'Documento' : 'Document';
    return `${base}${this.untitledCounter}`;
  }

  newDocument(): BrowserWindow {
    return this.createWindow(
      { docId: randomUUID(), displayName: this.nextUntitledName(), bytes: null, notices: [] },
      null,
      'docx',
      false,
      true,
    );
  }

  async openPaths(paths: readonly string[], from?: BrowserWindow): Promise<void> {
    for (const path of paths) await this.openPath(path, from);
  }

  async openPath(path: string, from?: BrowserWindow): Promise<void> {
    const existing = this.all().find((r) => r.filePath && samePath(r.filePath, path));
    if (existing) {
      focus(existing.win);
      return;
    }

    const read = await readDocumentFile(path);
    const parent = from ?? BrowserWindow.getFocusedWindow() ?? undefined;
    if (!read.ok) {
      await this.warn(parent, `No se pudo abrir «${basename(path)}».`, read.message);
      return;
    }
    const { kind, bytes } = read;

    if (kind === 'encrypted') {
      await this.warn(
        parent,
        `«${basename(path)}» está protegido con contraseña.`,
        'OpenWord todavía no puede abrir documentos cifrados.',
      );
      return;
    }
    if (CONVERTIBLE_KINDS.has(kind)) {
      await this.openConverted(path, parent);
      return;
    }
    if (!NATIVE_KINDS.has(kind)) {
      await this.warn(
        parent,
        `No se reconoce el formato de «${basename(path)}».`,
        'No parece un documento de Word.',
      );
      return;
    }

    const isTemplate = kind === 'dotx' || kind === 'dotm';
    const saveKind: SaveKind = kind === 'docm' || kind === 'dotm' ? 'docm' : 'docx';
    const notices: DocumentNotice[] = [];
    if (saveKind === 'docm') notices.push('macros');
    if (isTemplate) notices.push('template');

    let displayName: string;
    let filePath: string | null;
    if (isTemplate) {
      // Como Word: abrir una plantilla crea un documento nuevo basado en ella.
      displayName = this.nextUntitledName();
      filePath = null;
    } else {
      displayName = basename(path);
      filePath = path;
      await this.recents.add(path);
    }
    const doc: LoadedDocument = { docId: randomUUID(), displayName, bytes, notices };

    const reusable = this.findReusable(from);
    if (reusable) this.loadInto(reusable, doc, filePath, saveKind, isTemplate);
    else this.createWindow(doc, filePath, saveKind, isTemplate, false);
  }

  /** Carga un documento en una ventana existente (un "Documento1" sin tocar). */
  private loadInto(
    record: DocRecord,
    doc: LoadedDocument,
    filePath: string | null,
    saveKind: SaveKind,
    fromTemplate: boolean,
  ): void {
    record.pending = doc;
    record.displayName = doc.displayName;
    record.filePath = filePath;
    record.saveKind = saveKind;
    record.fromTemplate = fromTemplate;
    record.dirty = false;
    record.untouched = false;
    this.updateTitle(record);
    record.win.webContents.send(IpcChannel.docReplaced, doc);
    focus(record.win);
  }

  /** .doc, .rtf, .odt, Word XML o HTML: se convierten a .docx con LibreOffice. */
  private async openConverted(path: string, parent: BrowserWindow | undefined): Promise<void> {
    const name = basename(path);
    const soffice = await this.converter.find();
    if (!soffice) {
      const options: Electron.MessageBoxOptions = {
        type: 'info',
        title: 'OpenWord',
        message: `Para abrir «${name}» se necesita LibreOffice.`,
        detail:
          'Los archivos .doc (Word 97-2003), .rtf y .odt se convierten a .docx con LibreOffice, que es gratuito. ' +
          'Instálalo y vuelve a abrir el archivo.',
        buttons: ['Descargar LibreOffice', 'Cancelar'],
        defaultId: 0,
        cancelId: 1,
        noLink: true,
      };
      const { response } = parent
        ? await dialog.showMessageBox(parent, options)
        : await dialog.showMessageBox(options);
      if (response === 0) await shell.openExternal(LIBREOFFICE_DOWNLOAD);
      return;
    }
    // La ventana aparece al instante con un aviso mientras LibreOffice convierte (puede tardar
    // varios segundos, sobre todo la primera vez).
    const displayName = `${basename(name, extname(name))}.docx`;
    const waiting: LoadedDocument = {
      docId: randomUUID(),
      displayName: name,
      bytes: null,
      notices: ['converting'],
    };
    let record = this.findReusable(parent);
    const created = !record;
    if (record) this.loadInto(record, waiting, null, 'docx', false);
    else record = this.fromWebContents(this.createWindow(waiting, null, 'docx', false, false).webContents);
    if (!record) return;
    record.win.setProgressBar(2); // indeterminada

    let bytes: Uint8Array;
    try {
      bytes = await this.converter.convert(soffice, path);
    } catch (error) {
      if (!record.win.isDestroyed()) record.win.setProgressBar(-1);
      await this.warn(parent, `No se pudo convertir «${name}».`, (error as Error).message);
      if (record.win.isDestroyed()) return;
      if (created) record.win.destroy();
      else
        this.loadInto(
          record,
          { docId: randomUUID(), displayName: this.nextUntitledName(), bytes: null, notices: [] },
          null,
          'docx',
          false,
        );
      return;
    }
    if (record.win.isDestroyed()) return; // el usuario cerró la ventana mientras esperaba
    record.win.setProgressBar(-1);
    // Se abre como documento sin guardar: al guardar se pide el nombre (.docx) y el
    // archivo original no se toca.
    await this.recents.add(path);
    this.loadInto(
      record,
      { docId: randomUUID(), displayName, bytes, notices: ['converted'] },
      null,
      'docx',
      false,
    );
  }

  async openDialog(from?: BrowserWindow): Promise<void> {
    const options: Electron.OpenDialogOptions = {
      title: 'Abrir',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Documentos de Word', extensions: ['docx', 'docm', 'dotx', 'dotm', 'doc', 'rtf', 'odt'] },
        { name: 'Todos los archivos', extensions: ['*'] },
      ],
    };
    const result = from ? await dialog.showOpenDialog(from, options) : await dialog.showOpenDialog(options);
    if (!result.canceled) await this.openPaths(result.filePaths, from);
  }

  /** Una ventana en blanco sin tocar se reutiliza (preferentemente la que pidió abrir). */
  private findReusable(from?: BrowserWindow): DocRecord | undefined {
    const candidates = this.all().filter(
      (r) => r.untouched && !r.dirty && r.filePath === null && !r.fromTemplate,
    );
    return candidates.find((r) => r.win === from) ?? candidates[0];
  }

  private createWindow(
    doc: LoadedDocument,
    filePath: string | null,
    saveKind: SaveKind,
    fromTemplate: boolean,
    untouched: boolean,
  ): BrowserWindow {
    const win = createDocumentWindow(this.devServerUrl, `${doc.displayName} - OpenWord`);
    const record: DocRecord = {
      id: doc.docId,
      win,
      displayName: doc.displayName,
      filePath,
      saveKind,
      fromTemplate,
      dirty: false,
      untouched,
      closeConfirmed: false,
      savedOnce: false,
      prompting: null,
      pending: doc,
    };
    const contentsId = win.webContents.id;
    this.records.set(contentsId, record);
    if (filePath && process.platform === 'darwin') win.setRepresentedFilename(filePath);

    win.on('close', (event) => {
      if (record.closeConfirmed || !record.dirty) return;
      event.preventDefault();
      void this.confirmClose(record).then((ok) => {
        if (ok) {
          record.closeConfirmed = true;
          win.close();
        }
      });
    });
    win.on('closed', () => {
      this.records.delete(contentsId);
      // Cierre normal (guardado, "No guardar" o sin cambios): la copia de recuperación sobra.
      void this.recovery.discard(record.id);
      for (const [id, resolve] of this.saveAnswers) if (id.startsWith(record.id)) resolve(false);
    });
    return win;
  }

  /** Copia de recuperación del documento de una ventana. */
  async snapshot(record: DocRecord, bytes: Uint8Array): Promise<void> {
    await this.recovery.write(record.id, bytes, {
      displayName: record.displayName,
      filePath: record.filePath,
    });
  }

  /** Al iniciar: reabre los documentos que quedaron sin guardar tras un cierre inesperado. */
  async restoreRecovered(): Promise<number> {
    const recovered = await this.recovery.list();
    for (const item of recovered) {
      const doc: LoadedDocument = {
        docId: randomUUID(),
        displayName: item.displayName,
        bytes: item.bytes,
        notices: ['recovered'],
      };
      const saveKind: SaveKind =
        item.filePath && extname(item.filePath).toLowerCase() === '.docm' ? 'docm' : 'docx';
      const win = this.createWindow(doc, item.filePath, saveKind, false, false);
      const record = this.fromWebContents(win.webContents);
      if (!record) continue;
      record.dirty = true; // el contenido recuperado no está guardado
      this.updateTitle(record);
      await this.recovery.adopt(item.id, record.id);
    }
    return recovered.length;
  }

  // ---------- estado ----------

  setState(record: DocRecord, dirty: boolean, untouched: boolean): void {
    // Un documento recuperado sigue "con cambios" hasta que se guarde.
    record.dirty = dirty || (record.pending.notices.includes('recovered') && !record.savedOnce);
    record.untouched =
      untouched &&
      record.filePath === null &&
      !record.fromTemplate &&
      !record.pending.notices.includes('converting');
    this.updateTitle(record);
  }

  private updateTitle(record: DocRecord): void {
    record.win.setTitle(`${record.displayName}${record.dirty ? ' •' : ''} - OpenWord`);
    if (process.platform === 'darwin') {
      record.win.setDocumentEdited(record.dirty);
      record.win.setRepresentedFilename(record.filePath ?? '');
    }
  }

  // ---------- guardar ----------

  async save(record: DocRecord, bytes: Uint8Array, forceDialog: boolean): Promise<SaveResult> {
    let target = record.filePath;
    if (forceDialog || !target) {
      const ext = `.${record.saveKind}`;
      const base = basename(record.displayName, extname(record.displayName));
      const defaultPath = record.filePath ?? join(app.getPath('documents'), base + ext);
      const result = await dialog.showSaveDialog(record.win, {
        title: 'Guardar como',
        defaultPath,
        filters:
          record.saveKind === 'docm'
            ? [{ name: 'Documento de Word habilitado para macros', extensions: ['docm'] }]
            : [{ name: 'Documento de Word', extensions: ['docx'] }],
      });
      if (result.canceled || !result.filePath) return { status: 'canceled' };
      target = extname(result.filePath).toLowerCase() === ext ? result.filePath : result.filePath + ext;
      const other = this.all().find((r) => r !== record && r.filePath && samePath(r.filePath, target!));
      if (other) {
        return {
          status: 'error',
          message: `«${basename(target)}» está abierto en otra ventana. Ciérralo o elige otro nombre.`,
        };
      }
    }

    try {
      const data = record.fromTemplate ? setMainContentType(bytes, record.saveKind) : bytes;
      await writeDocxAtomic(target, data);
    } catch (error) {
      return { status: 'error', message: (error as Error).message };
    }

    record.filePath = target;
    record.displayName = basename(target);
    record.fromTemplate = false;
    record.untouched = false;
    record.dirty = false;
    record.savedOnce = true;
    this.updateTitle(record);
    await this.recents.add(target);
    await this.recovery.discard(record.id);
    return { status: 'saved', displayName: record.displayName };
  }

  // ---------- cerrar ----------

  /** Pregunta Guardar / No guardar / Cancelar. Devuelve true si se puede cerrar. */
  confirmClose(record: DocRecord): Promise<boolean> {
    if (!record.dirty || record.closeConfirmed) return Promise.resolve(true);
    record.prompting ??= this.promptAndMaybeSave(record).finally(() => {
      record.prompting = null;
    });
    return record.prompting;
  }

  private async promptAndMaybeSave(record: DocRecord): Promise<boolean> {
    focus(record.win);
    const { response } = await dialog.showMessageBox(record.win, {
      type: 'warning',
      buttons: ['Guardar', 'No guardar', 'Cancelar'],
      defaultId: 0,
      cancelId: 2,
      noLink: true,
      title: 'OpenWord',
      message: `¿Desea guardar los cambios en «${record.displayName}»?`,
      detail: 'Si no los guarda, se perderán.',
    });
    if (response === 1) return true;
    if (response !== 0) return false;
    return this.requestRendererSave(record);
  }

  /** Pide al renderer que ejecute su flujo de guardado (obtiene los bytes del motor). */
  private requestRendererSave(record: DocRecord): Promise<boolean> {
    const requestId = `${record.id}:${randomUUID()}`;
    return new Promise<boolean>((resolve) => {
      this.saveAnswers.set(requestId, resolve);
      record.win.webContents.send(IpcChannel.docSaveRequest, requestId);
    }).finally(() => this.saveAnswers.delete(requestId));
  }

  answerSaveRequest(record: DocRecord, requestId: string, saved: boolean): void {
    if (!requestId.startsWith(`${record.id}:`)) return;
    this.saveAnswers.get(requestId)?.(saved);
  }

  /** Antes de salir de la app: pregunta ventana por ventana; cualquier Cancelar aborta. */
  async confirmQuit(): Promise<boolean> {
    for (const record of this.all()) {
      if (!(await this.confirmClose(record))) return false;
      record.closeConfirmed = true;
    }
    return true;
  }

  private async warn(parent: BrowserWindow | undefined, message: string, detail: string): Promise<void> {
    const options: Electron.MessageBoxOptions = {
      type: 'warning',
      title: 'OpenWord',
      message,
      detail,
      buttons: ['Aceptar'],
    };
    if (parent) await dialog.showMessageBox(parent, options);
    else await dialog.showMessageBox(options);
  }
}

function focus(win: BrowserWindow): void {
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}
