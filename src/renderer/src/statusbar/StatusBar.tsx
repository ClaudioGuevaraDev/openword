import { useEditorState } from '@docx-editor.dev/react';
import { useTranslation } from 'react-i18next';
import styles from './StatusBar.module.css';

export function StatusBar() {
  const { t } = useTranslation();
  const page = useEditorState((s) => s.page);

  return (
    <footer className={styles.statusbar} data-testid="status-bar">
      <span data-testid="status-page">
        {t('status.page', { current: page?.current ?? 1, total: page?.total ?? 1 })}
      </span>
      <span>{t('status.language')}</span>
      <span className={styles.spacer} />
    </footer>
  );
}
