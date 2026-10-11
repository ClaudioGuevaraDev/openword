// Pestaña contextual "Tabla" (aparece con el cursor dentro de una tabla).
import {
  BorderAll20Regular,
  TableDeleteColumn20Regular,
  TableDeleteRow20Regular,
  TableDismiss20Regular,
  TableInsertColumn20Regular,
  TableInsertRow20Regular,
  TableSimple20Regular,
  PaintBucket20Regular,
} from '@fluentui/react-icons';
import type { EditorCommand } from '@docx-editor.dev/core';
import { useDocxEditor } from '@docx-editor.dev/react';
import { useTranslation } from 'react-i18next';
import { CommandButton } from '../controls/CommandButton';
import { MenuButton } from '../controls/MenuButton';
import { RibbonGroup, RibbonStack } from '../controls/RibbonGroup';

/** Borde sencillo negro de ½ pt (tamaño en octavos de punto), el predeterminado de Word. */
const singleBorders = (scope: 'all' | 'outside' | 'inside'): EditorCommand => ({
  type: 'setTableBorders',
  scope,
  spec: { style: 'single', size: 4, color: { kind: 'hex', value: '000000' } },
});

const SHADES = [
  ['none', null],
  ['lightGray', 'D9D9D9'],
  ['gray', 'A6A6A6'],
  ['lightBlue', 'DEEAF6'],
  ['blue', 'BDD6EE'],
  ['lightGreen', 'E2EFD9'],
  ['yellow', 'FFF2CC'],
] as const;

export function TableTab() {
  const { t } = useTranslation();
  const editor = useDocxEditor();
  const borders = (scope: 'all' | 'outside' | 'inside') => editor?.exec(singleBorders(scope));
  return (
    <>
      <RibbonGroup label={t('table.rowsCols.label')}>
        <RibbonStack>
          <CommandButton
            command={{ type: 'insertRow', where: 'above' }}
            icon={<TableInsertRow20Regular />}
            label={t('table.rowsCols.rowAbove')}
            showLabel
            testId="row-above"
          />
          <CommandButton
            command={{ type: 'insertRow', where: 'below' }}
            icon={<TableInsertRow20Regular />}
            label={t('table.rowsCols.rowBelow')}
            showLabel
            testId="row-below"
          />
        </RibbonStack>
        <RibbonStack>
          <CommandButton
            command={{ type: 'insertColumn', where: 'left' }}
            icon={<TableInsertColumn20Regular />}
            label={t('table.rowsCols.colLeft')}
            showLabel
          />
          <CommandButton
            command={{ type: 'insertColumn', where: 'right' }}
            icon={<TableInsertColumn20Regular />}
            label={t('table.rowsCols.colRight')}
            showLabel
            testId="col-right"
          />
        </RibbonStack>
        <RibbonStack>
          <CommandButton
            command={{ type: 'deleteRow' }}
            icon={<TableDeleteRow20Regular />}
            label={t('table.rowsCols.deleteRow')}
            showLabel
            testId="delete-row"
          />
          <CommandButton
            command={{ type: 'deleteColumn' }}
            icon={<TableDeleteColumn20Regular />}
            label={t('table.rowsCols.deleteCol')}
            showLabel
          />
          <CommandButton
            command={{ type: 'deleteTable' }}
            icon={<TableDismiss20Regular />}
            label={t('table.rowsCols.deleteTable')}
            showLabel
            testId="delete-table"
          />
        </RibbonStack>
      </RibbonGroup>
      <RibbonGroup label={t('table.style.label')}>
        <RibbonStack>
          <CommandButton
            command={{ type: 'toggleHeaderRow' }}
            toggle
            icon={<TableSimple20Regular />}
            label={t('table.style.headerRow')}
            showLabel
          />
          <MenuButton
            size="small"
            icon={<BorderAll20Regular />}
            label={t('table.style.borders')}
            testId="table-borders"
            entries={[
              { id: 'all', label: t('table.style.bordersAll'), onSelect: () => borders('all') },
              { id: 'outside', label: t('table.style.bordersOutside'), onSelect: () => borders('outside') },
              { id: 'inside', label: t('table.style.bordersInside'), onSelect: () => borders('inside') },
              {
                id: 'none',
                label: t('table.style.bordersNone'),
                onSelect: () => editor?.exec({ type: 'setTableBorders', scope: 'none', target: 'all' }),
              },
            ]}
          />
          <MenuButton
            size="small"
            icon={<PaintBucket20Regular />}
            label={t('table.style.shading')}
            entries={SHADES.map(([id, hex]) => ({
              id,
              label: t(`table.shades.${id}`),
              onSelect: () =>
                editor?.exec({ type: 'setCellFill', color: hex ? { kind: 'hex', value: hex } : null }),
            }))}
          />
        </RibbonStack>
      </RibbonGroup>
    </>
  );
}
