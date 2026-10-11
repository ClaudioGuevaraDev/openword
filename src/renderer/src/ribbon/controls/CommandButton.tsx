// Botón enlazado a un comando del motor (slot de la barra o EditorCommand tipado).
import { useEditorCommand } from '@docx-editor.dev/react';
import type { ChromeSlotId, EditorCommand } from '@docx-editor.dev/core';
import { RibbonButton, type RibbonButtonProps } from './RibbonButton';

export function CommandButton({
  command,
  toggle = false,
  ...props
}: Omit<RibbonButtonProps, 'pressed' | 'disabled' | 'onClick'> & {
  readonly command: ChromeSlotId | EditorCommand;
  /** Muestra estado activo/inactivo (negrita, alineación…). */
  readonly toggle?: boolean;
}) {
  const state = useEditorCommand(command);
  return (
    <RibbonButton
      {...props}
      tooltip={
        state.disabledReason && !state.isEnabled ? `${props.label}: ${state.disabledReason}` : props.tooltip
      }
      pressed={toggle ? state.isActive : undefined}
      disabled={!state.isEnabled}
      onClick={() => state.execute()}
    />
  );
}
