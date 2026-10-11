// Vista "Archivo" a pantalla completa, como el Backstage de Word.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RecentFile } from '@shared/ipc-contract';
import { closeWindow, newDocument, openDocument, saveDocument } from '@renderer/editor/document-actions';
import { useDocumentStore } from '@renderer/state/document-store';
import { useUiStore } from '@renderer/state/ui-store';
import styles from './Backstage.module.css';

export function Backstage() {
  const { t } = useTranslation();
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const displayName = useDocumentStore((s) => s.displayName);
  const [recent, setRecent] = useState<readonly RecentFile[]>([]);

  useEffect(() => {
    void window.openword.file.recent().then(setRecent);
  }, []);

  const back = () => setActiveTab('home');
  const run = (action: () => unknown) => () => {
    back();
    void action();
  };

  return (
    <div className={styles.backstage} role="dialog" aria-label={t('tabs.file')} data-testid="backstage">
      <nav className={styles.nav}>
        <button type="button" className={styles.back} onClick={back} aria-label={t('backstage.back')}>
          ←
        </button>
        <button type="button" onClick={run(newDocument)}>
          {t('backstage.new')}
        </button>
        <button type="button" onClick={run(openDocument)}>
          {t('backstage.open')}
        </button>
        <button type="button" onClick={run(() => saveDocument('save'))}>
          {t('backstage.save')}
        </button>
        <button type="button" onClick={run(() => saveDocument('saveAs'))}>
          {t('backstage.saveAs')}
        </button>
        <span className={styles.spacer} />
        <button type="button" onClick={run(closeWindow)}>
          {t('backstage.close')}
        </button>
      </nav>
      <section className={styles.content}>
        <h1 className={styles.title}>{displayName}</h1>
        <h2>{t('backstage.recent')}</h2>
        {recent.length === 0 ? (
          <p className={styles.empty}>{t('backstage.noRecent')}</p>
        ) : (
          <ul className={styles.recent} data-testid="recent-list">
            {recent.map((file) => (
              <li key={file.path}>
                <button
                  type="button"
                  onClick={run(() => window.openword.file.openRecent(file.path))}
                  title={file.path}
                >
                  <span className={styles.recentName}>{file.name}</span>
                  <span className={styles.recentFolder}>{file.folder}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
