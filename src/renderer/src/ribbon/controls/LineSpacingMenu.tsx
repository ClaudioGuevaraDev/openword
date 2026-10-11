import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { ReactNode } from 'react';
import { useEditorValueCommand } from '@docx-editor.dev/react';
import { useTranslation } from 'react-i18next';
import styles from '../Ribbon.module.css';

const SPACINGS = [1, 1.15, 1.5, 2, 2.5, 3];

export function LineSpacingMenu({
  icon,
  language,
  onMoreOptions,
}: {
  readonly icon: ReactNode;
  readonly language: 'es' | 'en';
  readonly onMoreOptions: () => void;
}) {
  const { t } = useTranslation();
  const spacing = useEditorValueCommand('list.lineSpacing');
  const fmt = (n: number) =>
    language === 'es' ? n.toFixed(n === 1.15 ? 2 : 1).replace('.', ',') : n.toFixed(n === 1.15 ? 2 : 1);
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={styles.button}
          aria-label={t('home.paragraph.lineSpacing')}
          title={t('home.paragraph.lineSpacing')}
          disabled={!spacing.isEnabled}
          onMouseDown={(e) => e.preventDefault()}
        >
          <span className={styles.icon}>{icon}</span>
          <span className={styles.miniArrow}>▾</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={styles.menu}
          align="start"
          sideOffset={2}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {SPACINGS.map((value) => (
            <DropdownMenu.CheckboxItem
              key={value}
              className={styles.menuItem}
              checked={spacing.value !== null && Math.abs(spacing.value - value) < 0.01}
              onSelect={() => spacing.execute(value)}
            >
              <span className={styles.menuCheck}>
                {spacing.value !== null && Math.abs(spacing.value - value) < 0.01 ? '✓' : ''}
              </span>
              {fmt(value)}
            </DropdownMenu.CheckboxItem>
          ))}
          <DropdownMenu.Separator className={styles.menuSeparator} />
          <DropdownMenu.Item className={styles.menuItem} onSelect={onMoreOptions}>
            <span className={styles.menuCheck} />
            {t('home.paragraph.lineSpacingOptions')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
