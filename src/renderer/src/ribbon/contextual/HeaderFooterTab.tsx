// Pestaña contextual "Encabezado y pie de página" (al editar un encabezado o pie).
import { Dismiss24Regular, NumberSymbol24Regular } from '@fluentui/react-icons';
import { useDocxEditor, useHeaderFooterState } from '@docx-editor.dev/react';
import { useTranslation } from 'react-i18next';
import { MenuButton } from '../controls/MenuButton';
import { RibbonButton } from '../controls/RibbonButton';
import { RibbonGroup, RibbonStack } from '../controls/RibbonGroup';
import styles from '../Ribbon.module.css';

export function HeaderFooterTab() {
  const { t } = useTranslation();
  const editor = useDocxEditor();
  const state = useHeaderFooterState();

  const option = (key: 'titlePage' | 'evenAndOddHeaders', label: string, testId: string) => (
    <label className={styles.check}>
      <input
        type="checkbox"
        data-testid={testId}
        checked={Boolean(state?.[key])}
        onChange={(e) =>
          editor?.exec({
            type: 'setHeaderFooterOptions',
            sectionIndex: state?.sectionIndex,
            [key]: e.target.checked,
          })
        }
      />
      {label}
    </label>
  );

  return (
    <>
      <RibbonGroup label={t('headerFooter.insert.label')}>
        <MenuButton
          icon={<NumberSymbol24Regular />}
          label={t('insert.headerFooter.pageNumber')}
          entries={[
            {
              id: 'page',
              label: t('headerFooter.insert.page'),
              onSelect: () => editor?.exec({ type: 'insertPageField', field: 'PAGE' }),
            },
            {
              id: 'total',
              label: t('headerFooter.insert.total'),
              onSelect: () => editor?.exec({ type: 'insertPageField', field: 'NUMPAGES' }),
            },
            {
              id: 'xofy',
              label: t('insert.headerFooter.pageXofY'),
              onSelect: () => editor?.exec({ type: 'insertPageField', field: 'PAGE_X_OF_Y' }),
            },
          ]}
        />
      </RibbonGroup>
      <RibbonGroup label={t('headerFooter.options.label')}>
        <RibbonStack>
          {option('titlePage', t('headerFooter.options.firstPage'), 'hf-first-page')}
          {option('evenAndOddHeaders', t('headerFooter.options.evenOdd'), 'hf-even-odd')}
        </RibbonStack>
      </RibbonGroup>
      <RibbonGroup label={t('headerFooter.close.label')}>
        <RibbonButton
          size="large"
          icon={<Dismiss24Regular />}
          label={t('headerFooter.close.button')}
          testId="hf-close"
          onClick={() => editor?.exec({ type: 'exitHeaderFooter' })}
        />
      </RibbonGroup>
    </>
  );
}
