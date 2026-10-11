import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { UiLanguage } from '@shared/ipc-contract';
import es from './locales/es.json';
import en from './locales/en.json';

export async function initI18n(language: UiLanguage): Promise<void> {
  await i18next.use(initReactI18next).init({
    lng: language,
    fallbackLng: 'es',
    resources: { es: { translation: es }, en: { translation: en } },
    interpolation: { escapeValue: false }, // React ya escapa
    returnNull: false,
  });
  document.documentElement.lang = language;
}
