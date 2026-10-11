// Contrato entre el proceso main y el renderer. El preload expone `window.openword`
// con exactamente esta forma; main registra un handler por canal.

export type UiLanguage = 'es' | 'en';
export type Paper = 'letter' | 'a4';

export interface AppInfo {
  readonly version: string;
  readonly platform:
    | 'aix'
    | 'android'
    | 'darwin'
    | 'freebsd'
    | 'haiku'
    | 'linux'
    | 'openbsd'
    | 'sunos'
    | 'win32'
    | 'cygwin'
    | 'netbsd';
  readonly uiLanguage: UiLanguage;
  /** Región del SO (por ejemplo "MX", "ES", "US"): decide papel Carta/A4 y unidades de la regla. */
  readonly region: string | null;
  readonly paper: Paper;
}

/** Avisos que la ventana muestra en una barra sobre el documento. */
export type DocumentNotice = 'macros' | 'template';

/** Lo que una ventana debe mostrar. `bytes: null` significa documento nuevo en blanco. */
export interface LoadedDocument {
  readonly docId: string;
  /** Nombre visible: "Documento1" o "informe.docx". */
  readonly displayName: string;
  readonly bytes: Uint8Array | null;
  readonly notices: readonly DocumentNotice[];
}

export type SaveResult =
  | { readonly status: 'saved'; readonly displayName: string }
  | { readonly status: 'canceled' }
  | { readonly status: 'error'; readonly message: string };

export interface RecentFile {
  readonly path: string;
  readonly name: string;
  readonly folder: string;
  readonly openedAt: number;
}

export interface ResolvedFontFace {
  readonly family: string;
  readonly weight: number;
  readonly style: 'normal' | 'italic';
  readonly faceIndex: number;
  readonly bytes: Uint8Array;
}

export type Unsubscribe = () => void;

/** Comandos que llegan desde el menú nativo (macOS). */
export type MenuCommand = 'undo' | 'redo';

export interface OpenWordApi {
  readonly app: {
    info(): Promise<AppInfo>;
  };
  readonly doc: {
    /** Documento de esta ventana (al cargar la página). */
    current(): Promise<LoadedDocument>;
    /** Main reemplaza el documento de una ventana en blanco sin tocar. */
    onReplaced(listener: (doc: LoadedDocument) => void): Unsubscribe;
    /** El renderer informa si hay cambios sin guardar y si la ventana sigue "sin tocar". */
    setState(state: { readonly dirty: boolean; readonly untouched: boolean }): void;
    save(bytes: Uint8Array): Promise<SaveResult>;
    saveAs(bytes: Uint8Array): Promise<SaveResult>;
    /** Main pide guardar (al cerrar). El renderer responde con `answerSaveRequest`. */
    onSaveRequest(listener: (requestId: string) => void): Unsubscribe;
    answerSaveRequest(requestId: string, saved: boolean): void;
  };
  readonly file: {
    newDocument(): void;
    openDialog(): Promise<void>;
    openRecent(path: string): Promise<void>;
    /** Archivos soltados sobre la ventana (el preload obtiene sus rutas). */
    openDropped(files: readonly File[]): Promise<void>;
    recent(): Promise<readonly RecentFile[]>;
    closeWindow(): void;
  };
  readonly clipboard: {
    /** Lee el portapapeles del sistema (para el botón Pegar de la cinta). */
    read(): Promise<{ readonly text: string; readonly html: string }>;
  };
  readonly menu: {
    onCommand(listener: (command: MenuCommand) => void): Unsubscribe;
  };
  readonly fonts: {
    families(): Promise<readonly string[]>;
    resolve(families: readonly string[]): Promise<readonly ResolvedFontFace[]>;
  };
}

export const IpcChannel = {
  appInfo: 'app:info',
  docCurrent: 'doc:current',
  docReplaced: 'doc:replaced',
  docSetState: 'doc:set-state',
  docSave: 'doc:save',
  docSaveAs: 'doc:save-as',
  docSaveRequest: 'doc:save-request',
  docSaveAnswer: 'doc:save-answer',
  fileNew: 'file:new',
  fileOpenDialog: 'file:open-dialog',
  fileOpenRecent: 'file:open-recent',
  fileOpenPaths: 'file:open-paths',
  fileRecent: 'file:recent',
  fileClose: 'file:close',
  clipboardRead: 'clipboard:read',
  menuCommand: 'menu:command',
  fontFamilies: 'fonts:families',
  fontResolve: 'fonts:resolve',
} as const;
