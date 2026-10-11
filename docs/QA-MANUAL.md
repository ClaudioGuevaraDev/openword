# QA manual por sistema operativo

Ejecutar en **Windows 10/11**, **macOS (Apple Silicon e Intel)** y **Ubuntu 24.04** antes de cada versión. Marca cada punto y anota la versión del SO.

## Instalación y asociación de archivos

- [ ] El instalador termina sin errores. Windows (NSIS): no aparece SmartScreen si está firmado. macOS: Gatekeeper lo acepta si está notarizado. Linux: `sudo apt install ./openword_*.deb`.
- [ ] OpenWord aparece en el menú de aplicaciones con su icono.
- [ ] "Abrir con" muestra OpenWord para .docx, .doc, .rtf y .odt. En macOS no le quita la asociación a Word si está instalado.
- [ ] Doble clic en un .docx con OpenWord cerrado: se abre ese documento.
- [ ] Doble clic en otro .docx con OpenWord abierto: se abre en una ventana nueva de la misma app, no en otra instancia.

## Documentos

- [ ] Abrir un .docx real de trabajo (con tablas, imágenes, encabezados y notas): se ve como en Word.
- [ ] Editarlo, guardarlo con Ctrl/⌘+S y **abrir el resultado en Microsoft Word**: no aparece el aviso de "contenido ilegible" y el contenido es el mismo.
- [ ] Un documento nuevo guardado desde OpenWord se abre bien en Word, con estilos, listas, tabla, imagen, nota al pie y número de página.
- [ ] Cerrar con cambios: aparece "¿Desea guardar los cambios?" y las tres opciones funcionan.
- [ ] Salir de la app con dos documentos modificados: pregunta por cada uno.
- [ ] Arrastrar un .docx a la ventana lo abre.
- [ ] Una plantilla .dotx abre un documento nuevo y el .docx guardado abre en Word.
- [ ] Con LibreOffice instalado: abrir un .doc, un .rtf y un .odt reales. Sin LibreOffice: aparece el aviso para descargarlo.
- [ ] Un .docm conserva sus macros al guardar; Word las sigue viendo y OpenWord no las ejecuta.

## Edición

- [ ] Escribir con acentos y teclas muertas en un teclado español (á, é, ñ, ü, ¿, ¡) y con IME (por ejemplo, japonés) si aplica.
- [ ] Pegar desde Word, desde una página web y desde LibreOffice: conserva negrita, listas e imágenes. "Pegar solo texto" quita el formato.
- [ ] Corrector: subraya errores en español e inglés y el menú contextual corrige (en macOS usa los diccionarios del sistema).
- [ ] Atajos: Ctrl/⌘+B/I/U, Ctrl+E/L/R/J, Ctrl/⌘+Z/Y, Ctrl+Mayús+>/<, Ctrl/⌘+F, Ctrl+H, Ctrl/⌘+P.
- [ ] macOS: Edición › Deshacer/Rehacer y ⌘Q (pregunta por los cambios).

## Imprimir y PDF

- [ ] Archivo › Imprimir muestra la vista previa e **imprime en una impresora real** con márgenes correctos.
- [ ] Exportar a PDF: el PDF tiene las mismas páginas que el documento, incluida la orientación mixta.

## Fuentes y apariencia

- [ ] Windows con Office: un documento en Calibri o Aptos pagina igual que en Word (comparar el número de páginas).
- [ ] Modo oscuro (Vista › Modo) y pantallas con escala 125 %, 150 % y 200 %.

## Recuperación

- [ ] Escribir, esperar 2 minutos, forzar el cierre (Administrador de tareas, `kill -9`): al volver a abrir aparece el documento recuperado.
