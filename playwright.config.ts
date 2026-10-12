import { defineConfig } from '@playwright/test';

const CI = Boolean(process.env['CI']);

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  // El motor tarda en pintar en los runners de macOS: más margen que los 5 s por defecto.
  expect: { timeout: 10_000 },
  // Un solo worker: cada prueba arranca Electron completo y en paralelo compiten por CPU y GPU.
  fullyParallel: false,
  workers: 1,
  // Un `test.only` olvidado no debe reducir la suite en CI sin que nadie lo note.
  forbidOnly: CI,
  // En CI, un reintento: los runners de macOS a veces se cuelgan (el informe lo marca como "flaky").
  retries: CI ? 1 : 0,
  reporter: CI ? [['github'], ['list'], ['html', { open: 'never' }]] : 'list',
  // Traza de las pruebas que fallan (Playwright la graba también en apps de Electron).
  use: { trace: 'retain-on-failure' },
});
