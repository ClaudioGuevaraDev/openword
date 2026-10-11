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
- `.doc`, `.rtf` y `.odt` muestran un aviso: la conversión con LibreOffice llega en el hito 7.

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
