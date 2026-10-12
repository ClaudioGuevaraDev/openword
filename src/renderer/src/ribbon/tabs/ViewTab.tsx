// Pestaña Vista: Vistas, Mostrar (regla, panel de navegación, ¶), Zoom y Tema.
import {
  ArrowAutofitWidth24Regular,
  DarkTheme24Regular,
  DocumentOnePage24Regular,
  DocumentText24Regular,
  TextParagraph20Regular,
  ZoomIn24Regular,
} from '@fluentui/react-icons';
import { useDocxEditor, useZoom } from '@docx-editor.dev/react';
import { useTranslation } from 'react-i18next';
import { useUiStore, type ThemePreference } from '@renderer/state/ui-store';
import { CommandButton } from '../controls/CommandButton';
import { MenuButton } from '../controls/MenuButton';
import { RibbonButton } from '../controls/RibbonButton';
import { RibbonGroup, RibbonStack } from '../controls/RibbonGroup';
import * as rc from '../ribbon-classes';

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function ViewTab() {
  const { t } = useTranslation();
  const editor = useDocxEditor();
  const zoom = useZoom();
  const ui = useUiStore();

  /** "Una página": el zoom con el que la primera página entra completa en el área visible. */
  const fitOnePage = () => {
    // Tamaño real de la página en pantalla dividido por el zoom actual = tamaño al 100 %.
    const page = document.querySelector<HTMLElement>('.docx-page');
    const viewport = page?.closest<HTMLElement>('.docx-editor__scroll-container');
    if (!page || !viewport) return;
    const rect = page.getBoundingClientRect();
    const scaleNow = zoom.zoom || 1;
    const fit = Math.min(
      (viewport.clientHeight - 48) / (rect.height / scaleNow),
      (viewport.clientWidth - 48) / (rect.width / scaleNow),
    );
    zoom.setZoom(Math.max(0.1, Math.floor(fit * 100) / 100));
    editor?.focus();
  };

  const themes: ThemePreference[] = ['system', 'light', 'dark'];

  return (
    <>
      <RibbonGroup label={t('view.views.label')}>
        <RibbonButton
          size="large"
          icon={<DocumentText24Regular />}
          label={t('view.views.printLayout')}
          pressed
        />
      </RibbonGroup>

      <RibbonGroup label={t('view.show.label')}>
        <RibbonStack>
          <label className={rc.check}>
            <input
              type="checkbox"
              data-testid="show-ruler"
              checked={ui.showRulers}
              onChange={(e) => ui.setShowRulers(e.target.checked)}
            />
            {t('view.show.ruler')}
          </label>
          <label className={rc.check}>
            <input
              type="checkbox"
              data-testid="show-navigation"
              checked={ui.navigationOpen}
              onChange={(e) => ui.setNavigation(e.target.checked, 'headings')}
            />
            {t('view.show.navigation')}
          </label>
          <CommandButton
            command="review.paragraphMarks"
            toggle
            icon={<TextParagraph20Regular />}
            label={t('home.paragraph.marks')}
            showLabel
          />
        </RibbonStack>
      </RibbonGroup>

      <RibbonGroup label={t('view.zoom.label')}>
        <MenuButton
          icon={<ZoomIn24Regular />}
          label={t('view.zoom.zoom')}
          testId="view-zoom"
          entries={ZOOM_LEVELS.map((level) => ({
            id: String(level),
            label: `${Math.round(level * 100)} %`,
            checked: Math.abs(zoom.zoom - level) < 0.005,
            onSelect: () => zoom.setZoom(level),
          }))}
        />
        <RibbonButton
          size="large"
          icon={<span className="tw:text-[18px] tw:leading-8 tw:font-semibold">100</span>}
          label="100 %"
          onClick={() => zoom.setZoom(1)}
          testId="zoom-100"
        />
        <RibbonStack>
          <RibbonButton
            icon={<DocumentOnePage24Regular />}
            label={t('view.zoom.onePage')}
            showLabel
            onClick={fitOnePage}
            testId="zoom-one-page"
          />
          <RibbonButton
            icon={<ArrowAutofitWidth24Regular />}
            label={t('view.zoom.pageWidth')}
            showLabel
            onClick={zoom.fitToWidth}
            testId="zoom-page-width"
          />
        </RibbonStack>
      </RibbonGroup>

      <RibbonGroup label={t('view.theme.label')}>
        <MenuButton
          icon={<DarkTheme24Regular />}
          label={t('view.theme.button')}
          testId="view-theme"
          entries={themes.map((theme) => ({
            id: theme,
            label: t(`view.theme.${theme}`),
            checked: ui.theme === theme,
            onSelect: () => ui.setTheme(theme),
          }))}
        />
      </RibbonGroup>
    </>
  );
}
