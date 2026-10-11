import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ClipboardPaste24Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';
import { pasteFromClipboard } from '@renderer/editor/document-actions';
import styles from '../Ribbon.module.css';

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
    <div className={styles.splitLarge}>
      <button
        type="button"
        className={styles.splitLargeTop}
        aria-label={t('home.clipboard.paste')}
        title={`${t('home.clipboard.paste')} (${shortcut})`}
        data-testid="paste"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => void pasteFromClipboard()}
      >
        <ClipboardPaste24Regular />
      </button>
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger asChild>
          <button type="button" className={styles.splitLargeBottom} onMouseDown={(e) => e.preventDefault()}>
            {t('home.clipboard.paste')} ▾
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className={styles.menu}
            align="start"
            sideOffset={2}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <DropdownMenu.Item className={styles.menuItem} onSelect={() => void pasteFromClipboard()}>
              <span className={styles.menuCheck} />
              {t('home.clipboard.pasteKeep')}
            </DropdownMenu.Item>
            <DropdownMenu.Item className={styles.menuItem} onSelect={() => void pasteFromClipboard(true)}>
              <span className={styles.menuCheck} />
              {t('home.clipboard.pastePlain')} ({plainShortcut})
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
