import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
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

const STANDARD_TABS: readonly RibbonTab[] = ['home', 'insert', 'layout', 'references', 'view'];
const CONTEXTUAL_TABS: readonly RibbonTab[] = ['table', 'picture', 'headerFooter'];

/** Botón Archivo: no es una pestaña, abre la vista Archivo (Backstage) como un diálogo. */
export const FILE_BUTTON_ID = 'ribbon-file';

const tabClass =
  'tw:relative tw:cursor-pointer tw:rounded-md tw:border-0 tw:px-3 tw:py-1 tw:font-[family-name:inherit] tw:text-[13px] tw:transition-colors tw:focus-visible:outline-2 tw:focus-visible:outline-white/70 tw:aria-selected:font-semibold';

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
  const backstageOpen = useUiStore((s) => s.backstageOpen);
  const openBackstage = useUiStore((s) => s.openBackstage);
  const language = useUiStore((s) => s.language);
  const platform = useUiStore((s) => s.platform);
  const unit = useUiStore((s) => s.unit);
  const contextual = useContextualTabs();
  const previous = useRef<RibbonTab[]>([]);

  // Clave estable: el arreglo de pestañas contextuales es nuevo en cada render.
  const contextualKey = contextual.join(',');
  useEffect(() => {
    const current = contextualKey ? (contextualKey.split(',') as RibbonTab[]) : [];
    const appeared = current.filter((tab) => !previous.current.includes(tab));
    previous.current = current;
    // Al entrar a un encabezado/pie o insertar una imagen, Word muestra su pestaña.
    if (appeared.includes('headerFooter')) setActiveTab('headerFooter');
    else if (appeared.includes('picture')) setActiveTab('picture');
    // La contextual activa desapareció: Inicio también en el store, para que no vuelva sola
    // al entrar de nuevo en una tabla.
    else {
      const { activeTab: active } = useUiStore.getState();
      if (CONTEXTUAL_TABS.includes(active) && !current.includes(active)) setActiveTab('home');
    }
  }, [contextualKey, setActiveTab]);

  const tabs = [...STANDARD_TABS, ...contextual];
  // Si desaparece la pestaña contextual activa se muestra Inicio (derivado en el render, sin efecto).
  const shownTab: RibbonTab = tabs.includes(activeTab) ? activeTab : 'home';

  const onTabKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.indexOf(shownTab);
    const target =
      e.key === 'ArrowRight'
        ? tabs[(index + 1) % tabs.length]
        : e.key === 'ArrowLeft'
          ? tabs[(index - 1 + tabs.length) % tabs.length]
          : e.key === 'Home'
            ? tabs[0]
            : e.key === 'End'
              ? tabs.at(-1)
              : undefined;
    if (!target) return;
    e.preventDefault();
    setActiveTab(target);
    document.getElementById(`ribbon-tab-${target}`)?.focus();
  };
  const [tabListRef, indicatorStyle] = useTabIndicator(shownTab, tabs.length);

  const panel = () => {
    switch (shownTab) {
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
    <div className="tw:flex-none tw:bg-app tw:select-none">
      <div ref={tabListRef} className="ow-header tw:relative tw:flex tw:items-end tw:gap-0.5 tw:px-2 tw:pb-1">
        <button
          type="button"
          id={FILE_BUTTON_ID}
          data-testid="tab-file"
          aria-haspopup="dialog"
          aria-expanded={backstageOpen}
          className={cx(
            tabClass,
            'tw:mr-1 tw:bg-white/15 tw:font-semibold tw:text-on-tabbar tw:hover:bg-white/25',
          )}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => openBackstage()}
        >
          {t('tabs.file')}
        </button>
        {/* Pestañas con foco itinerante: Tab entra a la activa y las flechas recorren el resto. */}
        <div role="tablist" aria-label={t('ribbon.label')} className="tw:contents" onKeyDown={onTabKeyDown}>
          {tabs.map((tab, i) => {
            const isContextual = contextual.includes(tab);
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                id={`ribbon-tab-${tab}`}
                data-testid={`tab-${tab}`}
                aria-selected={shownTab === tab}
                aria-controls="ribbon-panel"
                tabIndex={shownTab === tab ? 0 : -1}
                className={cx(
                  tabClass,
                  isContextual
                    ? 'tw:bg-contextual/20 tw:text-contextual tw:hover:bg-contextual/30 tw:aria-selected:bg-contextual tw:aria-selected:text-on-contextual'
                    : 'tw:bg-transparent tw:text-on-tabbar/85 tw:hover:bg-white/12 tw:hover:text-on-tabbar tw:aria-selected:text-on-tabbar',
                  // Las contextuales van separadas, como en Word.
                  i === STANDARD_TABS.length && 'tw:ml-3',
                )}
                onMouseDown={(e) => e.preventDefault()} // la cinta nunca roba el cursor del documento
                onClick={() => setActiveTab(tab)}
              >
                {t(`tabs.${tab}`)}
              </button>
            );
          })}
        </div>
        {/* Subrayado coral bajo la pestaña activa: se desliza al cambiar de pestaña. */}
        <span
          className="ow-tab-indicator tw:pointer-events-none tw:absolute tw:bottom-0.5 tw:h-[3px] tw:rounded-full tw:bg-spark"
          style={indicatorStyle}
          aria-hidden="true"
        />
      </div>
      <div className="tw:px-2 tw:pt-1.5 tw:pb-2">
        <div
          key={shownTab}
          id="ribbon-panel"
          role="tabpanel"
          aria-labelledby={`ribbon-tab-${shownTab}`}
          className="ow-panel-in tw:flex tw:items-stretch tw:overflow-x-auto tw:overflow-y-hidden tw:rounded-xl tw:border tw:border-line tw:bg-ribbon tw:px-1.5 tw:pt-2 tw:shadow-card"
        >
          {panel()}
        </div>
      </div>
    </div>
  );
}

/** Posición del subrayado de la pestaña activa. */
function useTabIndicator(activeTab: RibbonTab, count: number) {
  const listRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<{ left: number; width: number; opacity: number }>({
    left: 0,
    width: 0,
    opacity: 0,
  });

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const tab = list.querySelector<HTMLElement>(`#ribbon-tab-${activeTab}`);
      if (!tab) {
        setStyle((s) => ({ ...s, opacity: 0 }));
        return;
      }
      const inset = 10;
      setStyle({ left: tab.offsetLeft + inset, width: tab.offsetWidth - inset * 2, opacity: 1 });
    };
    measure();
    // La fuente de la interfaz carga después del primer pintado y cambia el ancho de las pestañas.
    const observer = new ResizeObserver(measure);
    for (const button of list.querySelectorAll('button')) observer.observe(button);
    return () => observer.disconnect();
  }, [activeTab, count]);

  return [listRef, style] as const;
}
