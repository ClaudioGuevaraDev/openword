import { resolve } from 'node:path';
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {},
  preload: {
    build: {
      rollupOptions: { output: { format: 'cjs', entryFileNames: '[name].cjs' } },
    },
  },
  renderer: {
    plugins: [react()],
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
