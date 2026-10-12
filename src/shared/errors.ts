// Utilidades para errores de tipo desconocido (lo que llega a un catch).

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function isErrnoException(error: unknown): error is Error & { code?: string } {
  return error instanceof Error && 'code' in error;
}

/** Código de error del sistema (ENOENT, EPERM…) o '' si no lo hay. */
export function errnoCode(error: unknown): string {
  return isErrnoException(error) ? (error.code ?? '') : '';
}
