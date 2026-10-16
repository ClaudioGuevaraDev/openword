// Pestaña contextual "Encabezado y pie de página" (al editar un encabezado o pie).
import { Dismiss24Regular, NumberSymbol24Regular } from '@fluentui/react-icons';
import { useDocxEditor, useHeaderFooterState } from '@docx-editor.dev/react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { formatMeasure, parseMeasure, TWIPS_PER_CM, TWIPS_PER_INCH } from '@shared/units';
import { useUiStore } from '@renderer/state/ui-store';
import { MeasureField } from '../controls/MeasureField';
import { MenuButton } from '../controls/MenuButton';
import { RibbonButton } from '../controls/RibbonButton';
import { RibbonGroup, RibbonStack } from '../controls/RibbonGroup';
import * as rc from '../ribbon-classes';

export function HeaderFooterTab() {
  const { t } = useTranslation();
  const editor = useDocxEditor();
  const state = useHeaderFooterState();
  const unit = useUiStore((s) => s.unit);
  const language = useUiStore((s) => s.language);
  const fmt = useCallback((twips: number) => formatMeasure(twips, unit, language), [unit, language]);
  const parse = useCallback((text: string) => parseMeasure(text, unit), [unit]);
  const step = unit === 'in' ? TWIPS_PER_INCH / 10 : TWIPS_PER_CM / 10;

  // Las del menú Opciones del motor van en pulgadas fijas (app.css las oculta): aquí, en la
  // unidad de la app, como en el grupo Posición de Word.
  const distance = (key: 'headerDistanceTwips' | 'footerDistanceTwips', label: string, testId: string) => (
    <MeasureField
      label={label}
      testId={testId}
      value={state?.[key] ?? null}
      format={fmt}
      parse={parse}
      step={step}
      disabled={!state}
      onCommit={(twips) =>
        editor?.exec({ type: 'setHeaderFooterOptions', sectionIndex: state?.sectionIndex, [key]: twips })
      }
    />
  );

  const option = (key: 'titlePage' | 'evenAndOddHeaders', label: string, testId: string) => (
    <label className={rc.check}>
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
      <RibbonGroup label={t('headerFooter.position.label')}>
        <RibbonStack>
          {distance('headerDistanceTwips', t('headerFooter.position.header'), 'hf-header-distance')}
          {distance('footerDistanceTwips', t('headerFooter.position.footer'), 'hf-footer-distance')}
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
