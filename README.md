# OpenWord

Procesador de textos de escritorio compatible con Microsoft Word, para Windows, macOS y Linux.

- **Shell:** Electron 44 (mismo Chromium en los 3 SO: medición de texto y paginación idénticas).
- **Motor del documento:** [docx-editor](https://github.com/eigenpal/docx-editor) 2.27.0 (Apache-2.0). Trabaja directamente sobre OOXML y conserva al guardar todo lo que no edita. Los paquetes Pro (`pro`, `editor-api`, `docx-to-pdf`) están prohibidos; ESLint y `npm run check:deps` lo verifican.
- **UI:** React 19 + TypeScript estricto, cinta de opciones propia, español e inglés.

El resultado del spike técnico (hito 0) está en [`spike/SPIKE.md`](spike/SPIKE.md).

## Estado

- **Hito 0 (spike):** completado en Linux.
- **Hito 1 (base):** proyecto, seguridad, CI y empaquetado.
- **Hito 2 (documentos):**
  - Abrir, Nuevo, Guardar (atómico) y Guardar como. Detección de formato por contenido.
  - Plantillas `.dotx`/`.dotm` y `.docm`: las macros se conservan y nunca se ejecutan.
  - Una ventana por documento. "Documento1" se reutiliza al abrir. Instancia única.
  - Apertura de archivos desde la línea de comandos, con arrastrar y soltar, y con `open-file` en macOS. Documentos recientes.
  - Aviso Guardar / No guardar / Cancelar al cerrar y al salir.
  - Papel Carta o A4 según la región.
  - Fuentes reales del sistema para la medición, con sustitutos OFL.
- **Hito 3 (Inicio):**
  - Cinta Inicio con Portapapeles (Pegar con opciones, Cortar, Copiar, Copiar formato).
  - Fuente: familia, tamaño, Agrandar/Reducir, N/K/S, tachado, sub/superíndice, color, resaltado y borrar formato.
  - Párrafo: viñetas, numeración, sangrías, alineación, interlineado, diálogo Párrafo y ¶.
  - Galería de estilos con nombres localizados y Seleccionar todo.
  - Atajos de Word. Barra de estado con páginas, palabras y zoom. Deshacer/Rehacer del menú de macOS conectados al motor.
- **Hito 4 (Insertar, Disposición, Referencias):**
  - Insertar: salto de página, tabla (cuadrícula), imágenes (BMP, WebP y SVG se convierten a PNG), vínculo, encabezado, pie, número de página y cuadro de texto.
  - Disposición: márgenes, orientación, tamaño, saltos de sección, sangrías y espaciado (cm o pulgadas según la región).
  - Referencias: tabla de contenido y notas al pie y al final.
  - Pestañas contextuales Tabla, Formato de imagen y Encabezado y pie de página.
- **Hito 5 (Vista y búsqueda):**
  - Pestaña Vista: regla (horizontal y vertical, en cm o pulgadas), panel de navegación con títulos y búsqueda, ¶.
  - Zoom: niveles, 100 %, una página y ancho de página. Tema claro, oscuro o del sistema (recordado entre sesiones).
  - Buscar (Ctrl/⌘+F) y Buscar y reemplazar (Ctrl+H, también en macOS), con coincidencia de mayúsculas y palabras completas.
- **Hito 6 (Imprimir y PDF):**
  - Archivo › Imprimir (Ctrl/⌘+P) con vista previa fiel (el mismo PDF, dibujado con pdf.js) y diálogo de impresión del sistema.
  - Archivo › Exportar › Crear PDF.
  - Todas las páginas, con tamaño y orientación por sección. No usa el conversor Pro del motor.
- **Hito 7 (formatos, corrector, recuperación, Opciones):**
  - `.doc`, `.rtf`, `.odt`, Word XML y HTML-como-.doc se convierten a .docx con LibreOffice si está instalado (si no, se ofrece descargarlo). El original no se modifica.
  - Corrector ortográfico propio (diccionarios es/en de Chromium): subrayado, sugerencias, Omitir todo y Agregar al diccionario en el menú contextual. Omite MAYÚSCULAS, números, correos y URLs.
  - Recuperación automática: copias cada N minutos que se reabren tras un cierre inesperado.
  - Archivo › Opciones: idioma de la interfaz, corrector, diccionarios y recuperación.

## Limitaciones conocidas del motor (docx-editor 2.27)

- Reemplazar: `replaceMatch`/`replaceAllMatches` no están implementados. OpenWord reemplaza seleccionando y escribiendo, así que cada reemplazo es un paso de Deshacer.
- Tablas: no se pueden combinar ni dividir celdas, ni marcar la fila de encabezado (las existentes se conservan).
- Imágenes: el ajuste de texto solo se cambia en imágenes flotantes, y una imagen insertada no queda seleccionada.
- Control de cambios y comentarios: se muestran en su estado final y se conservan al guardar. Crearlos requiere la licencia Pro.

## Desarrollo

Requisitos: Node 22.12 o superior (se recomienda Node 24).

```bash
npm install
node node_modules/electron/install.js   # si npm bloqueó la descarga del binario de Electron
npm run dev                              # app con recarga en caliente
```

En Ubuntu 24.04 o superior, Chromium no puede usar su sandbox SUID fuera de un paquete instalado. Para desarrollar, ejecuta `npx electron-vite dev --noSandbox`. Los paquetes `.deb` lo resuelven al instalar.

| Comando                           | Qué hace                                              |
| --------------------------------- | ----------------------------------------------------- |
| `npm run build`                   | Compila main, preload y renderer en `out/`            |
| `npm run typecheck`               | TypeScript (main/preload, renderer y E2E)             |
| `npm run lint` / `npm run format` | ESLint / Prettier                                     |
| `npm test`                        | Pruebas unitarias (Vitest)                            |
| `npm run test:e2e`                | Compila y ejecuta las E2E (Playwright sobre Electron) |
| `npm run check:deps`              | Falla si aparece algún paquete Pro de docx-editor     |
| `npm run package:dir`             | Empaqueta sin instalador (`dist/<so>-unpacked`)       |
| `npm run package`                 | Instaladores para el SO actual (`dist/`)              |

## Estructura

```
src/
  shared/    contrato IPC (ipc-contract.ts) y utilidades sin dependencias de Electron
  main/      proceso principal: protocolo app://, seguridad, ventanas, IPC, menú
  preload/   puente mínimo window.openword (contextBridge)
  renderer/  React: EditorHost (motor), cinta, barra de estado, i18n
tests/
  unit/      Vitest
  e2e/       Playwright (_electron)
```

## Seguridad

Los documentos son entrada no confiable:

- El renderer corre con `sandbox`, `contextIsolation` y sin Node.
- Se sirve por `app://openword` con una CSP estricta (solo `wasm-unsafe-eval` para HarfBuzz).
- No se permite navegar ni abrir ventanas nuevas. Los vínculos `http`, `https` y `mailto` se abren en el navegador del sistema.
- En producción no hay acceso a la red.
- El IPC solo atiende mensajes de nuestro origen.
- El binario empaquetado lleva Electron Fuses: sin `RunAsNode`, sin `NODE_OPTIONS`, sin `--inspect`, con integridad ASAR y cargando solo desde el ASAR.

## Distribución

Los builds del CI salen sin firmar. Antes de entregar la app a usuarios finales hace falta:

- **macOS:** Apple Developer ID + notarización (variables `CSC_LINK`, `APPLE_API_KEY`…).
- **Windows:** certificado Authenticode o Azure Trusted Signing.
