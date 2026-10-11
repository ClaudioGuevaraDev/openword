// En Windows y Linux no hay barra de menús (la cinta la reemplaza y así Ctrl+R alinea a la
// derecha en vez de recargar). macOS exige un menú de aplicación para ⌘C/⌘V/⌘Q.
import { app, BrowserWindow, Menu, type MenuItemConstructorOptions } from 'electron';
import { IpcChannel, type MenuCommand } from '@shared/ipc-contract';

function sendToFocused(command: MenuCommand): void {
  BrowserWindow.getFocusedWindow()?.webContents.send(IpcChannel.menuCommand, command);
}

export function installApplicationMenu(): void {
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null);
    return;
  }
  const template: MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edición',
      // Deshacer/Rehacer van al motor: no maneja el "historyUndo" nativo del navegador.
      submenu: [
        { label: 'Deshacer', accelerator: 'CmdOrCtrl+Z', click: () => sendToFocused('undo') },
        { label: 'Rehacer', accelerator: 'Shift+CmdOrCtrl+Z', click: () => sendToFocused('redo') },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteAndMatchStyle' },
        { role: 'selectAll' },
      ],
    },
    // Sin rol "reload": ⌘R alinea a la derecha, como en Word.
    { role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
