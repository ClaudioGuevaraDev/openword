import { useTranslation } from 'react-i18next';
import { useUiStore, type RibbonTab } from '@renderer/state/ui-store';
import { HomeTab } from './tabs/HomeTab';
import styles from './Ribbon.module.css';

const TABS: readonly RibbonTab[] = ['file', 'home', 'insert', 'layout', 'references', 'view'];

export function Ribbon() {
  const { t } = useTranslation();
  const activeTab = useUiStore((s) => s.activeTab);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const language = useUiStore((s) => s.language);
  const platform = useUiStore((s) => s.platform);

  return (
    <div className={styles.ribbon}>
      <div className={styles.tabbar} role="tablist" aria-label={t('ribbon.label')}>
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`ribbon-tab-${tab}`}
            aria-selected={activeTab === tab}
            aria-controls="ribbon-panel"
            className={tab === 'file' ? `${styles.tab} ${styles.fileTab}` : styles.tab}
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
        {activeTab === 'home' || activeTab === 'file' ? (
          <HomeTab language={language} platform={platform} />
        ) : (
          <span className={styles.comingSoon}>{t('ribbon.comingSoon')}</span>
        )}
      </div>
    </div>
  );
}
