import { useEffect, useRef } from 'react';
import { useEditorState, useHeaderFooterState } from '@docx-editor.dev/react';
import { useTranslation } from 'react-i18next';
import { useUiStore, type RibbonTab } from '@renderer/state/ui-store';
import { HeaderFooterTab } from './contextual/HeaderFooterTab';
import { PictureTab } from './contextual/PictureTab';
import { TableTab } from './contextual/TableTab';
import { HomeTab } from './tabs/HomeTab';
import { InsertTab } from './tabs/InsertTab';
import { LayoutTab } from './tabs/LayoutTab';
import { ReferencesTab } from './tabs/ReferencesTab';
import { ViewTab } from './tabs/ViewTab';
import { cx } from '@renderer/ui/cx';

const STANDARD_TABS: readonly RibbonTab[] = ['file', 'home', 'insert', 'layout', 'references', 'view'];

/** Pestañas contextuales visibles según la selección, como en Word. */
function useContextualTabs(): RibbonTab[] {
  const inTable = useEditorState((s) => s.table !== null);
  const imageSelected = useEditorState((s) => s.image !== null);
  const headerFooter = useHeaderFooterState();
  const tabs: RibbonTab[] = [];
  if (headerFooter?.editing) tabs.push('headerFooter');
  if (inTable) tabs.push('table');
  if (imageSelected) tabs.push('picture');
  return tabs;
}

export function Ribbon() {
  const { t } = useTranslation();
  const activeTab = useUiStore((s) => s.activeTab);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const language = useUiStore((s) => s.language);
  const platform = useUiStore((s) => s.platform);
  const unit = useUiStore((s) => s.unit);
  const contextual = useContextualTabs();
  const previous = useRef<RibbonTab[]>([]);

  useEffect(() => {
    const appeared = contextual.filter((tab) => !previous.current.includes(tab));
    previous.current = contextual;
    // Al entrar a un encabezado/pie o insertar una imagen, Word muestra su pestaña.
    if (appeared.includes('headerFooter')) setActiveTab('headerFooter');
    else if (appeared.includes('picture')) setActiveTab('picture');
    // Si desaparece la pestaña contextual activa, se vuelve a Inicio.
    else if (['table', 'picture', 'headerFooter'].includes(activeTab) && !contextual.includes(activeTab))
      setActiveTab('home');
  }, [contextual, activeTab, setActiveTab]);

  const tabs = [...STANDARD_TABS, ...contextual];

  const panel = () => {
    switch (activeTab) {
      case 'insert':
        return <InsertTab language={language} platform={platform} />;
      case 'layout':
        return <LayoutTab language={language} unit={unit} />;
      case 'references':
        return <ReferencesTab language={language} platform={platform} />;
      case 'table':
        return <TableTab />;
      case 'picture':
        return <PictureTab />;
      case 'headerFooter':
        return <HeaderFooterTab />;
      case 'view':
        return <ViewTab />;
      default:
        return <HomeTab language={language} platform={platform} />;
    }
  };

  return (
    <div className="tw:flex-none tw:border-b tw:border-line tw:bg-ribbon tw:select-none">
      <div
        className="tw:flex tw:gap-0.5 tw:bg-tabbar tw:px-2 tw:pt-1"
        role="tablist"
        aria-label={t('ribbon.label')}
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`ribbon-tab-${tab}`}
            data-testid={`tab-${tab}`}
            aria-selected={activeTab === tab}
            aria-controls="ribbon-panel"
            className={cx(
              'tw:cursor-pointer tw:rounded-t tw:border-0 tw:bg-transparent tw:px-3.5 tw:py-1.5 tw:font-[family-name:inherit] tw:text-[length:inherit] tw:hover:bg-white/15 tw:aria-selected:bg-tab-active tw:aria-selected:font-semibold',
              tab === 'file' && 'tw:font-semibold',
              contextual.includes(tab)
                ? 'tw:text-[#fff3c4] tw:aria-selected:text-[#8a5a00] tw:dark:aria-selected:text-[#f0c060]'
                : 'tw:text-on-tabbar tw:aria-selected:text-on-tab-active',
            )}
            onMouseDown={(e) => e.preventDefault()} // la cinta nunca roba el cursor del documento
            onClick={() => setActiveTab(tab)}
          >
            {t(`tabs.${tab}`)}
          </button>
        ))}
      </div>
      <div
        id="ribbon-panel"
        role="tabpanel"
        aria-labelledby={`ribbon-tab-${activeTab}`}
        className="tw:flex tw:min-h-[92px] tw:items-stretch tw:overflow-x-auto tw:px-1 tw:pt-1"
      >
        {panel()}
      </div>
    </div>
  );
}
