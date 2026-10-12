import { Dismiss16Regular, ErrorCircle16Regular, Info16Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';
import type { DocumentNotice } from '@shared/ipc-contract';
import { useDocumentStore } from './state/document-store';

// Avisos como tarjetas bajo la cinta, alineadas con ella.
const bar =
  'tw:mx-1.5 tw:mb-1.5 tw:flex tw:flex-none tw:items-center tw:gap-2 tw:rounded-lg tw:border tw:px-3 tw:py-1.5 tw:text-[12px] tw:text-fg';

export function NoticeBar({ notices }: { readonly notices: readonly DocumentNotice[] }) {
  const { t } = useTranslation();
  const error = useDocumentStore((s) => s.error);
  const setError = useDocumentStore((s) => s.setError);

  return (
    <>
      {notices.map((notice) => (
        <div
          key={notice}
          className={`${bar} tw:border-notice-line tw:bg-notice`}
          role="status"
          data-testid={`notice-${notice}`}
        >
          <Info16Regular className="tw:flex-none tw:text-accent" />
          {t(`notices.${notice}`)}
        </div>
      ))}
      {error && (
        <div
          className={`${bar} tw:border-danger-line tw:bg-danger-bg`}
          role="alert"
          data-testid="notice-error"
        >
          <ErrorCircle16Regular className="tw:flex-none tw:text-danger" />
          <span>{error}</span>
          <button
            type="button"
            className="tw:ml-auto tw:inline-flex tw:size-6 tw:cursor-pointer tw:items-center tw:justify-center tw:rounded-md tw:border-0 tw:bg-transparent tw:text-inherit tw:hover:bg-black/5 tw:dark:hover:bg-white/10"
            onClick={() => setError(null)}
            aria-label={t('notices.dismiss')}
          >
            <Dismiss16Regular />
          </button>
        </div>
      )}
    </>
  );
}
