import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/fidelity-report',
  timeout: 30 * 60_000,
  workers: 1,
  reporter: 'list',
});
