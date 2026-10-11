// Extrae las rutas de documentos de la línea de comandos (doble clic en un .docx,
// "Abrir con…", o una segunda instancia que nos reenvía sus argumentos).
import { extname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DOCUMENT_EXTENSIONS = new Set(['.docx', '.docm', '.dotx', '.dotm', '.doc', '.rtf', '.odt']);

export function extractDocumentPaths(argv: readonly string[], cwd: string): string[] {
  const out: string[] = [];
  for (const raw of argv.slice(1)) {
    if (!raw || raw.startsWith('-')) continue;
    let candidate = raw;
    if (/^file:\/\//i.test(candidate)) {
      try {
        candidate = fileURLToPath(candidate);
      } catch {
        continue;
      }
    }
    if (!DOCUMENT_EXTENSIONS.has(extname(candidate).toLowerCase())) continue;
    out.push(isAbsolute(candidate) ? candidate : resolve(cwd, candidate));
  }
  return [...new Set(out)];
}
