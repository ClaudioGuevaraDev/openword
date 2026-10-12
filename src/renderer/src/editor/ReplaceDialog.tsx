// Buscar y reemplazar (Ctrl+H), como el cuadro de Word. No es modal: se puede seguir
// editando el documento con el cuadro abierto.
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useDocxEditor, useDocumentSearch } from '@docx-editor.dev/react';
import { useTranslation } from 'react-i18next';
import { replaceAllMatches, replaceOneMatch } from './replace-text';

const field = 'tw:grid tw:grid-cols-[100px_1fr] tw:items-center tw:gap-2';
const input =
  'tw:h-7 tw:rounded-md tw:border tw:border-line tw:bg-input tw:px-1.5 tw:text-fg tw:font-[family-name:inherit] tw:text-[length:inherit] tw:focus:border-accent tw:focus:outline-none';
const option = 'tw:flex tw:items-center tw:gap-1';
const action =
  'tw:cursor-pointer tw:rounded-md tw:border tw:border-line tw:bg-input tw:px-2.5 tw:py-1 tw:text-fg tw:font-[family-name:inherit] tw:text-[length:inherit] tw:hover:enabled:bg-hover tw:disabled:cursor-default tw:disabled:opacity-50';

export function ReplaceDialog({ open, onClose }: { readonly open: boolean; readonly onClose: () => void }) {
  if (!open) return null;
  return <ReplacePanel onClose={onClose} />;
}

function ReplacePanel({ onClose }: { readonly onClose: () => void }) {
  const { t } = useTranslation();
  const editor = useDocxEditor();
  const search = useDocumentSearch();
  const [query, setQuery] = useState(search.query);
  const [replacement, setReplacement] = useState('');
  const [status, setStatus] = useState('');
  const findInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    findInput.current?.focus();
    findInput.current?.select();
  }, []);

  // Al cerrarse por cualquier vía (botón, Esc desde el documento, cambio de pestaña) se
  // quitan los resaltados de las coincidencias.
  const clearSearch = useEffectEvent(() => search.clear());
  useEffect(() => () => clearSearch(), []);

  const options = { matchCase: search.matchCase, wholeWord: search.wholeWord };

  const runFind = (): number => {
    const matches = search.find(query, options);
    setStatus(matches.length === 0 ? t('replace.notFound') : t('replace.found', { count: matches.length }));
    return matches.length;
  };

  const findNext = () => {
    if (!query) return;
    if (search.query !== query || search.matches.length === 0) {
      if (runFind() > 0) search.goTo(0);
    } else {
      search.next();
    }
  };

  const replaceOne = () => {
    if (!editor || !query) return;
    const match = search.query === query ? search.activeMatch : null;
    if (!match) {
      findNext();
      return;
    }
    replaceOneMatch(editor, match, replacement);
    // Las posiciones cambiaron: buscar de nuevo y pasar a la siguiente coincidencia.
    const remaining = search.find(query, options);
    if (remaining.length > 0) search.goTo(0);
    setStatus(remaining.length === 0 ? t('replace.done') : t('replace.found', { count: remaining.length }));
  };

  const replaceAll = () => {
    if (!editor || !query) return;
    const matches = search.find(query, options);
    if (matches.length === 0) {
      setStatus(t('replace.notFound'));
      return;
    }
    const { replaced, error: lastError } = replaceAllMatches(editor, matches, replacement);
    search.clear();
    setStatus(
      replaced > 0
        ? t('replace.replacedAll', { count: replaced })
        : `${t('replace.failed')} ${lastError ?? ''}`,
    );
  };

  const close = () => {
    onClose();
    editor?.focus();
  };

  return (
    <div
      className="tw:absolute tw:top-3 tw:right-6 tw:z-50 tw:flex tw:w-[360px] tw:flex-col tw:gap-2 tw:rounded-xl tw:border tw:border-line tw:bg-ribbon tw:p-3.5 tw:text-[12px] tw:text-fg tw:shadow-float"
      role="dialog"
      aria-label={t('replace.title')}
      data-testid="replace-dialog"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          close();
        }
      }}
    >
      <div className="tw:flex tw:items-center tw:justify-between tw:text-[13px]">
        <strong>{t('replace.title')}</strong>
        <button
          type="button"
          className="tw:cursor-pointer tw:border-0 tw:bg-transparent tw:text-[18px] tw:leading-none tw:text-inherit"
          onClick={close}
          aria-label={t('replace.close')}
        >
          ×
        </button>
      </div>
      <label className={field}>
        <span>{t('replace.find')}</span>
        <input
          ref={findInput}
          className={input}
          data-testid="replace-find"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setStatus('');
          }}
          onKeyDown={(e) => e.key === 'Enter' && findNext()}
        />
      </label>
      <label className={field}>
        <span>{t('replace.with')}</span>
        <input
          data-testid="replace-with"
          className={input}
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && replaceOne()}
        />
      </label>
      <div className="tw:flex tw:gap-4">
        <label className={option}>
          <input
            type="checkbox"
            checked={search.matchCase}
            onChange={(e) => search.setMatchCase(e.target.checked)}
          />
          {t('replace.matchCase')}
        </label>
        <label className={option}>
          <input
            type="checkbox"
            checked={search.wholeWord}
            onChange={(e) => search.setWholeWord(e.target.checked)}
          />
          {t('replace.wholeWord')}
        </label>
      </div>
      <div className="tw:flex tw:justify-end tw:gap-1.5">
        <button type="button" className={action} onClick={replaceOne} disabled={!query}>
          {t('replace.replace')}
        </button>
        <button
          type="button"
          className={action}
          onClick={replaceAll}
          disabled={!query}
          data-testid="replace-all"
        >
          {t('replace.replaceAll')}
        </button>
        <button type="button" className={action} onClick={findNext} disabled={!query} data-testid="find-next">
          {t('replace.findNext')}
        </button>
      </div>
      <div className="tw:min-h-4 tw:text-muted" role="status" data-testid="replace-status">
        {status}
      </div>
    </div>
  );
}
