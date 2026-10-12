import { ChevronDown12Regular } from '@fluentui/react-icons';
import type { ReactNode } from 'react';
import { useEditorValueCommand } from '@docx-editor.dev/react';
import { useTranslation } from 'react-i18next';
import { focusEditor } from '@renderer/editor/document-actions';
import { Menu, MenuCheckboxItem, MenuItem, MenuSeparator } from '@renderer/ui/Menu';
import * as rc from '../ribbon-classes';

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
  const isCurrent = (value: number) => spacing.value !== null && Math.abs(spacing.value - value) < 0.01;
  return (
    <Menu
      label={t('home.paragraph.lineSpacing')}
      trigger={({ anchorStyle, triggerProps }) => (
        <button
          type="button"
          {...triggerProps}
          className={rc.button}
          style={anchorStyle}
          aria-label={t('home.paragraph.lineSpacing')}
          title={t('home.paragraph.lineSpacing')}
          disabled={!spacing.isEnabled}
          onMouseDown={(e) => e.preventDefault()}
        >
          <span className={rc.icon}>{icon}</span>
          <ChevronDown12Regular className={rc.miniArrow} />
        </button>
      )}
    >
      {SPACINGS.map((value) => (
        <MenuCheckboxItem
          key={value}
          checked={isCurrent(value)}
          onSelect={() => {
            spacing.execute(value);
            setTimeout(focusEditor, 0);
          }}
        >
          <span className={rc.menuCheck}>{isCurrent(value) ? '✓' : ''}</span>
          {fmt(value)}
        </MenuCheckboxItem>
      ))}
      <MenuSeparator />
      <MenuItem onSelect={onMoreOptions}>
        <span className={rc.menuCheck} />
        {t('home.paragraph.lineSpacingOptions')}
      </MenuItem>
    </Menu>
  );
}
