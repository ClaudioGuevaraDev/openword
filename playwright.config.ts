import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  // En CI, un reintento: los runners de macOS a veces se cuelgan (el informe lo marca como "flaky").
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['list']] : 'list',
  use: { trace: 'retain-on-failure' },
});
