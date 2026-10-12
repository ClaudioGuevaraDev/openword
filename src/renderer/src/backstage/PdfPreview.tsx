// Vista previa de impresión: dibuja el PDF generado con pdf.js. Solo se pintan las
// páginas visibles (documentos de cientos de páginas no se dibujan de golpe).
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { errorMessage } from '@shared/errors';
import * as bs from './backstage-classes';

const PREVIEW_WIDTH = 420;

/** pdf.js se carga al abrir la vista previa por primera vez (no en el arranque). */
const pdfjsModule = () =>
  import('pdfjs-dist').then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    return pdfjs;
  });
let pdfjsPromise: ReturnType<typeof pdfjsModule> | undefined;

async function loadPdf(data: Uint8Array): Promise<PDFDocumentLoadingTask> {
  pdfjsPromise ??= pdfjsModule();
  const pdfjs = await pdfjsPromise;
  // pdf.js transfiere el buffer al worker: se le pasa una copia.
  return pdfjs.getDocument({ data: data.slice() });
}

function PreviewPage({ pdf, pageNumber }: { readonly pdf: PDFDocumentProxy; readonly pageNumber: number }) {
  const { t } = useTranslation();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ratio, setRatio] = useState(1.294); // alto/ancho provisional (Carta)
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => entry?.isIntersecting && setVisible(true), {
      rootMargin: '400px',
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    let task: RenderTask | null = null;
    pdf
      .getPage(pageNumber)
      .then(async (page) => {
        const base = page.getViewport({ scale: 1 });
        const scale = (PREVIEW_WIDTH / base.width) * window.devicePixelRatio;
        const viewport = page.getViewport({ scale });
        const element = canvas.current;
        if (!element || cancelled) return;
        setRatio(base.height / base.width);
        element.width = Math.round(viewport.width);
        element.height = Math.round(viewport.height);
        task = page.render({ canvas: element, viewport });
        await task.promise;
      })
      // Cancelar un render en curso lo rechaza: no es un error.
      .catch(() => undefined);
    return () => {
      cancelled = true;
      // Dos render() sobre el mismo canvas a la vez fallan en pdf.js.
      task?.cancel();
    };
  }, [pdf, pageNumber, visible]);

  return (
    <canvas
      ref={canvas}
      className="tw:block tw:rounded-sm tw:bg-white tw:shadow-card"
      style={{ width: PREVIEW_WIDTH, height: PREVIEW_WIDTH * ratio }}
      role="img"
      aria-label={t('backstage.previewPage', { page: pageNumber })}
      data-testid="preview-page"
    />
  );
}

export function PdfPreview({ data }: { readonly data: Uint8Array }) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let task: PDFDocumentLoadingTask | null = null;
    let cancelled = false;
    loadPdf(data)
      .then((loading) => {
        task = loading;
        // Desmontado mientras cargaba pdf.js: el limpiador ya corrió y no vio esta tarea.
        if (cancelled) void loading.destroy();
        return loading.promise;
      })
      .then((doc) => !cancelled && setPdf(doc))
      .catch((e: unknown) => !cancelled && setError(errorMessage(e)));
    return () => {
      cancelled = true;
      void task?.destroy();
    };
  }, [data]);

  if (error) return <p className={bs.error}>{error}</p>;
  if (!pdf) return null;
  return (
    <div className="tw:flex tw:flex-col tw:items-center tw:gap-4" data-testid="print-preview">
      {Array.from({ length: pdf.numPages }, (_, i) => (
        <PreviewPage key={i} pdf={pdf} pageNumber={i + 1} />
      ))}
    </div>
  );
}
