# Hito 0: resultados del spike técnico

App desechable con Electron 44, React 19 y docx-editor 2.27.0 (Apache-2.0, sin paquetes Pro). Se probó en Linux (Ubuntu, Wayland) con 10 documentos de prueba del repositorio de docx-editor, de 1 a 521 páginas.

## Cómo ejecutarlo

```bash
cd spike
npm install
npx electron-vite build
./node_modules/electron/dist/electron . --no-sandbox                 # app interactiva
SPIKE_SELFTEST=$PWD/fixtures/demo.docx SPIKE_OUT=/tmp/ow \
  ./node_modules/electron/dist/electron . --no-sandbox                 # auto-prueba → /tmp/ow/report.json
npx electron-vite dev --noSandbox                                      # modo desarrollo
node tools/roundtrip-diff.mjs original.docx guardado.docx              # comparación semántica de round-trip
```

En Ubuntu, `--no-sandbox` solo hace falta en desarrollo, porque `chrome-sandbox` no tiene SUID root. El paquete `.deb` lo resuelve al instalar. El AppImage necesita un perfil de AppArmor o el mismo flag.

## Resultados

| Punto | Resultado | Detalle |
|---|---|---|
| `harfbuzz.wasm` bajo `app://` con CSP estricta (build de producción) | ✅ | Medición `shaped` (HarfBuzz) en los 10 documentos. |
| Lo mismo en modo dev (servidor de Vite) | ✅ con ajuste | Hay que excluir `@docx-editor.dev/core` **y** `@docx-editor.dev/fonts` de `optimizeDeps`; si no, las URLs de las fuentes devuelven HTML. |
| Cinta propia con los hooks del motor | ✅ | `useEditorCommand`, `useEditorValueCommand('font.size')`, `useFontFamily`, `useParagraphStyle`, `useEditorState(s => s.page)` y `exec({type:'setPageSetup'})` funcionan. La cinta refleja la selección (fuente, tamaño, estilo, negrita). |
| Comandos | ✅ | Negrita, cursiva, centrar, viñetas, deshacer, `insertTable` y `undo`: todos devuelven `ok`. |
| Fuentes del sistema → HarfBuzz | ✅ con ajuste | `fc-list` + bytes por IPC + `createFontSource` funcionan. **Las fuentes variables** (`[wdth,wght]`) solo admiten la instancia por defecto: hay que filtrar los índices de instancia con nombre (`index >> 16 != 0`), o el motor las rechaza. |
| Escribir con teclado real (incluidos `ñ` y `ú`) | ✅ | Con `sendInputEvent`. |
| Latencia por tecla | ✅ | Mediana de **21 ms** (8 páginas) y de **64 ms** (521 páginas). |
| Abrir | ✅ | De 0,6 a 1,7 s en documentos normales, 5,3 s con 35 páginas de listas y **11 s con 521 páginas**. |
| Round-trip sin editar | ✅ | 10/10: **ninguna parte perdida, binarios idénticos y XML semánticamente equivalente**. Única diferencia: un `w:id` renumerado. Las diferencias inocuas que se ignoran son indentación, `xml:space`, `w14:paraId` y prefijos de namespace. |
| Imprimir y PDF sin Pro (ventana oculta + `printToPDF`) | ✅ | Pinta **todas** las páginas (521/521). Orientación mixta correcta (A4 vertical + A4 horizontal) con `@page` con nombre sobre `.docx-page[data-page-index]`. Tiempos: 1 s (4 páginas), 13 s (308 páginas), 46 s (521 páginas). Fidelidad visual revisada a ojo. |
| Unidades de `getPageGeometry()` | ⚠️ | Vienen en **px CSS** (96 dpi), no en pt. Los `@page` deben usar px. |
| Las páginas del DOM se recrean al repintar | ⚠️ | No se deben marcar los elementos `.docx-page` con atributos propios; hay que usar el `data-page-index` del motor. |
| Corrector nativo de Chromium | ❌ | El motor fija `spellcheck="false"`. Al activarlo no apareció el subrayado; la prueba no es concluyente porque la ventana estaba inactiva. |
| Corrector propio (alternativa §7) | ✅ | `isWordMisspelled` (es+en) + `findMatches` + `setHighlights` con una clase CSS: subrayado rojo correcto. Tarda 35 ms en 540 palabras, pero **4 s en 521 páginas**, así que hace falta revisarlo de forma incremental (por párrafos cambiados o visibles). **Decisión: usar el corrector propio.** |
| Conteo de palabras | ✅ | `query({type:'paragraphs'})` funciona: 12.820 párrafos en el documento de 521 páginas. |
| Control de cambios y comentarios sin Pro | ✅ (esperado) | Se muestra el estado final, sin marcas ni globos. Al guardar se conservan `comments.xml` y las revisiones. En v1 bastará con una barra de aviso. |

## Pendiente: pruebas manuales que no se pueden automatizar aquí

1. **Abrir en Microsoft Word real** los archivos de `para-probar-en-word/` y confirmar que no aparece el aviso de "contenido ilegible". Es el criterio clave del plan.
2. **Teclas muertas e IME**: escribir `´` + `a` → `á` y `~` + `n` → `ñ` con teclado español en la app (`npm run dev`).
3. **Pegar** desde Word y desde LibreOffice: formato, listas e imágenes.
4. **Windows y macOS**: el índice de fuentes por SO (aquí solo se probó `fc-list` en Linux), el sandbox y el comportamiento general.

## Ajustes al plan surgidos del spike

- `optimizeDeps.exclude` debe incluir el core y el paquete de fuentes.
- El índice de fuentes debe filtrar las instancias con nombre de las fuentes variables.
- Imprimir y PDF: `@page` en px, con selectores sobre `data-page-index`.
- Corrector: el propio pasa a ser la opción principal, con revisión incremental.
- Linux: `chrome-sandbox` con SUID en el `.deb`; el AppImage necesita un perfil de AppArmor.
