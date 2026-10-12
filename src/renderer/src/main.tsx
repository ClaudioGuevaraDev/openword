import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { unitForRegion } from '@shared/units';
import { setRecoverIntervalOverride } from './editor/DocumentSession';
import { initI18n } from './i18n';
import { useSettingsStore } from './state/settings-store';
import { useUiStore } from './state/ui-store';
import './styles/app.css';

async function bootstrap(): Promise<void> {
  const [info, settings] = await Promise.all([window.openword.app.info(), window.openword.settings.get()]);
  useSettingsStore.getState().set(settings);
  if (info.autoRecoverIntervalMs) setRecoverIntervalOverride(info.autoRecoverIntervalMs);
  window.openword.settings.onChange((next) => useSettingsStore.getState().set(next));
  await initI18n(info.uiLanguage);
  useUiStore
    .getState()
    .setEnvironment(
      info.uiLanguage,
      info.platform === 'darwin' ? 'darwin' : 'other',
      unitForRegion(info.region),
    );

  const root = document.getElementById('root');
  if (!root) throw new Error('Falta #root');
  createRoot(root).render(
    <StrictMode>
      <App info={info} />
    </StrictMode>,
  );
}

void bootstrap();
