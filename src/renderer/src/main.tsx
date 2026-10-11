import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { unitForRegion } from '@shared/units';
import { initI18n } from './i18n';
import { useUiStore } from './state/ui-store';
import './styles/tokens.css';

async function bootstrap(): Promise<void> {
  const info = await window.openword.app.info();
  await initI18n(info.uiLanguage);
  useUiStore
    .getState()
    .setEnvironment(
      info.uiLanguage,
      info.platform === 'darwin' ? 'darwin' : 'other',
      unitForRegion(info.region),
    );

  const dark = window.matchMedia('(prefers-color-scheme: dark)');
  const applyTheme = () => (document.documentElement.dataset['theme'] = dark.matches ? 'dark' : 'light');
  applyTheme();
  dark.addEventListener('change', applyTheme);

  const root = document.getElementById('root');
  if (!root) throw new Error('Falta #root');
  createRoot(root).render(
    <StrictMode>
      <App info={info} />
    </StrictMode>,
  );
}

void bootstrap();
