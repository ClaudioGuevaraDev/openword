import { useTranslation } from 'react-i18next';
import { useUiStore, type RibbonTab } from '@renderer/state/ui-store';
import styles from './Ribbon.module.css';

const TABS: readonly RibbonTab[] = ['file', 'home', 'insert', 'layout', 'references', 'view'];

export function Ribbon() {
  const { t } = useTranslation();
  const activeTab = useUiStore((s) => s.activeTab);
  const setActiveTab = useUiStore((s) => s.setActiveTab);

  return (
    <div className={styles.ribbon}>
      <div className={styles.tabbar} role="tablist" aria-label="Cinta de opciones">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`ribbon-tab-${tab}`}
            aria-selected={activeTab === tab}
            aria-controls="ribbon-panel"
            className={styles.tab}
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
        {t('ribbon.comingSoon')}
      </div>
    </div>
  );
}
