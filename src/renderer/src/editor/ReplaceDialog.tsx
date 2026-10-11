// Buscar y reemplazar (Ctrl+H), como el cuadro de Word. No es modal: se puede seguir
// editando el documento con el cuadro abierto.
import { useEffect, useRef, useState } from 'react';
import { useDocxEditor, useDocumentSearch } from '@docx-editor.dev/react';
import { useTranslation } from 'react-i18next';
import { replaceAllMatches, replaceOneMatch } from './replace-text';
import styles from './ReplaceDialog.module.css';

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
    search.clear();
    onClose();
    editor?.focus();
  };

  return (
    <div
      className={styles.panel}
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
      <div className={styles.header}>
        <strong>{t('replace.title')}</strong>
        <button type="button" className={styles.close} onClick={close} aria-label={t('replace.close')}>
          ×
        </button>
      </div>
      <label className={styles.field}>
        <span>{t('replace.find')}</span>
        <input
          ref={findInput}
          data-testid="replace-find"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setStatus('');
          }}
          onKeyDown={(e) => e.key === 'Enter' && findNext()}
        />
      </label>
      <label className={styles.field}>
        <span>{t('replace.with')}</span>
        <input
          data-testid="replace-with"
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && replaceOne()}
        />
      </label>
      <div className={styles.options}>
        <label>
          <input
            type="checkbox"
            checked={search.matchCase}
            onChange={(e) => search.setMatchCase(e.target.checked)}
          />
          {t('replace.matchCase')}
        </label>
        <label>
          <input
            type="checkbox"
            checked={search.wholeWord}
            onChange={(e) => search.setWholeWord(e.target.checked)}
          />
          {t('replace.wholeWord')}
        </label>
      </div>
      <div className={styles.buttons}>
        <button type="button" onClick={replaceOne} disabled={!query}>
          {t('replace.replace')}
        </button>
        <button type="button" onClick={replaceAll} disabled={!query} data-testid="replace-all">
          {t('replace.replaceAll')}
        </button>
        <button type="button" onClick={findNext} disabled={!query} data-testid="find-next">
          {t('replace.findNext')}
        </button>
      </div>
      <div className={styles.status} role="status" data-testid="replace-status">
        {status}
      </div>
    </div>
  );
}
