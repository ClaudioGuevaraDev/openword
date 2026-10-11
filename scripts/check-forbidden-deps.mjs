// Falla si algún paquete con licencia comercial de EigenPal aparece en el árbol de dependencias.
import { readFileSync } from 'node:fs';

const FORBIDDEN = ['@docx-editor.dev/pro', '@docx-editor.dev/editor-api', '@docx-editor.dev/docx-to-pdf'];
const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
const found = Object.keys(lock.packages ?? {}).filter((path) =>
  FORBIDDEN.some((name) => path === `node_modules/${name}` || path.endsWith(`/node_modules/${name}`)),
);
if (found.length > 0) {
  console.error(`Dependencias prohibidas (licencia comercial):\n  ${found.join('\n  ')}`);
  process.exit(1);
}
console.log('OK: sin paquetes Pro de docx-editor.');
