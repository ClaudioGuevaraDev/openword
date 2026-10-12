// Archivo › Opciones: idioma, corrector ortográfico y recuperación automática.
import { useEffect, useState } from 'react';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';
import { mergeSettings, type SettingsPatch } from '@shared/settings';
import { useSettingsStore } from '@renderer/state/settings-store';
import { useUiStore } from '@renderer/state/ui-store';
import * as bs from './backstage-classes';

// Diccionarios que se ofrecen (si Chromium los tiene para esta plataforma).
const OFFERED = ['es', 'es-MX', 'es-ES', 'es-AR', 'es-419', 'en-US', 'en-GB', 'pt-BR', 'fr', 'de', 'it'];

export function OptionsSection() {
  const { t } = useTranslation();
  const settings = useSettingsStore((s) => s.settings);
  const [available, setAvailable] = useState<readonly string[]>([]);
  const [minutes, setMinutes] = useState(String(settings.autoRecoverMinutes));
  const platform = useUiStore((s) => s.platform);

  useEffect(() => {
    void window.openword.spell.availableLanguages().then(setAvailable);
  }, []);

  // Optimista: la interfaz cambia al momento; main valida, guarda y avisa a las demás ventanas.
  const update = (patch: SettingsPatch) => {
    const current = useSettingsStore.getState().settings;
    useSettingsStore.getState().set(
      mergeSettings(current, {
        ...current,
        ...patch,
        spellcheck: { ...current.spellcheck, ...(patch.spellcheck ?? {}) },
      }),
    );
    void window.openword.settings.update(patch);
  };

  const changeLanguage = async (value: 'auto' | 'es' | 'en') => {
    update({ uiLanguage: value });
    const info = await window.openword.app.info();
    const next = value === 'auto' ? info.uiLanguage : value;
    await i18next.changeLanguage(next);
    document.documentElement.lang = next;
    const ui = useUiStore.getState();
    ui.setEnvironment(next, ui.platform, ui.unit);
  };

  const languages = OFFERED.filter((code) => available.includes(code));
  const toggleLanguage = (code: string, on: boolean) => {
    const current = settings.spellcheck.languages;
    const next = on ? [...current, code] : current.filter((c) => c !== code);
    if (next.length > 0) update({ spellcheck: { languages: next } });
  };

  return (
    <section className={bs.content} data-testid="options">
      <h1 className={bs.title}>{t('options.title')}</h1>

      <h2>{t('options.general')}</h2>
      <label className={bs.optionRow}>
        <span>{t('options.uiLanguage')}</span>
        <select
          className={bs.optionField}
          data-testid="option-language"
          value={settings.uiLanguage}
          onChange={(e) => void changeLanguage(e.target.value as 'auto' | 'es' | 'en')}
        >
          <option value="auto">{t('options.languageAuto')}</option>
          <option value="es">Español</option>
          <option value="en">English</option>
        </select>
      </label>

      <h2>{t('options.proofing')}</h2>
      <label className={bs.optionCheck}>
        <input
          type="checkbox"
          data-testid="option-spellcheck"
          checked={settings.spellcheck.enabled}
          onChange={(e) => update({ spellcheck: { enabled: e.target.checked } })}
        />
        {t('options.checkSpelling')}
      </label>
      <label className={bs.optionCheck}>
        <input
          type="checkbox"
          checked={settings.spellcheck.ignoreUppercase}
          onChange={(e) => update({ spellcheck: { ignoreUppercase: e.target.checked } })}
        />
        {t('options.ignoreUppercase')}
      </label>
      <label className={bs.optionCheck}>
        <input
          type="checkbox"
          checked={settings.spellcheck.ignoreWithNumbers}
          onChange={(e) => update({ spellcheck: { ignoreWithNumbers: e.target.checked } })}
        />
        {t('options.ignoreNumbers')}
      </label>
      {platform === 'darwin' ? (
        <p className={bs.hint}>{t('options.macDictionaries')}</p>
      ) : (
        <fieldset className="tw:my-2 tw:grid tw:max-w-[640px] tw:grid-cols-[repeat(3,minmax(160px,1fr))] tw:rounded-lg tw:border tw:border-line tw:px-3 tw:py-2">
          <legend>{t('options.dictionaries')}</legend>
          {languages.map((code) => (
            <label key={code} className={bs.optionCheck}>
              <input
                type="checkbox"
                checked={settings.spellcheck.languages.includes(code)}
                onChange={(e) => toggleLanguage(code, e.target.checked)}
              />
              {new Intl.DisplayNames([i18next.language], { type: 'language' }).of(code) ?? code}
            </label>
          ))}
        </fieldset>
      )}

      <h2>{t('options.save')}</h2>
      <label className={bs.optionRow}>
        <span>{t('options.autoRecover')}</span>
        <input
          type="number"
          min={0}
          max={120}
          className={`${bs.optionField} tw:w-16`}
          data-testid="option-autorecover"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          onBlur={() => {
            const value = Number(minutes);
            if (Number.isInteger(value) && value >= 0 && value <= 120) update({ autoRecoverMinutes: value });
            else setMinutes(String(settings.autoRecoverMinutes));
          }}
        />
        <span>{t('options.minutes')}</span>
      </label>
      <p className={bs.hint}>{t('options.autoRecoverHint')}</p>
    </section>
  );
}
