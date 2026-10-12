import { useCallback, useEffect, useRef, useState } from 'react';
import { useDocxEditor, useEditorEvent, useEditorState, useZoom } from '@docx-editor.dev/react';
import { useTranslation } from 'react-i18next';
import { countWordsInParagraphs } from '@shared/word-count';

const zoomButton =
  'tw:cursor-pointer tw:border-0 tw:bg-transparent tw:px-1 tw:text-inherit tw:font-[family-name:inherit] tw:text-[length:inherit] tw:disabled:opacity-40';

/** Palabras del cuerpo del documento (como la barra de estado de Word), recalculadas al editar. */
function useWordCount(): number | null {
  const editor = useDocxEditor();
  const [words, setWords] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const recount = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!editor) return;
      try {
        const paragraphs = editor.query({ type: 'paragraphs' }) as readonly { text: string }[];
        setWords(countWordsInParagraphs(paragraphs));
      } catch {
        setWords(null);
      }
    }, 300);
  }, [editor]);

  useEffect(() => {
    recount();
    return () => clearTimeout(timer.current);
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
        −
      </button>
      <input
        type="range"
        className="tw:w-[110px] tw:accent-white"
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
        +
      </button>
      <button
        type="button"
        className="tw:min-w-11 tw:cursor-pointer tw:border-0 tw:bg-transparent tw:px-1 tw:text-right tw:font-[family-name:inherit] tw:text-[length:inherit] tw:text-inherit"
        onClick={zoom.reset}
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
      className="tw:flex tw:h-6 tw:flex-none tw:items-center tw:gap-4 tw:bg-statusbar tw:px-3 tw:text-[12px] tw:text-on-statusbar"
      data-testid="status-bar"
    >
      <span data-testid="status-page">
        {t('status.page', { current: page?.current ?? 1, total: page?.total ?? 1 })}
      </span>
      <span data-testid="status-words">{words === null ? '' : t('status.words', { count: words })}</span>
      <span>{t('status.language')}</span>
      <span className="tw:flex-1" />
      <ZoomControl />
    </footer>
  );
}
