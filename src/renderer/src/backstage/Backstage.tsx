// Vista "Archivo" a pantalla completa, como el Backstage de Word.
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft20Regular, DocumentText20Regular } from '@fluentui/react-icons';
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
import { cx } from '@renderer/ui/cx';
import * as bs from './backstage-classes';

const navButton =
  'tw:mx-2 tw:cursor-pointer tw:rounded-lg tw:border-0 tw:bg-transparent tw:px-4 tw:py-2 tw:text-left tw:text-on-tabbar tw:font-[family-name:inherit] tw:text-[14px] tw:transition-colors tw:hover:bg-white/15 tw:focus-visible:outline-2 tw:focus-visible:outline-white/70';

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
    <section className={bs.content}>
      <h1 className={bs.title}>{t('backstage.print')}</h1>
      <div className="tw:flex tw:h-[calc(100vh-160px)] tw:gap-8">
        <div className="tw:w-60 tw:flex-none">
          <button
            type="button"
            className={bs.primary}
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
          <p className={bs.hint}>{t('backstage.printHint')}</p>
          {state.kind === 'ready' && (
            <p data-testid="print-pages">{t('backstage.pages', { count: state.job.pages })}</p>
          )}
          {status && <p role="status">{status}</p>}
        </div>
        <div className="ow-canvas tw:min-w-0 tw:flex-1 tw:overflow-auto tw:rounded-xl tw:border tw:border-line tw:p-4">
          {state.kind === 'preparing' && <p className={bs.hint}>{t('backstage.preparing')}</p>}
          {state.kind === 'error' && (
            <p className={bs.error} role="alert">
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
    <section className={bs.content}>
      <h1 className={bs.title}>{t('backstage.export')}</h1>
      <h2>{t('backstage.exportPdfTitle')}</h2>
      <p className={bs.hint}>{t('backstage.exportPdfHint')}</p>
      <button
        type="button"
        className={bs.primary}
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
    <section className={bs.content}>
      <h1 className={bs.title}>{displayName}</h1>
      <h2>{t('backstage.recent')}</h2>
      {recent.length === 0 ? (
        <p className={bs.hint}>{t('backstage.noRecent')}</p>
      ) : (
        <ul className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:gap-1 tw:p-0" data-testid="recent-list">
          {recent.map((file) => (
            <li key={file.path}>
              <button
                type="button"
                className="tw:group tw:flex tw:w-full tw:max-w-[720px] tw:cursor-pointer tw:items-center tw:gap-3 tw:rounded-lg tw:border tw:border-transparent tw:bg-transparent tw:px-3 tw:py-2 tw:text-left tw:font-[family-name:inherit] tw:text-[length:inherit] tw:text-fg tw:transition-colors tw:hover:border-line tw:hover:bg-ribbon tw:hover:shadow-card"
                onClick={() => {
                  setActiveTab('home');
                  void window.openword.file.openRecent(file.path);
                }}
                title={file.path}
              >
                <span className="tw:inline-flex tw:size-9 tw:flex-none tw:items-center tw:justify-center tw:rounded-lg tw:bg-pressed tw:text-accent">
                  <DocumentText20Regular />
                </span>
                <span className="tw:flex tw:min-w-0 tw:flex-col">
                  <span className="tw:truncate tw:text-[14px] tw:font-medium">{file.name}</span>
                  <span className="tw:truncate tw:text-[12px] tw:text-muted">{file.folder}</span>
                </span>
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
      className={cx(
        navButton,
        section === id && 'tw:bg-white/22! tw:font-semibold tw:shadow-[inset_3px_0_0_var(--ow-spark)]',
      )}
      onClick={() => setSection(id)}
      data-testid={`backstage-${id}`}
    >
      {label}
    </button>
  );

  return (
    <div
      // Debajo de la barra de título, que sigue visible (y arrastrable) como en Word.
      className="tw:fixed tw:inset-x-0 tw:top-10 tw:bottom-0 tw:z-[1000] tw:flex tw:bg-app"
      role="dialog"
      aria-label={t('tabs.file')}
      data-testid="backstage"
    >
      <nav className="ow-header ow-backstage-nav tw:flex tw:w-[200px] tw:flex-none tw:flex-col tw:gap-0.5 tw:py-3">
        <button
          type="button"
          className="tw:mx-2 tw:mb-3 tw:inline-flex tw:size-9 tw:cursor-pointer tw:items-center tw:justify-center tw:rounded-full tw:border tw:border-white/30 tw:bg-transparent tw:text-on-tabbar tw:transition-colors tw:hover:bg-white/15"
          onClick={back}
          aria-label={t('backstage.back')}
          title={t('backstage.back')}
        >
          <ArrowLeft20Regular />
        </button>
        {tab('home', t('backstage.info'))}
        <button type="button" className={navButton} onClick={run(newDocument)}>
          {t('backstage.new')}
        </button>
        <button type="button" className={navButton} onClick={run(openDocument)}>
          {t('backstage.open')}
        </button>
        <button type="button" className={navButton} onClick={run(() => saveDocument('save'))}>
          {t('backstage.save')}
        </button>
        <button type="button" className={navButton} onClick={run(() => saveDocument('saveAs'))}>
          {t('backstage.saveAs')}
        </button>
        {tab('print', t('backstage.print'))}
        {tab('export', t('backstage.export'))}
        <span className="tw:flex-1" />
        <button type="button" className={navButton} onClick={run(closeWindow)}>
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
