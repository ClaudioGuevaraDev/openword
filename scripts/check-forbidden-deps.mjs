// Falla si algún paquete con licencia comercial de EigenPal aparece en el árbol de dependencias.
import { readFileSync } from 'node:fs';

const FORBIDDEN = ['@docx-editor.dev/pro', '@docx-editor.dev/editor-api', '@docx-editor.dev/docx-to-pdf'];
const lock = readFileSync(new URL('../pnpm-lock.yaml', import.meta.url), 'utf8');
// En pnpm-lock.yaml cada paquete es una clave "  '<nombre>@<versión>':" (en packages: y snapshots:).
const found = [
  ...new Set(
    FORBIDDEN.flatMap((name) =>
      [...lock.matchAll(new RegExp(`^ {2}'?(${name.replace(/[.]/g, '\\.')}@[^':(]+)`, 'gm'))].map(
        (m) => m[1],
      ),
    ),
  ),
];
if (found.length > 0) {
  console.error(`Dependencias prohibidas (licencia comercial):\n  ${found.join('\n  ')}`);
  process.exit(1);
}
console.log('OK: sin paquetes Pro de docx-editor.');
