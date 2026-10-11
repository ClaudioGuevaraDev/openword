import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { blankDocumentBytes } from '@docx-editor.dev/core/editor';
import type { AppInfo } from '@shared/ipc-contract';
import { setBlankPaper } from '@shared/package-patch';
import { Backstage } from './backstage/Backstage';
import { installAppShortcuts, installDocumentDrop } from './commands/shortcuts';
import { EditorHost } from './editor/EditorHost';
import { NoticeBar } from './NoticeBar';
import { Ribbon } from './ribbon/Ribbon';
import { useDocumentStore } from './state/document-store';
import { useUiStore } from './state/ui-store';
import { StatusBar } from './statusbar/StatusBar';
import styles from './App.module.css';

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
const subscribeDark = (notify: () => void) => {
  darkQuery.addEventListener('change', notify);
  return () => darkQuery.removeEventListener('change', notify);
};

/** Tema efectivo: la preferencia de Vista › Tema o, en "Sistema", la del SO. */
function useDarkMode(): boolean {
  const theme = useUiStore((s) => s.theme);
  const systemDark = useSyncExternalStore(subscribeDark, () => darkQuery.matches);
  const dark = theme === 'dark' || (theme === 'system' && systemDark);
  useEffect(() => {
    document.documentElement.dataset['theme'] = dark ? 'dark' : 'light';
  }, [dark]);
  return dark;
}

export function App({ info }: { readonly info: AppInfo }) {
  const dark = useDarkMode();
  const doc = useDocumentStore((s) => s.doc);
  const loadSeq = useDocumentStore((s) => s.loadSeq);
  const backstageOpen = useUiStore((s) => s.activeTab === 'file');

  useEffect(() => {
    const load = useDocumentStore.getState().load;
    void window.openword.doc.current().then(load);
    const offReplaced = window.openword.doc.onReplaced(load);
    const offShortcuts = installAppShortcuts(info.platform === 'darwin' ? 'darwin' : 'other');
    const offDrop = installDocumentDrop();
    return () => {
      offReplaced();
      offShortcuts();
      offDrop();
    };
  }, [info.platform]);

  // Documento nuevo: plantilla en blanco del motor con el papel de la región (Carta o A4).
  const source = useMemo(
    () => (doc ? (doc.bytes ?? setBlankPaper(blankDocumentBytes(), info.paper)) : null),
    [doc, info.paper],
  );

  return (
    // La clase "dark" activa también el modo oscuro del motor (invierte la vista de la página,
    // sin cambiar los colores guardados).
    <div className={`docx-editor ${dark ? 'dark' : ''} ${styles.app}`} data-testid="app">
      {doc && source && (
        <EditorHost
          key={`${doc.docId}:${loadSeq}`}
          document={source}
          language={info.uiLanguage}
          isNew={doc.bytes === null}
          ribbon={<Ribbon />}
          notices={<NoticeBar notices={doc.notices} />}
          statusBar={<StatusBar />}
        />
      )}
      {backstageOpen && <Backstage />}
    </div>
  );
}
