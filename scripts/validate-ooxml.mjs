// Valida con el Open XML SDK (las reglas de esquema de Word) cada documento del corpus y su
// versión guardada por OpenWord. Falla si el guardado introduce errores que el original no
// tenía (muchos documentos reales ya traen errores que Word tolera).
//
// Uso: node scripts/validate-ooxml.mjs <carpeta-de-guardados>
//   (los guardados los genera `OPENWORD_CORPUS_OUT=<carpeta> pnpm exec playwright test corpus`)
// Requiere el validador compilado: dotnet build tools/ooxml-validator -c Release -o <dir>
// y la variable OOXML_VALIDATOR=<dir>/OoxmlValidator.dll (DOTNET=ruta a dotnet, opcional).
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const savedDir = resolve(process.argv[2] ?? '');
const validator = process.env.OOXML_VALIDATOR;
const dotnet = process.env.DOTNET ?? 'dotnet';
if (!process.argv[2] || !validator) {
  console.error(
    'Uso: OOXML_VALIDATOR=<OoxmlValidator.dll> node scripts/validate-ooxml.mjs <carpeta-de-guardados>',
  );
  process.exit(2);
}

const corpus = resolve('tests/corpus');
const { documents } = JSON.parse(readFileSync(join(corpus, 'manifest.json'), 'utf8'));
const pairs = documents
  .map(({ file }) => ({ file, original: join(corpus, file), saved: join(savedDir, file.replace('/', '__')) }))
  .filter((p) => existsSync(p.saved));
if (pairs.length === 0) {
  console.error(`No hay documentos guardados en ${savedDir}`);
  process.exit(2);
}

const run = (files) =>
  JSON.parse(execFileSync(dotnet, [validator, ...files], { encoding: 'utf8', maxBuffer: 64 << 20 }));
// Documentos creados desde cero por las E2E (created__*.docx): deben validar sin errores.
const created = readdirSync(savedDir)
  .filter((f) => f.startsWith('created__') && f.endsWith('.docx'))
  .map((f) => join(savedDir, f));

const before = run(pairs.map((p) => p.original));
const after = run(pairs.map((p) => p.saved));

// Clave de un error sin índices de posición (cambian si el motor renumera o reordena).
const key = (e) => e.replace(/\[\d+\]/g, '');
const rows = [];
let failures = 0;
for (const p of pairs) {
  const a = before[p.original];
  const b = after[p.saved];
  if (b.error) {
    failures++;
    rows.push(`✘ ${p.file}: no se puede abrir el guardado (${b.error})`);
    continue;
  }
  const known = new Set((a.errors ?? []).map(key));
  const added = [...new Set(b.errors.map(key))].filter((e) => !known.has(e));
  if (added.length > 0) {
    failures++;
    rows.push(`✘ ${p.file}: ${added.length} error(es) nuevo(s)\n    ${added.slice(0, 5).join('\n    ')}`);
  } else {
    rows.push(
      `✓ ${p.file} (errores del original: ${a.errors?.length ?? `no abre: ${a.error}`}, del guardado: ${b.errors.length})`,
    );
  }
}
if (created.length > 0) {
  const result = run(created);
  for (const file of created) {
    const r = result[file];
    if (r.error || r.errors.length > 0) {
      failures++;
      rows.push(
        `✘ ${file}: ${r.error ?? `${r.errors.length} error(es)\n    ${r.errors.slice(0, 5).join('\n    ')}`}`,
      );
    } else {
      rows.push(`✓ ${file.split('/').pop()} (creado por OpenWord): sin errores`);
    }
  }
}
const total = pairs.length + created.length;
const summary = `${total - failures}/${total} documentos sin errores nuevos de validación OOXML`;
console.log([...rows, '', summary].join('\n'));
writeFileSync(join(savedDir, 'ooxml-validation.txt'), [...rows, '', summary].join('\n'));
process.exit(failures > 0 ? 1 : 0);
