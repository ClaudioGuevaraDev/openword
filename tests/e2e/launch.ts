import { _electron as electron, type ElectronApplication } from '@playwright/test';
import { resolve } from 'node:path';

/** Arranca el build de producción (out/) tal como lo vería el usuario. */
export async function launchApp(extraArgs: string[] = []): Promise<ElectronApplication> {
  const args = [resolve(__dirname, '../../out/main/index.js'), ...extraArgs];
  // Ubuntu restringe el sandbox SUID de Chromium fuera de los paquetes instalados.
  if (process.platform === 'linux') args.push('--no-sandbox');
  return electron.launch({ args, env: { ...process.env, ELECTRON_ENABLE_LOGGING: '0' } });
}
