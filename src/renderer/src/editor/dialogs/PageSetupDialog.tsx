// Configurar página del motor con los márgenes en la unidad de la app. El resto de filas
// (tamaño, orientación, "Aplicar a") son las del motor; los nombres de los tamaños se traducen
// en la unidad de la app desde EditorHost (page-sizes.ts).
import { DocxEditor, useChromeTranslate, usePageSetupDialog } from '@docx-editor.dev/react';
import { useId } from 'react';
import { MeasureInput } from './MeasureInput';

const MARGINS = [
  ['marginTop', 'top'],
  ['marginBottom', 'bottom'],
  ['marginLeft', 'left'],
  ['marginRight', 'right'],
] as const;

function MarginInput({
  field,
  labelKey,
}: {
  readonly field: (typeof MARGINS)[number][0];
  readonly labelKey: string;
}) {
  const t = useChromeTranslate();
  const dialog = usePageSetupDialog();
  const id = useId();
  return (
    <MeasureInput
      id={id}
      label={t(`dialogs.pageSetup.${labelKey}`)}
      value={dialog.values[field]}
      onChange={(twips) => dialog.setValue(field, twips)}
    />
  );
}

export function PageSetupDialog({ open, onClose }: { readonly open: boolean; readonly onClose: () => void }) {
  const D = DocxEditor.PageSetupDialog;
  return (
    <D open={open} onClose={onClose}>
      {MARGINS.map(([field, labelKey]) => (
        <D.Field key={field} name={field}>
          <MarginInput field={field} labelKey={labelKey} />
        </D.Field>
      ))}
    </D>
  );
}
