// Viñetas y Numeración. Activar (o cambiar de tipo) lo hace el motor; desactivar pasa por
// removeListFromSelection, que también quita el estilo Párrafo de lista y su sangría.
import { useEditorCommand } from '@docx-editor.dev/react';
import { focusEditor, removeListFromSelection } from '@renderer/editor/document-actions';
import { RibbonButton, type RibbonButtonProps } from './RibbonButton';

export function ListButton({
  command,
  ...props
}: Omit<RibbonButtonProps, 'pressed' | 'disabled' | 'onClick'> & {
  readonly command: 'list.bullet' | 'list.numbered';
}) {
  const state = useEditorCommand(command);
  return (
    <RibbonButton
      {...props}
      tooltip={
        state.disabledReason && !state.isEnabled ? `${props.label}: ${state.disabledReason}` : props.tooltip
      }
      pressed={state.isActive}
      disabled={!state.isEnabled}
      onClick={() => {
        if (state.isActive && removeListFromSelection()) focusEditor();
        else state.execute();
      }}
    />
  );
}
