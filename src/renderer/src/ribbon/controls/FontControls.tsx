// Fuente y tamaño, como los cuadros de Inicio › Fuente en Word.
import { useEffect, useMemo, useState } from 'react';
import { useDocxEditor, useEditorValueCommand, useFontFamily } from '@docx-editor.dev/react';
import { useTranslation } from 'react-i18next';
import { FONT_SIZE_PRESETS, formatFontSize, parseFontSize } from '@shared/font-size';
import { ComboBox, type ComboOption } from './ComboBox';

let systemFamilies: Promise<readonly string[]> | undefined;
const loadSystemFamilies = () => (systemFamilies ??= window.openword.fonts.families().catch(() => []));

export function FontFamilyBox() {
  const { t } = useTranslation();
  const editor = useDocxEditor();
  const font = useFontFamily();
  const [system, setSystem] = useState<readonly string[]>([]);

  useEffect(() => {
    void loadSystemFamilies().then(setSystem);
  }, []);

  const options = useMemo<ComboOption[]>(() => {
    const fromDocument = font.options;
    const known = new Set(fromDocument.map((f) => f.toLowerCase()));
    const others = system.filter((f) => !known.has(f.toLowerCase()));
    return [
      { kind: 'heading', label: t('home.font.documentFonts') },
      ...fromDocument.map((f) => ({ value: f, label: f, style: { fontFamily: `"${f}"` } })),
      ...(others.length ? [{ kind: 'heading' as const, label: t('home.font.allFonts') }] : []),
      ...others.map((f) => ({ value: f, label: f, style: { fontFamily: `"${f}"` } })),
    ];
  }, [font.options, system, t]);

  return (
    <ComboBox
      label={t('home.font.family')}
      testId="font-family"
      width={156}
      value={font.value ?? ''}
      options={options}
      disabled={!font.isEnabled}
      onCommit={(family) => {
        font.setValue(family);
        editor?.focus();
      }}
    />
  );
}

export function FontSizeBox({ language }: { readonly language: 'es' | 'en' }) {
  const { t } = useTranslation();
  const editor = useDocxEditor();
  const size = useEditorValueCommand('font.size'); // medios puntos
  const options = useMemo<ComboOption[]>(
    () => FONT_SIZE_PRESETS.map((pt) => ({ value: String(pt), label: formatFontSize(pt, language) })),
    [language],
  );
  return (
    <ComboBox
      label={t('home.font.size')}
      testId="font-size"
      width={62}
      filter={false}
      value={size.value === null ? '' : formatFontSize(size.value / 2, language)}
      options={options}
      disabled={!size.isEnabled}
      onCommit={(raw) => {
        const points = parseFontSize(raw);
        if (points !== null) size.execute(points * 2);
        editor?.focus();
      }}
    />
  );
}
