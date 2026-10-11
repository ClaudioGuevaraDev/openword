// En Windows y Linux no hay barra de menús (la cinta la reemplaza y así Ctrl+R alinea a la
// derecha en vez de recargar). macOS exige un menú de aplicación para ⌘C/⌘V/⌘Q.
import { app, Menu, type MenuItemConstructorOptions } from 'electron';

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
      // Deshacer/Rehacer se conectan al motor en el hito 3 (no maneja historyUndo nativo).
      submenu: [{ role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }],
    },
    // Sin rol "reload": ⌘R alinea a la derecha, como en Word.
    { role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
