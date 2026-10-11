// Vista "Archivo" a pantalla completa, como el Backstage de Word.
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PrintJob, RecentFile } from '@shared/ipc-contract';
import {
  closeWindow,
  currentDocumentBytes,
  newDocument,
  openDocument,
  saveDocument,
} from '@renderer/editor/document-actions';
import { useDocumentStore } from '@renderer/state/document-store';
import { useUiStore, type BackstageSection } from '@renderer/state/ui-store';
import { OptionsSection } from './OptionsSection';
import { PdfPreview } from './PdfPreview';
import styles from './Backstage.module.css';

type JobState =
  | { readonly kind: 'preparing' }
  | { readonly kind: 'ready'; readonly job: PrintJob }
  | { readonly kind: 'error'; readonly message: string };

/** Prepara un trabajo de impresión (PDF + ventana oculta) y lo descarta al desmontar. */
function usePrintJob(): JobState {
  const [state, setState] = useState<JobState>({ kind: 'preparing' });
  const jobId = useRef<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const bytes = await currentDocumentBytes();
        if (!bytes) throw new Error('No hay documento abierto.');
        const job = await window.openword.print.prepare(bytes);
        if (cancelled) {
          window.openword.print.dispose(job.jobId);
          return;
        }
        jobId.current = job.jobId;
        setState({ kind: 'ready', job });
      } catch (error) {
        if (!cancelled)
          setState({
            kind: 'error',
            message: String((error as Error).message ?? error).replace(
              /^Error invoking remote method '[^']+': (Error: )?/,
              '',
            ),
          });
      }
    })();
    return () => {
      cancelled = true;
      if (jobId.current) window.openword.print.dispose(jobId.current);
    };
  }, []);
  return state;
}

function PrintSection() {
  const { t } = useTranslation();
  const state = usePrintJob();
  const [status, setStatus] = useState('');

  return (
    <section className={styles.content}>
      <h1 className={styles.title}>{t('backstage.print')}</h1>
      <div className={styles.printLayout}>
        <div className={styles.printControls}>
          <button
            type="button"
            className={styles.primary}
            disabled={state.kind !== 'ready'}
            data-testid="print-button"
            onClick={async () => {
              if (state.kind !== 'ready') return;
              const result = await window.openword.print.print(state.job.jobId);
              setStatus(
                result.ok
                  ? t('backstage.printSent')
                  : result.error
                    ? `${t('backstage.printFailed')}: ${result.error}`
                    : '',
              );
            }}
          >
            {t('backstage.printButton')}
          </button>
          <p className={styles.hint}>{t('backstage.printHint')}</p>
          {state.kind === 'ready' && (
            <p data-testid="print-pages">{t('backstage.pages', { count: state.job.pages })}</p>
          )}
          {status && <p role="status">{status}</p>}
        </div>
        <div className={styles.previewArea}>
          {state.kind === 'preparing' && <p className={styles.hint}>{t('backstage.preparing')}</p>}
          {state.kind === 'error' && (
            <p className={styles.error} role="alert">
              {state.message}
            </p>
          )}
          {state.kind === 'ready' && <PdfPreview data={state.job.pdf} />}
        </div>
      </div>
    </section>
  );
}

function ExportSection() {
  const { t } = useTranslation();
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const exportPdf = async () => {
    setBusy(true);
    setStatus(t('backstage.preparing'));
    let jobId: string | null = null;
    try {
      const bytes = await currentDocumentBytes();
      if (!bytes) return;
      const job = await window.openword.print.prepare(bytes);
      jobId = job.jobId;
      const result = await window.openword.print.savePdf(job.jobId);
      setStatus(
        result.status === 'saved'
          ? t('backstage.exported', { name: result.displayName })
          : result.status === 'error'
            ? result.message
            : '',
      );
    } catch (error) {
      setStatus(String((error as Error).message ?? error));
    } finally {
      if (jobId) window.openword.print.dispose(jobId);
      setBusy(false);
    }
  };

  return (
    <section className={styles.content}>
      <h1 className={styles.title}>{t('backstage.export')}</h1>
      <h2>{t('backstage.exportPdfTitle')}</h2>
      <p className={styles.hint}>{t('backstage.exportPdfHint')}</p>
      <button
        type="button"
        className={styles.primary}
        onClick={() => void exportPdf()}
        disabled={busy}
        data-testid="export-pdf"
      >
        {t('backstage.exportPdfButton')}
      </button>
      {status && (
        <p role="status" data-testid="export-status">
          {status}
        </p>
      )}
    </section>
  );
}

function HomeSection() {
  const { t } = useTranslation();
  const displayName = useDocumentStore((s) => s.displayName);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const [recent, setRecent] = useState<readonly RecentFile[]>([]);

  useEffect(() => {
    void window.openword.file.recent().then(setRecent);
  }, []);

  return (
    <section className={styles.content}>
      <h1 className={styles.title}>{displayName}</h1>
      <h2>{t('backstage.recent')}</h2>
      {recent.length === 0 ? (
        <p className={styles.empty}>{t('backstage.noRecent')}</p>
      ) : (
        <ul className={styles.recent} data-testid="recent-list">
          {recent.map((file) => (
            <li key={file.path}>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('home');
                  void window.openword.file.openRecent(file.path);
                }}
                title={file.path}
              >
                <span className={styles.recentName}>{file.name}</span>
                <span className={styles.recentFolder}>{file.folder}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Backstage() {
  const { t } = useTranslation();
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const section = useUiStore((s) => s.backstageSection);
  const setSection = useUiStore((s) => s.setBackstageSection);

  const back = () => setActiveTab('home');
  const run = (action: () => unknown) => () => {
    back();
    void action();
  };
  const tab = (id: BackstageSection, label: string) => (
    <button
      type="button"
      aria-current={section === id ? 'page' : undefined}
      className={section === id ? styles.current : undefined}
      onClick={() => setSection(id)}
      data-testid={`backstage-${id}`}
    >
      {label}
    </button>
  );

  return (
    <div className={styles.backstage} role="dialog" aria-label={t('tabs.file')} data-testid="backstage">
      <nav className={styles.nav}>
        <button type="button" className={styles.back} onClick={back} aria-label={t('backstage.back')}>
          ←
        </button>
        {tab('home', t('backstage.info'))}
        <button type="button" onClick={run(newDocument)}>
          {t('backstage.new')}
        </button>
        <button type="button" onClick={run(openDocument)}>
          {t('backstage.open')}
        </button>
        <button type="button" onClick={run(() => saveDocument('save'))}>
          {t('backstage.save')}
        </button>
        <button type="button" onClick={run(() => saveDocument('saveAs'))}>
          {t('backstage.saveAs')}
        </button>
        {tab('print', t('backstage.print'))}
        {tab('export', t('backstage.export'))}
        <span className={styles.spacer} />
        <button type="button" onClick={run(closeWindow)}>
          {t('backstage.close')}
        </button>
        {tab('options', t('backstage.options'))}
      </nav>
      {section === 'print' ? (
        <PrintSection />
      ) : section === 'export' ? (
        <ExportSection />
      ) : section === 'options' ? (
        <OptionsSection />
      ) : (
        <HomeSection />
      )}
    </div>
  );
}
