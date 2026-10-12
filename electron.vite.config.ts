import { resolve } from 'node:path';
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const shared = { '@shared': resolve(__dirname, 'src/shared') };

export default defineConfig({
  // Sourcemaps de main y preload: trazas de error legibles en el registro y en las pruebas.
  // electron-builder excluye los .map del instalador (electron-builder.yml).
  main: {
    resolve: { alias: shared },
    build: { sourcemap: true },
  },
  preload: {
    resolve: { alias: shared },
    // Un preload con sandbox debe ser CommonJS y estar completamente empaquetado.
    build: {
      sourcemap: true,
      externalizeDeps: false,
      rollupOptions: { output: { format: 'cjs', entryFileNames: '[name].cjs' } },
    },
  },
  renderer: {
    resolve: { alias: { ...shared, '@renderer': resolve(__dirname, 'src/renderer/src') } },
    plugins: [react(), tailwindcss()],
    // Sin pre-empaquetar: el motor y sus fuentes ubican harfbuzz.wasm y los .ttf con import.meta.url.
    optimizeDeps: { exclude: ['@docx-editor.dev/core', '@docx-editor.dev/fonts'] },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
          print: resolve(__dirname, 'src/renderer/print.html'),
        },
      },
    },
  },
});
