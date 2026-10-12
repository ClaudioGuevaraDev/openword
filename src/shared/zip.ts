// Descompresión con tope: los tamaños declarados en el ZIP se suman antes de inflar nada,
// así un paquete diseñado para expandirse sin fin (zip bomb) se rechaza sin agotar la memoria.
import { unzipSync, type Unzipped } from 'fflate';

export const MAX_UNZIPPED_BYTES = 1024 * 1024 * 1024;

export class ZipTooLargeError extends Error {
  constructor() {
    super('El documento descomprimido supera el tamaño máximo admitido (1 GB).');
  }
}

export function unzipBounded(bytes: Uint8Array, limit = MAX_UNZIPPED_BYTES): Unzipped {
  let total = 0;
  return unzipSync(bytes, {
    filter: (file) => {
      total += file.originalSize;
      if (total > limit) throw new ZipTooLargeError();
      return true;
    },
  });
}
