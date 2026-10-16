// Campo de medida para las filas de los diálogos del motor (Párrafo, Configurar página), en la
// unidad de la app: el motor solo sabe pulgadas.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { twipsToUnit, unitToTwips } from '@shared/units';
import { useUiStore } from '@renderer/state/ui-store';

/** Valor en la unidad de la app, con dos decimales como mucho (lo que acepta el campo). */
function shownValue(twips: number, unit: 'cm' | 'in'): string {
  return String(Math.round(twipsToUnit(twips, unit) * 100) / 100);
}

export function MeasureInput({
  id,
  label,
  value,
  placeholder,
  onChange,
  tabEntry = false,
}: {
  readonly id: string;
  readonly label: string;
  /** Medida en twips; null si la selección tiene valores distintos (se ve `placeholder`). */
  readonly value: number | null;
  readonly placeholder?: string;
  readonly onChange: (twips: number) => void;
  /** Campo de la sección Tabulaciones: Enter fija la tabulación en vez de aceptar. */
  readonly tabEntry?: boolean;
}) {
  const { t } = useTranslation();
  const unit = useUiStore((s) => s.unit);
  // Mientras se escribe se conserva el texto tal cual ("1.0" no debe volverse "1" a medias).
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <>
      <label className="docx-dialog__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        className="docx-dialog__input"
        min={0}
        step={0.1}
        value={draft ?? (value === null ? '' : shownValue(value, unit))}
        placeholder={value === null ? placeholder : undefined}
        aria-label={label}
        data-docx-tab-entry={tabEntry ? '' : undefined}
        onChange={(e) => {
          setDraft(e.target.value);
          const number = Number(e.target.value);
          if (e.target.value !== '' && Number.isFinite(number))
            onChange(Math.max(0, unitToTwips(number, unit)));
        }}
        onBlur={() => setDraft(null)}
      />
      <span className="docx-dialog__unit">{t(`units.${unit}`)}</span>
    </>
  );
}
