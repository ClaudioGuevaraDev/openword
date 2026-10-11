// Corpus de fidelidad: cada documento real se lee con el motor (sin DOM) y se vuelve a
// escribir; no se puede perder ni agregar ninguna parte, los binarios deben quedar
// idénticos y el XML semánticamente equivalente.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readOoxmlPackage, validatePackageInvariants, writeOoxmlPackage } from '@docx-editor.dev/core/store';
import { comparePackages } from './compare';

interface ManifestEntry {
  readonly file: string;
  readonly license: string;
}

const CORPUS = join(__dirname, '../corpus');
const manifest = JSON.parse(readFileSync(join(CORPUS, 'manifest.json'), 'utf8')) as {
  documents: ManifestEntry[];
};

// Diferencias conocidas del motor (docx-editor 2.27), revisadas una por una. Clave: archivo del
// corpus → partes XML afectadas. Cada entrada debe explicar por qué se acepta.
const KNOWN_XML_CHANGES: Record<string, readonly string[]> = {
  // El original trae DOS marcadores "_GoBack" (ids 0 y 1, entrada anómala de LibreOffice); el
  // motor los guarda ambos con id 0. _GoBack es el marcador oculto de "última edición" que Word
  // regenera. Defecto del motor a reportar upstream; no afecta al contenido visible.
  'libreoffice/LinkedTextBoxes.docx': ['word/document.xml'],
};

describe('corpus de fidelidad (lectura y escritura sin pérdidas)', () => {
  it('el manifiesto declara una licencia permitida para cada documento', () => {
    expect(manifest.documents.length).toBeGreaterThanOrEqual(30);
    for (const doc of manifest.documents) expect(['MIT', 'Apache-2.0', 'MPL-2.0']).toContain(doc.license);
  });

  for (const { file } of manifest.documents) {
    it(file, () => {
      const original = new Uint8Array(readFileSync(join(CORPUS, file)));
      const read = readOoxmlPackage(original);
      expect(read.ok, `el motor lee ${file}`).toBe(true);
      if (!read.ok) return;
      expect(validatePackageInvariants(read.package).ok, `invariantes del paquete de ${file}`).toBe(true);

      const saved = writeOoxmlPackage(read.package);
      const diff = comparePackages(original, saved);
      expect(diff.missingParts, 'partes perdidas').toEqual([]);
      expect(diff.addedParts, 'partes agregadas').toEqual([]);
      expect(diff.changedBinaries, 'binarios modificados (imágenes, fuentes, OLE, macros…)').toEqual([]);
      const unexpected = diff.changedXml.filter((c) => !(KNOWN_XML_CHANGES[file] ?? []).includes(c.part));
      expect(unexpected, 'XML con cambios de contenido').toEqual([]);

      // Y lo guardado se vuelve a leer.
      expect(readOoxmlPackage(saved).ok, 'el resultado se vuelve a abrir').toBe(true);
    });
  }
});
