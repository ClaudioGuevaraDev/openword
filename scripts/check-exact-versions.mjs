// Falla si alguna dependencia de package.json no tiene versión exacta (p. ej. "^1.2.3" o "~1.2.3").
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const SECTIONS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
const EXACT = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
const loose = SECTIONS.flatMap((section) =>
  Object.entries(pkg[section] ?? {})
    .filter(([, version]) => !EXACT.test(version))
    .map(([name, version]) => `${section}: ${name} ${version}`),
);
if (loose.length > 0) {
  console.error(`Dependencias sin versión exacta (usa "1.2.3", no "^1.2.3"):\n  ${loose.join('\n  ')}`);
  process.exit(1);
}
console.log('OK: todas las dependencias tienen versión exacta.');
