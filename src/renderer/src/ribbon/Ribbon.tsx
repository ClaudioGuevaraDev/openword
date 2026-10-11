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
import styles from './Ribbon.module.css';

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
        return <span className={styles.comingSoon}>{t('ribbon.comingSoon')}</span>;
      default:
        return <HomeTab language={language} platform={platform} />;
    }
  };

  return (
    <div className={styles.ribbon}>
      <div className={styles.tabbar} role="tablist" aria-label={t('ribbon.label')}>
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`ribbon-tab-${tab}`}
            data-testid={`tab-${tab}`}
            aria-selected={activeTab === tab}
            aria-controls="ribbon-panel"
            className={[
              styles.tab,
              tab === 'file' ? styles.fileTab : '',
              contextual.includes(tab) ? styles.contextTab : '',
            ].join(' ')}
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
        className={styles.panel}
      >
        {panel()}
      </div>
    </div>
  );
}
