import { useTranslation } from 'react-i18next';
import type { DocumentNotice } from '@shared/ipc-contract';
import { useDocumentStore } from './state/document-store';
import styles from './NoticeBar.module.css';

export function NoticeBar({ notices }: { readonly notices: readonly DocumentNotice[] }) {
  const { t } = useTranslation();
  const error = useDocumentStore((s) => s.error);
  const setError = useDocumentStore((s) => s.setError);

  return (
    <>
      {notices.map((notice) => (
        <div key={notice} className={styles.bar} role="status" data-testid={`notice-${notice}`}>
          {t(`notices.${notice}`)}
        </div>
      ))}
      {error && (
        <div className={`${styles.bar} ${styles.error}`} role="alert" data-testid="notice-error">
          <span>{error}</span>
          <button
            type="button"
            className={styles.close}
            onClick={() => setError(null)}
            aria-label={t('notices.dismiss')}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
