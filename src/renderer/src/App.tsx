import type { UiLanguage } from '@shared/ipc-contract';
import { EditorHost } from './editor/EditorHost';
import { Ribbon } from './ribbon/Ribbon';
import { StatusBar } from './statusbar/StatusBar';
import styles from './App.module.css';

export function App({ language }: { readonly language: UiLanguage }) {
  return (
    <div className={`docx-editor ${styles.app}`} data-testid="app">
      <EditorHost document="blank" language={language} ribbon={<Ribbon />} statusBar={<StatusBar />} />
    </div>
  );
}
