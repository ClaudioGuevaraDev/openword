// `pnpm dev`: arranca electron-vite en modo desarrollo. En Linux agrega --noSandbox,
// porque Ubuntu 24.04+ no permite el sandbox SUID de Chromium fuera de un paquete instalado
// (los .deb de OpenWord sí lo usan). Los argumentos extra se pasan tal cual.
import { spawn } from 'node:child_process';

const args = [
  'exec',
  'electron-vite',
  'dev',
  ...(process.platform === 'linux' ? ['--noSandbox'] : []),
  ...process.argv.slice(2),
];
// pnpm deja en npm_execpath su propio ejecutable (binario nativo o script .js): se lanza
// directamente, sin shell, para que los argumentos no pasen por el intérprete de comandos.
const pnpm = process.env.npm_execpath;
const child = !pnpm
  ? spawn('pnpm', args, { stdio: 'inherit', shell: process.platform === 'win32' })
  : /\.[cm]?js$/.test(pnpm)
    ? spawn(process.execPath, [pnpm, ...args], { stdio: 'inherit' })
    : spawn(pnpm, args, { stdio: 'inherit' });
child.on('error', (error) => {
  console.error(`No se pudo iniciar pnpm: ${error.message}`);
  process.exit(1);
});
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
