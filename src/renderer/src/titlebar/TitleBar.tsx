// Barra de título propia, como la de Word 365: logo, acceso rápido, nombre del documento y Buscar.
import type { ReactNode } from 'react';
import {
  ArrowRedo20Regular,
  ArrowUndo20Regular,
  Save20Regular,
  Search16Regular,
} from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';
import { openFind, redo, saveDocument, undo } from '@renderer/editor/document-actions';
import { useDocumentStore } from '@renderer/state/document-store';
import { useUiStore } from '@renderer/state/ui-store';
import { cx } from '@renderer/ui/cx';
import { shortcutLabel } from '@renderer/ribbon/shortcut-label';

/** Logotipo de OpenWord: hoja redondeada con una W y el punto coral de la marca. */
function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" className="tw:flex-none">
      <rect x="1" y="1" width="20" height="20" rx="6" fill="#fff" />
      <path
        d="M5.2 7.2 7.3 15h1.5l2.2-5.6 2.2 5.6h1.5l2.1-7.8"
        fill="none"
        stroke="#185abd"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="17.6" cy="4.4" r="2.6" fill="var(--ow-spark)" stroke="#fff" strokeWidth="1.2" />
    </svg>
  );
}

function QuickButton({
  label,
  onClick,
  children,
}: {
  readonly label: string;
  readonly onClick: () => void;
  readonly children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="ow-no-drag tw:inline-flex tw:size-7 tw:cursor-pointer tw:items-center tw:justify-center tw:rounded-md tw:border-0 tw:bg-transparent tw:text-white tw:transition-colors tw:hover:bg-white/15 tw:focus-visible:outline-2 tw:focus-visible:outline-white/70 tw:active:bg-white/25"
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()} // como la cinta: no roba el cursor del documento
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function TitleBar() {
  const { t } = useTranslation();
  const displayName = useDocumentStore((s) => s.displayName);
  const dirty = useDocumentStore((s) => s.dirty);
  const platform = useUiStore((s) => s.platform);
  const language = useUiStore((s) => s.language);
  const mac = platform === 'darwin';
  const keys = (combo: string) => shortcutLabel(combo, platform, language);

  return (
    <header
      className={cx(
        'ow-drag ow-header tw:grid tw:h-10 tw:flex-none tw:grid-cols-[1fr_minmax(160px,340px)_1fr] tw:items-center tw:gap-3 tw:text-white tw:select-none',
        // macOS: hueco para los semáforos. Windows/Linux: los botones de ventana van a la derecha.
        mac ? 'tw:pr-3 tw:pl-[78px]' : 'tw:pl-2.5',
      )}
      style={
        mac
          ? undefined
          : {
              paddingRight:
                'calc(100vw - env(titlebar-area-x, 0px) - env(titlebar-area-width, 100vw) + 12px)',
            }
      }
      data-testid="title-bar"
    >
      <div className="tw:flex tw:min-w-0 tw:items-center tw:gap-1">
        <Logo />
        <div
          className="tw:ml-1.5 tw:flex tw:items-center tw:gap-0.5"
          role="group"
          aria-label={t('titlebar.quickAccess')}
        >
          <QuickButton
            label={`${t('titlebar.save')} (${keys('Mod+S')})`}
            onClick={() => void saveDocument('save')}
          >
            <Save20Regular />
          </QuickButton>
          <QuickButton label={`${t('titlebar.undo')} (${keys('Mod+Z')})`} onClick={undo}>
            <ArrowUndo20Regular />
          </QuickButton>
          <QuickButton
            label={`${t('titlebar.redo')} (${keys(mac ? 'Mod+Shift+Z' : 'Mod+Y')})`}
            onClick={redo}
          >
            <ArrowRedo20Regular />
          </QuickButton>
        </div>
        <span className="tw:mx-2 tw:h-4 tw:w-px tw:flex-none tw:bg-white/30" aria-hidden="true" />
        <span className="tw:flex tw:min-w-0 tw:items-center tw:gap-2 tw:text-[13px]">
          <span className="tw:truncate tw:font-semibold">{displayName}</span>
          <span
            className={cx(
              'tw:inline-flex tw:flex-none tw:items-center tw:gap-1.5 tw:text-[12px]',
              dirty ? 'tw:text-white' : 'tw:text-white/70',
            )}
          >
            <span
              className={cx(
                'tw:size-1.5 tw:rounded-full tw:transition-colors',
                dirty ? 'tw:bg-spark tw:ring-3 tw:ring-spark/25' : 'tw:bg-white/50',
              )}
              aria-hidden="true"
            />
            {dirty ? t('titlebar.unsaved') : t('titlebar.saved')}
          </span>
        </span>
      </div>
      <button
        type="button"
        className="ow-no-drag tw:flex tw:h-7 tw:w-full tw:cursor-text tw:items-center tw:gap-2 tw:rounded-full tw:border tw:border-white/25 tw:bg-white/15 tw:px-3 tw:text-left tw:font-[family-name:inherit] tw:text-[12px] tw:text-white/85 tw:transition-colors tw:hover:border-white/40 tw:hover:bg-white/25 tw:focus-visible:outline-2 tw:focus-visible:outline-white/70"
        onClick={openFind}
        aria-label={t('titlebar.search')}
      >
        <Search16Regular className="tw:flex-none" />
        <span className="tw:flex-1 tw:truncate">{t('titlebar.search')}</span>
        <kbd className="tw:rounded tw:bg-white/15 tw:px-1.5 tw:font-[family-name:inherit] tw:text-[11px] tw:text-white/80">
          {keys('Mod+F')}
        </kbd>
      </button>
      <span />
    </header>
  );
}
