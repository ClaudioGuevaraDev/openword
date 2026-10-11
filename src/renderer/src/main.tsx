import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initI18n } from './i18n';
import './styles/tokens.css';

async function bootstrap(): Promise<void> {
  const info = await window.openword.app.info();
  await initI18n(info.uiLanguage);

  const dark = window.matchMedia('(prefers-color-scheme: dark)');
  const applyTheme = () => (document.documentElement.dataset['theme'] = dark.matches ? 'dark' : 'light');
  applyTheme();
  dark.addEventListener('change', applyTheme);

  const root = document.getElementById('root');
  if (!root) throw new Error('Falta #root');
  createRoot(root).render(
    <StrictMode>
      <App language={info.uiLanguage} />
    </StrictMode>,
  );
}

void bootstrap();
