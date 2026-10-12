import { ChevronDown12Regular, ClipboardPaste24Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';
import { pasteFromClipboard } from '@renderer/editor/document-actions';
import { Menu, MenuItem } from '@renderer/ui/Menu';
import * as rc from '../ribbon-classes';

const half =
  'tw:flex tw:cursor-pointer tw:items-center tw:justify-center tw:border-0 tw:bg-transparent tw:text-fg tw:font-[family-name:inherit] tw:text-[12px] tw:transition-colors tw:duration-100 tw:hover:bg-hover tw:active:bg-pressed tw:focus-visible:outline-2 tw:focus-visible:outline-offset-1 tw:focus-visible:outline-spark';

/** Pegar (botón grande) con el menú de opciones de pegado debajo, como en Word. */
export function PasteButton({
  shortcut,
  plainShortcut,
}: {
  readonly shortcut: string;
  readonly plainShortcut: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="tw:group tw:box-border tw:flex tw:h-16 tw:min-w-18 tw:grow tw:flex-col tw:items-stretch tw:rounded-md tw:border tw:border-transparent tw:transition-colors tw:hover:border-line">
      <button
        type="button"
        className={`${half} tw:flex-1 tw:rounded-t-[5px] tw:pt-1 tw:[&>svg]:size-8 tw:[&>svg]:text-accent`}
        aria-label={t('home.clipboard.paste')}
        title={`${t('home.clipboard.paste')} (${shortcut})`}
        data-testid="paste"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => void pasteFromClipboard()}
      >
        <ClipboardPaste24Regular />
      </button>
      <Menu
        label={t('home.clipboard.pasteOptions')}
        trigger={({ anchorStyle, triggerProps }) => (
          <button
            type="button"
            {...triggerProps}
            className={`${half} tw:min-h-7 tw:gap-0.5 tw:rounded-b-[5px] tw:border-t tw:border-transparent tw:px-2 tw:whitespace-nowrap tw:group-hover:border-line`}
            style={anchorStyle}
            aria-label={t('home.clipboard.pasteOptions')}
            title={t('home.clipboard.pasteOptions')}
            onMouseDown={(e) => e.preventDefault()}
          >
            <span className={rc.labelWithArrow}>
              {t('home.clipboard.paste')}
              <ChevronDown12Regular className={rc.miniArrow} />
            </span>
          </button>
        )}
      >
        <MenuItem onSelect={() => void pasteFromClipboard()}>
          <span className={rc.menuCheck} />
          {t('home.clipboard.pasteKeep')}
        </MenuItem>
        <MenuItem onSelect={() => void pasteFromClipboard(true)}>
          <span className={rc.menuCheck} />
          {t('home.clipboard.pastePlain')} ({plainShortcut})
        </MenuItem>
      </Menu>
    </div>
  );
}
