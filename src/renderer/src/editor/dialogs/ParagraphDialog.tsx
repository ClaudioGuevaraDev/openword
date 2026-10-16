// Párrafo del motor con sangrías y tabulaciones en la unidad de la app. Se sustituyen solo esas
// filas (por nombre, en su sitio); el resto del diálogo, el borrador y "Aceptar" son del motor.
import { DocxEditor, useChromeTranslate, useParagraphDialog } from '@docx-editor.dev/react';
import {
  TAB_ALIGNMENT_LABELS,
  withTabStop,
  type TabAlignment,
  type TabLeaderName,
} from '@docx-editor.dev/core/editor';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatMeasure } from '@shared/units';
import { useUiStore } from '@renderer/state/ui-store';
import { MeasureInput } from './MeasureInput';

const TAB_ALIGNMENTS = ['left', 'center', 'right', 'decimal'] as const satisfies readonly TabAlignment[];
const TAB_LEADERS = {
  none: 'tabNone',
  dot: 'tabLeaderDot',
  hyphen: 'tabLeaderHyphen',
  underscore: 'tabLeaderUnderscore',
} as const satisfies Record<TabLeaderName, string>;

function IndentInput({
  field,
  labelKey,
}: {
  readonly field: 'indentLeft' | 'indentRight' | 'specialBy';
  readonly labelKey: string;
}) {
  const t = useChromeTranslate();
  const dialog = useParagraphDialog();
  const id = useId();
  const mixed = field === 'specialBy' ? dialog.mixed.special : dialog.mixed[field];
  return (
    <MeasureInput
      id={id}
      label={t(`dialogs.paragraph.${labelKey}`)}
      value={mixed ? null : dialog.values[field]}
      placeholder={t('dialogs.paragraph.mixed')}
      onChange={(twips) => dialog.setValue(field, twips)}
    />
  );
}

/** Sección Tabulaciones: la lista y el alta, como la del motor pero en la unidad de la app. */
function TabStops() {
  const t = useChromeTranslate();
  const { t: tApp } = useTranslation();
  const unit = useUiStore((s) => s.unit);
  const language = useUiStore((s) => s.language);
  const dialog = useParagraphDialog();
  const id = useId();
  const [position, setPosition] = useState(0);
  const [alignment, setAlignment] = useState<TabAlignment>('left');
  const [leader, setLeader] = useState<TabLeaderName>('none');
  const stops = dialog.values.tabStops;

  const add = () => {
    const positionTwips = Math.round(position);
    if (positionTwips <= 0) return;
    dialog.setValue(
      'tabStops',
      withTabStop(stops, { positionTwips, alignment, ...(leader !== 'none' ? { leader } : {}) }),
    );
    setPosition(0);
    setAlignment('left');
    setLeader('none');
  };

  return (
    // display: contents: las filas siguen siendo hijas directas de la sección del motor (su CSS
    // las separa); el div solo escucha el teclado.
    <div
      className="tw:contents"
      onKeyDown={(e) => {
        // Enter en el alta fija la tabulación; el diálogo ignora Enter en estos campos.
        if (
          e.key === 'Enter' &&
          e.target instanceof HTMLElement &&
          e.target.dataset['docxTabEntry'] !== undefined
        )
          add();
      }}
    >
      <div className="docx-dialog__section-label">{t('dialogs.paragraph.tabStops')}</div>
      {stops.length === 0 ? (
        <div className="docx-dialog__note">
          {t(dialog.mixed.tabStops ? 'dialogs.paragraph.tabMixed' : 'dialogs.paragraph.tabEmpty')}
        </div>
      ) : (
        stops.map((stop) => {
          const at = formatMeasure(stop.positionTwips, unit, language);
          return (
            <div key={stop.positionTwips} className="docx-dialog__row">
              <span className="docx-dialog__label docx-dialog__tab-position">{at}</span>
              <span className="docx-dialog__tab-description">{t(TAB_ALIGNMENT_LABELS[stop.alignment])}</span>
              <button
                type="button"
                className="docx-dialog__button"
                aria-label={tApp('dialogs.tabRemoveAt', { position: at })}
                onClick={() =>
                  dialog.setValue(
                    'tabStops',
                    stops.filter((s) => s !== stop),
                  )
                }
              >
                {t('dialogs.paragraph.tabRemove')}
              </button>
            </div>
          );
        })
      )}
      <div className="docx-dialog__row">
        <MeasureInput
          id={`${id}-position`}
          label={t('dialogs.paragraph.tabPosition')}
          value={position}
          onChange={setPosition}
          tabEntry
        />
      </div>
      <div className="docx-dialog__row">
        <label className="docx-dialog__label" htmlFor={`${id}-alignment`}>
          {t('dialogs.paragraph.tabAlignment')}
        </label>
        <select
          id={`${id}-alignment`}
          className="docx-dialog__input"
          value={alignment}
          aria-label={t('dialogs.paragraph.tabAlignment')}
          data-docx-tab-entry=""
          onChange={(e) => setAlignment(e.target.value as TabAlignment)}
        >
          {TAB_ALIGNMENTS.map((value) => (
            <option key={value} value={value}>
              {t(TAB_ALIGNMENT_LABELS[value])}
            </option>
          ))}
        </select>
      </div>
      <div className="docx-dialog__row">
        <label className="docx-dialog__label" htmlFor={`${id}-leader`}>
          {t('dialogs.paragraph.tabLeader')}
        </label>
        <select
          id={`${id}-leader`}
          className="docx-dialog__input"
          value={leader}
          aria-label={t('dialogs.paragraph.tabLeader')}
          data-docx-tab-entry=""
          onChange={(e) => setLeader(e.target.value as TabLeaderName)}
        >
          {(Object.keys(TAB_LEADERS) as TabLeaderName[]).map((value) => (
            <option key={value} value={value}>
              {t(`dialogs.paragraph.${TAB_LEADERS[value]}`)}
            </option>
          ))}
        </select>
      </div>
      <div className="docx-dialog__row docx-dialog__row--actions">
        <button type="button" className="docx-dialog__button" onClick={add}>
          {t('dialogs.paragraph.tabAdd')}
        </button>
        <button
          type="button"
          className="docx-dialog__button"
          onClick={() => {
            dialog.setValue('tabStops', []);
            dialog.setValue('clearedAllTabStops', true);
          }}
        >
          {t('dialogs.paragraph.tabClearAll')}
        </button>
      </div>
    </div>
  );
}

export function ParagraphDialog({ open, onClose }: { readonly open: boolean; readonly onClose: () => void }) {
  const D = DocxEditor.ParagraphDialog;
  return (
    <D open={open} onClose={onClose}>
      <D.Field name="indentLeft">
        <IndentInput field="indentLeft" labelKey="beforeText" />
      </D.Field>
      <D.Field name="indentRight">
        <IndentInput field="indentRight" labelKey="afterText" />
      </D.Field>
      <D.Field name="specialBy">
        <IndentInput field="specialBy" labelKey="by" />
      </D.Field>
      <D.Field name="tabStops">
        <TabStops />
      </D.Field>
    </D>
  );
}
