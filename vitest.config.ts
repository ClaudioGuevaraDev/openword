import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@renderer': resolve(__dirname, 'src/renderer/src'),
    },
  },
  test: {
    environment: 'node',
    // Dos proyectos con la misma configuración base (alias, entorno):
    // `pnpm test` corre solo unit; `pnpm fidelity`, el corpus contra LibreOffice.
    projects: [
      { extends: true, test: { name: 'unit', include: ['tests/unit/**/*.test.ts'] } },
      {
        extends: true,
        test: { name: 'fidelity', include: ['tests/fidelity/**/*.test.ts'], testTimeout: 60_000 },
      },
    ],
    coverage: {
      provider: 'v8',
      // Lo que cubren las pruebas unitarias; el renderer con React se cubre con E2E.
      include: ['src/main/**/*.ts', 'src/shared/**/*.ts', 'src/renderer/src/**/*.ts'],
      exclude: ['**/*.d.ts', 'src/main/index.ts'],
      reporter: ['text-summary', 'html', 'json-summary'],
      reportsDirectory: 'coverage',
      // Umbral de partida (por debajo de lo actual): evita retrocesos sin bloquear.
      thresholds: { lines: 40, functions: 30, branches: 45, statements: 40 },
    },
  },
});
