import { ClipboardPaste24Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';
import { pasteFromClipboard } from '@renderer/editor/document-actions';
import { Menu, MenuItem } from '@renderer/ui/Menu';
import * as rc from '../ribbon-classes';

const half =
  'tw:cursor-pointer tw:border-0 tw:bg-transparent tw:text-fg tw:font-[family-name:inherit] tw:text-[12px] tw:hover:bg-hover';

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
    <div className="tw:flex tw:h-[66px] tw:w-[54px] tw:flex-col tw:items-stretch tw:rounded-[3px] tw:border tw:border-transparent tw:hover:border-line">
      <button
        type="button"
        className={`${half} tw:flex-1 tw:[&>svg]:size-8`}
        aria-label={t('home.clipboard.paste')}
        title={`${t('home.clipboard.paste')} (${shortcut})`}
        data-testid="paste"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => void pasteFromClipboard()}
      >
        <ClipboardPaste24Regular />
      </button>
      <Menu
        label={t('home.clipboard.paste')}
        trigger={({ anchorStyle, triggerProps }) => (
          <button
            type="button"
            {...triggerProps}
            className={`${half} tw:py-0.5 tw:whitespace-nowrap`}
            style={anchorStyle}
            onMouseDown={(e) => e.preventDefault()}
          >
            {t('home.clipboard.paste')} ▾
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
