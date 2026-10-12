import { useCallback, useEffect, useRef, useState } from 'react';
import { useDocxEditor, useEditorEvent, useEditorState, useZoom } from '@docx-editor.dev/react';
import { ZoomIn16Regular, ZoomOut16Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';
import { countWordsInParagraphs } from '@shared/word-count';
import { paragraphTexts, whenIdle } from '@renderer/editor/paragraph-snapshot';

const zoomButton =
  'tw:inline-flex tw:size-5 tw:cursor-pointer tw:items-center tw:justify-center tw:rounded tw:border-0 tw:bg-transparent tw:p-0 tw:text-inherit tw:transition-colors tw:hover:enabled:bg-hover tw:hover:enabled:text-accent tw:disabled:cursor-default tw:disabled:opacity-40';

const chip = 'tw:rounded tw:px-1.5 tw:py-0.5';

/** Palabras del cuerpo del documento (como la barra de estado de Word), recalculadas al editar. */
function useWordCount(): number | null {
  const editor = useDocxEditor();
  const [words, setWords] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cancelIdle = useRef<(() => void) | undefined>(undefined);

  const recount = useCallback(() => {
    clearTimeout(timer.current);
    cancelIdle.current?.();
    timer.current = setTimeout(() => {
      cancelIdle.current = whenIdle(() => {
        if (!editor) return;
        try {
          setWords(countWordsInParagraphs(paragraphTexts(editor)));
        } catch {
          setWords(null);
        }
      });
    }, 300);
  }, [editor]);

  useEffect(() => {
    recount();
    return () => {
      clearTimeout(timer.current);
      cancelIdle.current?.();
    };
  }, [recount]);
  useEditorEvent('change', recount);
  return words;
}

function ZoomControl() {
  const { t } = useTranslation();
  const zoom = useZoom();
  const percent = Math.round(zoom.zoom * 100);
  return (
    <div className="tw:flex tw:items-center tw:gap-1">
      <button
        type="button"
        className={zoomButton}
        onClick={zoom.zoomOut}
        disabled={!zoom.canZoomOut}
        aria-label={t('status.zoomOut')}
        title={t('status.zoomOut')}
      >
        <ZoomOut16Regular />
      </button>
      <input
        type="range"
        className="ow-zoom-slider tw:w-[110px]"
        min={10}
        max={500}
        step={10}
        value={percent}
        aria-label={t('status.zoom')}
        onChange={(e) => zoom.setZoom(Number(e.target.value) / 100)}
      />
      <button
        type="button"
        className={zoomButton}
        onClick={zoom.zoomIn}
        disabled={!zoom.canZoomIn}
        aria-label={t('status.zoomIn')}
        title={t('status.zoomIn')}
      >
        <ZoomIn16Regular />
      </button>
      <button
        type="button"
        className="tw:min-w-12 tw:cursor-pointer tw:rounded tw:border-0 tw:bg-transparent tw:px-1 tw:text-right tw:font-[family-name:inherit] tw:text-[length:inherit] tw:text-inherit tw:tabular-nums tw:hover:bg-hover"
        onClick={zoom.reset}
        aria-label={t('status.zoomLevel', { percent })}
        title={t('status.zoomReset')}
        data-testid="zoom-percent"
      >
        {percent} %
      </button>
    </div>
  );
}

export function StatusBar() {
  const { t } = useTranslation();
  const page = useEditorState((s) => s.page);
  const words = useWordCount();

  return (
    <footer
      className="tw:flex tw:h-7 tw:flex-none tw:items-center tw:gap-1 tw:border-t tw:border-line tw:bg-statusbar tw:px-2 tw:text-[12px] tw:text-on-statusbar"
      data-testid="status-bar"
    >
      <span className={chip} data-testid="status-page">
        {t('status.page', { current: page?.current ?? 1, total: page?.total ?? 1 })}
      </span>
      <span className={`${chip} tw:tabular-nums`} data-testid="status-words">
        {words === null ? '' : t('status.words', { count: words })}
      </span>
      <span className={chip}>{t('status.language')}</span>
      <span className="tw:flex-1" />
      <ZoomControl />
    </footer>
  );
}
