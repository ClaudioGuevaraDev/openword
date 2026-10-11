// `npm run dev`: arranca electron-vite en modo desarrollo. En Linux agrega --noSandbox,
// porque Ubuntu 24.04+ no permite el sandbox SUID de Chromium fuera de un paquete instalado
// (los .deb de OpenWord sí lo usan). Los argumentos extra se pasan tal cual.
import { spawn } from 'node:child_process';

const args = [
  'electron-vite',
  'dev',
  ...(process.platform === 'linux' ? ['--noSandbox'] : []),
  ...process.argv.slice(2),
];
const child = spawn('npx', args, { stdio: 'inherit', shell: process.platform === 'win32' });
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
