// Al cerrar una superficie del motor (popup de vínculo, menú, nota…) con Esc o un clic (en
// Cancelar, por ejemplo), el foco puede quedarse en <body>: se devuelve al documento
// para seguir escribiendo, como en Word. No actúa si hay otro sitio legítimo para el foco
// (un diálogo o popover abierto, la vista Archivo) o si la ventana no está activa. Esc en el
// panel de navegación (Buscar, Títulos) también vuelve al documento y deja el panel abierto.
import { useEffect } from 'react';
import { useDocxEditor } from '@docx-editor.dev/react';
import { useUiStore } from '@renderer/state/ui-store';

export function FocusGuard() {
  const editor = useDocxEditor();
  useEffect(() => {
    if (!editor) return;
    let frame = 0;
    const check = (fromNavigation = false) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const active = document.activeElement;
        if (!document.hasFocus()) return;
        if (!fromNavigation && active && active !== document.body) return;
        if (useUiStore.getState().backstageOpen || document.querySelector('dialog[open], :popover-open'))
          return;
        editor.focus();
      });
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      check(e.target instanceof Element && e.target.closest('.docx-nav__panel-shell') !== null);
    };
    const onLostFocus = () => check();
    document.addEventListener('click', onLostFocus);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('click', onLostFocus);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [editor]);
  return null;
}
