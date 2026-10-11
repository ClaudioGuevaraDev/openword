import { useEffect, useMemo } from 'react';
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

export function App({ info }: { readonly info: AppInfo }) {
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
    <div className={`docx-editor ${styles.app}`} data-testid="app">
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
