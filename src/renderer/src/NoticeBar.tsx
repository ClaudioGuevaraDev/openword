import { useTranslation } from 'react-i18next';
import type { DocumentNotice } from '@shared/ipc-contract';
import { useDocumentStore } from './state/document-store';

const bar =
  'tw:flex tw:flex-none tw:items-center tw:gap-2 tw:border-b tw:px-3 tw:py-1.5 tw:text-[12px] tw:text-fg';

export function NoticeBar({ notices }: { readonly notices: readonly DocumentNotice[] }) {
  const { t } = useTranslation();
  const error = useDocumentStore((s) => s.error);
  const setError = useDocumentStore((s) => s.setError);

  return (
    <>
      {notices.map((notice) => (
        <div
          key={notice}
          className={`${bar} tw:border-[#f0d36c] tw:bg-[#fff4ce] tw:dark:border-[#6b5b1a] tw:dark:bg-[#4a3f12]`}
          role="status"
          data-testid={`notice-${notice}`}
        >
          {t(`notices.${notice}`)}
        </div>
      ))}
      {error && (
        <div
          className={`${bar} tw:border-[#f1aeb5] tw:bg-[#fde7e9] tw:dark:border-[#7a2e36] tw:dark:bg-[#4a1d22]`}
          role="alert"
          data-testid="notice-error"
        >
          <span>{error}</span>
          <button
            type="button"
            className="tw:ml-auto tw:cursor-pointer tw:border-0 tw:bg-transparent tw:text-[16px] tw:leading-none tw:text-inherit"
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
