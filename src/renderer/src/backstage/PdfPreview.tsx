// Vista previa de impresión: dibuja el PDF generado con pdf.js. Solo se pintan las
// páginas visibles (documentos de cientos de páginas no se dibujan de golpe).
import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import styles from './Backstage.module.css';

const PREVIEW_WIDTH = 420;

async function loadPdf(data: Uint8Array): Promise<PDFDocumentLoadingTask> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;
  // pdf.js transfiere el buffer al worker: se le pasa una copia.
  return pdfjs.getDocument({ data: data.slice() });
}

function PreviewPage({ pdf, pageNumber }: { readonly pdf: PDFDocumentProxy; readonly pageNumber: number }) {
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
    void pdf.getPage(pageNumber).then(async (page) => {
      const base = page.getViewport({ scale: 1 });
      const scale = (PREVIEW_WIDTH / base.width) * window.devicePixelRatio;
      const viewport = page.getViewport({ scale });
      const element = canvas.current;
      if (!element || cancelled) return;
      setRatio(base.height / base.width);
      element.width = Math.round(viewport.width);
      element.height = Math.round(viewport.height);
      await page.render({ canvas: element, viewport }).promise;
    });
    return () => {
      cancelled = true;
    };
  }, [pdf, pageNumber, visible]);

  return (
    <canvas
      ref={canvas}
      className={styles.previewPage}
      style={{ width: PREVIEW_WIDTH, height: PREVIEW_WIDTH * ratio }}
      aria-label={`Página ${pageNumber}`}
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
        return loading.promise;
      })
      .then((doc) => !cancelled && setPdf(doc))
      .catch((e: unknown) => !cancelled && setError(String((e as Error).message ?? e)));
    return () => {
      cancelled = true;
      void task?.destroy();
    };
  }, [data]);

  if (error) return <p className={styles.error}>{error}</p>;
  if (!pdf) return null;
  return (
    <div className={styles.preview} data-testid="print-preview">
      {Array.from({ length: pdf.numPages }, (_, i) => (
        <PreviewPage key={i} pdf={pdf} pageNumber={i + 1} />
      ))}
    </div>
  );
}
