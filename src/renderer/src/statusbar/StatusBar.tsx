import { useCallback, useEffect, useRef, useState } from 'react';
import { useDocxEditor, useEditorEvent, useEditorState, useZoom } from '@docx-editor.dev/react';
import { useTranslation } from 'react-i18next';
import { countWordsInParagraphs } from '@shared/word-count';
import styles from './StatusBar.module.css';

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
    <div className={styles.zoom}>
      <button
        type="button"
        className={styles.zoomButton}
        onClick={zoom.zoomOut}
        disabled={!zoom.canZoomOut}
        aria-label={t('status.zoomOut')}
        title={t('status.zoomOut')}
      >
        −
      </button>
      <input
        type="range"
        className={styles.slider}
        min={10}
        max={500}
        step={10}
        value={percent}
        aria-label={t('status.zoom')}
        onChange={(e) => zoom.setZoom(Number(e.target.value) / 100)}
      />
      <button
        type="button"
        className={styles.zoomButton}
        onClick={zoom.zoomIn}
        disabled={!zoom.canZoomIn}
        aria-label={t('status.zoomIn')}
        title={t('status.zoomIn')}
      >
        +
      </button>
      <button
        type="button"
        className={styles.zoomPercent}
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
    <footer className={styles.statusbar} data-testid="status-bar">
      <span data-testid="status-page">
        {t('status.page', { current: page?.current ?? 1, total: page?.total ?? 1 })}
      </span>
      <span data-testid="status-words">{words === null ? '' : t('status.words', { count: words })}</span>
      <span>{t('status.language')}</span>
      <span className={styles.spacer} />
      <ZoomControl />
    </footer>
  );
}
