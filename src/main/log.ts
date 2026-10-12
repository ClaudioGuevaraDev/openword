// Registro de errores del proceso main: consola y, una vez configurado, un archivo en userData.
// No importa Electron para poder usarse desde módulos que se prueban en Node.
import { appendFile } from 'node:fs/promises';

let logFile: string | undefined;

export function configureLog(file: string): void {
  logFile = file;
}

export function logError(scope: string, error: unknown): void {
  const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error(`[${scope}]`, detail);
  if (!logFile) return;
  const line = `${new Date().toISOString()} [${scope}] ${detail}\n`;
  appendFile(logFile, line).catch(() => undefined); // si no se puede escribir el log, solo queda la consola
}

/** Para promesas lanzadas sin esperar: `void tarea().catch(logTo('ámbito'))`. */
export const logTo =
  (scope: string) =>
  (error: unknown): void =>
    logError(scope, error);
