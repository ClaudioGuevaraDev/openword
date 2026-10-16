// Vista previa al estirar o mover una imagen, como en Word: mientras se arrastra un tirador (o
// el marco de una imagen flotante) se ve una copia semitransparente que sigue al marco del
// motor; la imagen real cambia al soltar, cuando el motor aplica el tamaño en un solo paso.
// No toca la lógica del motor: clona lo que pinta y escala la copia al marco que él mueve.
import { useEffect } from 'react';

const HANDLE = '.docx-image-selection-overlay__handle';
const FRAME = '.docx-image-selection-overlay__frame';
/** Marco que se puede arrastrar para mover (imagen flotante movible). */
const MOVABLE_FRAME = `${FRAME}.docx-editor-one-surface__overlay-control`;

/** Algún transform con giro: la copia escalada no coincidiría con lo que se ve. */
function isRotated(element: Element): boolean {
  return [element, ...element.querySelectorAll('*')].some((el) => {
    const { transform } = getComputedStyle(el);
    if (transform === 'none') return false;
    const m = new DOMMatrixReadOnly(transform);
    return Math.abs(m.b) > 1e-6 || Math.abs(m.c) > 1e-6;
  });
}

/** Empieza la vista previa del arrastre que nace en `target`; devuelve cómo terminarla. */
function startPreview(target: Element): (() => void) | null {
  const overlay = target.closest('.docx-image-selection-overlay');
  const frame = overlay?.querySelector<HTMLElement>(FRAME);
  const id = overlay?.getAttribute('data-drawing-node-id');
  if (!overlay || !frame || !id || frame.dataset['textbox'] === 'true') return null;
  const drawing = document.querySelector<HTMLElement>(
    `.docx-page [data-drawing-node-id="${CSS.escape(id)}"]`,
  );
  if (!drawing || drawing.offsetWidth === 0 || drawing.offsetHeight === 0 || isRotated(drawing)) return null;

  // Tamaño CSS propio de la imagen: la copia se escala de ahí al tamaño en pantalla del marco
  // (vale con cualquier zoom).
  const baseWidth = drawing.offsetWidth;
  const baseHeight = drawing.offsetHeight;
  const start = frame.getAttribute('style');
  const ghost = drawing.cloneNode(true) as HTMLElement;
  ghost.removeAttribute('data-drawing-node-id');
  ghost.removeAttribute('role');
  ghost.className = 'ow-image-drag-preview';
  Object.assign(ghost.style, {
    position: 'absolute',
    width: `${baseWidth}px`,
    height: `${baseHeight}px`,
    transformOrigin: '0 0',
    display: 'none',
  });
  overlay.insertBefore(ghost, frame);

  const sync = () => {
    // Un clic sin arrastrar no muestra la copia.
    if (frame.getAttribute('style') === start) return;
    ghost.style.left = frame.style.left;
    ghost.style.top = frame.style.top;
    ghost.style.transform = `scale(${frame.offsetWidth / baseWidth}, ${frame.offsetHeight / baseHeight})`;
    ghost.style.display = '';
  };
  const observer = new MutationObserver(sync);
  observer.observe(frame, { attributes: true, attributeFilter: ['style'] });
  return () => {
    observer.disconnect();
    ghost.remove();
  };
}

export function ImageDragPreview() {
  useEffect(() => {
    let stop: (() => void) | null = null;
    const end = () => {
      stop?.();
      stop = null;
    };
    const onPointerDown = (e: PointerEvent) => {
      end();
      const target = e.target instanceof Element ? e.target : null;
      if (e.button !== 0 || !target?.matches(`${HANDLE}, ${MOVABLE_FRAME}`)) return;
      stop = startPreview(target);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') end();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointerup', end, true);
    window.addEventListener('pointercancel', end, true);
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      end();
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('pointerup', end, true);
      window.removeEventListener('pointercancel', end, true);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, []);
  return null;
}
