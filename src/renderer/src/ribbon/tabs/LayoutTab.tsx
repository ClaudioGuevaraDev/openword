// Pestaña Disposición: Configurar página (márgenes, orientación, tamaño, saltos) y Párrafo.
import {
  DocumentLandscape24Regular,
  DocumentMargins24Regular,
  DocumentOnePage24Regular,
  DocumentSplitHint24Regular,
} from '@fluentui/react-icons';
import { useDocxEditor, usePageSetup, useParagraphFormat } from '@docx-editor.dev/react';
import { commandForSlot } from '@docx-editor.dev/core';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  formatMeasure,
  MARGIN_PRESETS,
  PAPER_SIZES,
  parseMeasure,
  TWIPS_PER_CM,
  TWIPS_PER_INCH,
  type MeasureUnit,
} from '@shared/units';
import { useUiStore } from '@renderer/state/ui-store';
import { MeasureField } from '../controls/MeasureField';
import { MenuButton } from '../controls/MenuButton';
import { RibbonGroup, RibbonStack } from '../controls/RibbonGroup';

const near = (a: number, b: number) => Math.abs(a - b) <= 20; // 1 pt de tolerancia

export function LayoutTab({
  language,
  unit,
}: {
  readonly language: 'es' | 'en';
  readonly unit: MeasureUnit;
}) {
  const { t } = useTranslation();
  const editor = useDocxEditor();
  const { pageSetup, apply, isEnabled } = usePageSetup();
  const paragraph = useParagraphFormat();
  const openPageSetupDialog = useUiStore((s) => s.openPageSetupDialog);
  const fmt = useCallback((twips: number) => formatMeasure(twips, unit, language), [unit, language]);
  const parse = useCallback((text: string) => parseMeasure(text, unit), [unit]);
  const fmtPt = useCallback(
    (pt: number) => `${language === 'es' ? String(pt).replace('.', ',') : pt} ${t('units.pt')}`,
    [language, t],
  );
  const parsePt = useCallback((text: string) => {
    const n = Number(text.replace(',', '.').replace(/\s*(pto|pt)\.?$/i, ''));
    return Number.isFinite(n) ? n : null;
  }, []);
  const step = unit === 'in' ? TWIPS_PER_INCH / 10 : TWIPS_PER_CM / 10;

  const margins = pageSetup?.marginsTwips;
  const marginEntries = (Object.keys(MARGIN_PRESETS) as (keyof typeof MARGIN_PRESETS)[]).map((key) => {
    const m = MARGIN_PRESETS[key];
    return {
      id: key,
      label: t(`layout.margins.${key}`),
      detail: t('layout.margins.detail', {
        top: fmt(m.top),
        bottom: fmt(m.bottom),
        left: fmt(m.left),
        right: fmt(m.right),
      }),
      checked:
        !!margins &&
        near(margins.top, m.top) &&
        near(margins.bottom, m.bottom) &&
        near(margins.left, m.left) &&
        near(margins.right, m.right),
      onSelect: () =>
        apply({
          marginTopTwips: m.top,
          marginBottomTwips: m.bottom,
          marginLeftTwips: m.left,
          marginRightTwips: m.right,
        }),
    };
  });

  const portraitWidth = pageSetup ? Math.min(pageSetup.pageWidthTwips, pageSetup.pageHeightTwips) : 0;
  const portraitHeight = pageSetup ? Math.max(pageSetup.pageWidthTwips, pageSetup.pageHeightTwips) : 0;
  const sizeEntries = (Object.keys(PAPER_SIZES) as (keyof typeof PAPER_SIZES)[]).map((key) => {
    const size = PAPER_SIZES[key];
    const landscape = pageSetup?.orientation === 'landscape';
    return {
      id: key,
      label: t(`layout.size.${key}`),
      detail: `${fmt(size.width)} × ${fmt(size.height)}`,
      checked: near(portraitWidth, size.width) && near(portraitHeight, size.height),
      onSelect: () =>
        apply({
          pageWidthTwips: landscape ? size.height : size.width,
          pageHeightTwips: landscape ? size.width : size.height,
        }),
    };
  });

  const exec = (slot: Parameters<typeof commandForSlot>[0]) => {
    const command = commandForSlot(slot);
    if (command) editor?.exec(command);
    editor?.focus();
  };

  const format = paragraph.format;
  return (
    <>
      <RibbonGroup
        label={t('layout.pageSetup.label')}
        onLauncher={openPageSetupDialog}
        launcherLabel={t('layout.pageSetup.dialog')}
      >
        <MenuButton
          icon={<DocumentMargins24Regular />}
          label={t('layout.margins.label')}
          disabled={!isEnabled}
          testId="layout-margins"
          entries={[
            ...marginEntries,
            {
              id: 'custom',
              label: t('layout.margins.custom'),
              separatorBefore: true,
              opensDialog: true,
              onSelect: openPageSetupDialog,
            },
          ]}
        />
        <MenuButton
          icon={<DocumentLandscape24Regular />}
          label={t('layout.orientation.label')}
          disabled={!isEnabled}
          testId="layout-orientation"
          entries={[
            {
              id: 'portrait',
              label: t('layout.orientation.portrait'),
              checked: pageSetup?.orientation === 'portrait',
              onSelect: () => apply({ orientation: 'portrait' }),
            },
            {
              id: 'landscape',
              label: t('layout.orientation.landscape'),
              checked: pageSetup?.orientation === 'landscape',
              onSelect: () => apply({ orientation: 'landscape' }),
            },
          ]}
        />
        <MenuButton
          icon={<DocumentOnePage24Regular />}
          label={t('layout.size.label')}
          disabled={!isEnabled}
          testId="layout-size"
          entries={[
            ...sizeEntries,
            {
              id: 'more',
              label: t('layout.size.more'),
              separatorBefore: true,
              opensDialog: true,
              onSelect: openPageSetupDialog,
            },
          ]}
        />
        <MenuButton
          icon={<DocumentSplitHint24Regular />}
          label={t('layout.breaks.label')}
          testId="layout-breaks"
          entries={[
            {
              id: 'page',
              label: t('layout.breaks.page'),
              detail: t('layout.breaks.pageDetail'),
              onSelect: () => exec('insert.pageBreak'),
            },
            {
              id: 'next',
              label: t('layout.breaks.nextPage'),
              detail: t('layout.breaks.nextPageDetail'),
              separatorBefore: true,
              onSelect: () => exec('insert.sectionBreakNextPage'),
            },
            {
              id: 'continuous',
              label: t('layout.breaks.continuous'),
              detail: t('layout.breaks.continuousDetail'),
              onSelect: () => exec('insert.sectionBreakContinuous'),
            },
          ]}
        />
      </RibbonGroup>

      <RibbonGroup label={t('layout.paragraph.label')}>
        <RibbonStack>
          <span className="tw:text-[11px] tw:font-semibold tw:text-muted">
            {t('layout.paragraph.indent')}
          </span>
          <MeasureField
            label={t('layout.paragraph.left')}
            testId="indent-left"
            value={format?.indentLeftTwips ?? (format ? 0 : null)}
            format={fmt}
            parse={parse}
            step={step}
            disabled={!paragraph.isEnabled}
            onCommit={(v) => paragraph.apply({ indentLeftTwips: v })}
          />
          <MeasureField
            label={t('layout.paragraph.right')}
            value={format?.indentRightTwips ?? (format ? 0 : null)}
            format={fmt}
            parse={parse}
            step={step}
            disabled={!paragraph.isEnabled}
            onCommit={(v) => paragraph.apply({ indentRightTwips: v })}
          />
        </RibbonStack>
        <RibbonStack>
          <span className="tw:text-[11px] tw:font-semibold tw:text-muted">
            {t('layout.paragraph.spacing')}
          </span>
          <MeasureField
            label={t('layout.paragraph.before')}
            testId="space-before"
            value={format?.spaceBeforePt ?? (format ? 0 : null)}
            format={fmtPt}
            parse={parsePt}
            step={6}
            disabled={!paragraph.isEnabled}
            onCommit={(v) => paragraph.apply({ spaceBeforePt: v })}
          />
          <MeasureField
            label={t('layout.paragraph.after')}
            value={format?.spaceAfterPt ?? (format ? 0 : null)}
            format={fmtPt}
            parse={parsePt}
            step={6}
            disabled={!paragraph.isEnabled}
            onCommit={(v) => paragraph.apply({ spaceAfterPt: v })}
          />
        </RibbonStack>
      </RibbonGroup>
    </>
  );
}
