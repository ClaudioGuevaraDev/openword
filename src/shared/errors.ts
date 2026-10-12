// Utilidades para errores de tipo desconocido (lo que llega a un catch).

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function isErrnoException(error: unknown): error is Error & { code?: string } {
  return error instanceof Error && 'code' in error;
}

/**
 * Mensaje de un error que viene de main por `ipcRenderer.invoke`, sin el prefijo técnico
 * que añade Electron ("Error invoking remote method 'canal': Error: …").
 */
export function remoteErrorMessage(error: unknown): string {
  return errorMessage(error).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
}

/** Código de error del sistema (ENOENT, EPERM…) o '' si no lo hay. */
export function errnoCode(error: unknown): string {
  return isErrnoException(error) ? (error.code ?? '') : '';
}
