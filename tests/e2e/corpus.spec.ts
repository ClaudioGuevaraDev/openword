// Corpus por el camino real del usuario: abrir en OpenWord y "Guardar como" sin editar.
// No se puede perder ni agregar ninguna parte y el XML debe ser equivalente.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { comparePackages } from '../fidelity/compare';
import { conversionWorkRoot } from '../../src/main/libreoffice/convert';
import { findSoffice } from '../../src/main/libreoffice/detect';
import { closeAll, launchApp, mockDialogs, waitForDocument } from './launch';
import { clickDocument, expect, mod, test } from './fixtures';

const CORPUS = join(__dirname, '../corpus');
const manifest = JSON.parse(readFileSync(join(CORPUS, 'manifest.json'), 'utf8')) as {
  documents: { file: string }[];
};
// Diferencias conocidas del motor (ver también tests/fidelity/corpus.test.ts):
const KNOWN: Record<string, readonly string[]> = {
  // Dos marcadores "_GoBack" duplicados en el original quedan con el mismo id.
  'libreoffice/LinkedTextBoxes.docx': ['word/document.xml'],
  // Un control de contenido de fecha VACÍO se guarda con el texto de marcador de posición
  // ("Click here to enter a date.", en inglés) y <w:showingPlcHdr/>, como lo muestra Word.
  'docx-editor/form-controls-catalog.docx': ['word/document.xml'],
};
// OPENWORD_CORPUS_OUT: carpeta donde quedan los guardados (la usa la validación OOXML en CI).
const CORPUS_OUT = process.env['OPENWORD_CORPUS_OUT'];

async function findSofficeHere(): Promise<string | null> {
  return findSoffice({
    platform: process.platform,
    env: { PATH: process.env['PATH'] ?? '', ProgramFiles: process.env['ProgramFiles'] ?? '' },
    home: homedir(),
    isExecutable: async (p) => existsSync(p),
    registryInstallPath: async () => null,
  });
}

// En serie: la exportación con LibreOffice del final usa los archivos que guardan las anteriores.
test.describe('corpus: abrir y guardar sin editar en la app', { tag: '@slow' }, () => {
  test.describe.configure({ mode: 'serial' });
  let app: Awaited<ReturnType<typeof launchApp>>;
  let out = '';

  test.beforeAll(async () => {
    out = CORPUS_OUT ?? mkdtempSync(join(tmpdir(), 'ow-corpus-'));
    mkdirSync(out, { recursive: true });
    app = await launchApp();
    await waitForDocument(await app.firstWindow());
  });

  test.afterAll(async () => {
    await closeAll(app);
    rmSync(app.userData, { recursive: true, force: true, maxRetries: 3 });
    if (out && !CORPUS_OUT) rmSync(out, { recursive: true, force: true });
  });

  for (const { file } of manifest.documents) {
    test(file, async () => {
      const target = join(out, file.replace('/', '__'));
      // Cada documento en su propia ventana (o en la del Documento1 sin tocar, que se reutiliza);
      // se busca la que muestra ese archivo. Se guarda con Ctrl+Mayús+S y se cierra.
      await mockDialogs(app, { open: [join(CORPUS, file)], save: target });
      const first = app.windows()[0]!;
      await first.evaluate(() => window.openword.file.openDialog());
      const findWindow = async () => {
        for (const page of app.windows()) {
          const name = await page
            .evaluate(() => window.openword.doc.current().then((d) => d.displayName))
            .catch(() => null);
          if (name === basename(file)) return page;
        }
        return null;
      };
      await expect.poll(async () => (await findWindow()) !== null, { timeout: 30_000 }).toBe(true);
      const win = (await findWindow())!;
      await waitForDocument(win);
      await win.keyboard.press(`${mod}+Shift+s`);
      await expect.poll(() => existsSync(target), { timeout: 30_000 }).toBe(true);

      const diff = comparePackages(
        new Uint8Array(readFileSync(join(CORPUS, file))),
        new Uint8Array(readFileSync(target)),
      );
      expect(diff.missingParts, 'partes perdidas').toEqual([]);
      expect(diff.addedParts, 'partes agregadas').toEqual([]);
      expect(diff.changedBinaries, 'binarios modificados').toEqual([]);
      expect(
        diff.changedXml.filter((c) => !(KNOWN[file] ?? []).includes(c.part)),
        'XML con cambios de contenido',
      ).toEqual([]);

      if (win !== first)
        await app.evaluate(
          ({ BrowserWindow }, title) =>
            BrowserWindow.getAllWindows()
              .find((w) => w.getTitle().startsWith(title))
              ?.destroy(),
          basename(target),
        );
    });
  }

  test(
    'LibreOffice abre y exporta a PDF los documentos guardados por OpenWord (si está instalado)',
    { tag: '@libreoffice' },
    async () => {
      test.setTimeout(600_000);
      const soffice = await findSofficeHere();
      test.skip(!soffice, 'LibreOffice no está instalado');
      const work = join(
        conversionWorkRoot(soffice!, homedir(), join(homedir(), 'openword-e2e')),
        `pdf-${Date.now()}`,
      );
      mkdirSync(work, { recursive: true });
      try {
        const saved = manifest.documents
          .map((d) => join(out, d.file.replace('/', '__')))
          .filter((f) => existsSync(f))
          .slice(0, 8);
        expect(saved.length, 'faltan los guardados de las pruebas anteriores del corpus').toBeGreaterThan(0);
        for (const file of saved) copyFileSync(file, join(work, basename(file)));
        execFileSync(
          soffice!,
          [
            '--headless',
            '--norestore',
            `-env:UserInstallation=file://${join(work, 'perfil')}`,
            '--convert-to',
            'pdf',
            '--outdir',
            join(work, 'pdf'),
            ...saved.map((f) => join(work, basename(f))),
          ],
          { timeout: 540_000, stdio: 'ignore' },
        );
        for (const file of saved) {
          const pdf = join(work, 'pdf', basename(file).replace(/\.docx$/, '.pdf'));
          expect(existsSync(pdf), `LibreOffice abrió ${basename(file)}`).toBe(true);
        }
      } finally {
        rmSync(work, { recursive: true, force: true });
      }
    },
  );
});

test(
  'documento creado desde cero con todas las funciones de la app (se valida con el Open XML SDK)',
  { tag: '@slow' },
  async ({ app, win, workDir }) => {
    test.setTimeout(120_000);
    const page = win.locator('.docx-page').first();
    await clickDocument(win);
    const type = async (text: string) => {
      await win.keyboard.type(text);
      await expect(page).toContainText(text.trim());
    };

    await type('Informe de prueba');
    await win.getByTestId('style-gallery').getByRole('button', { name: 'Título 1', exact: true }).click();
    await win.keyboard.press('End');
    await win.keyboard.press('Enter');
    await type('Texto en negrita y con color ');
    await win.keyboard.press('Shift+Home');
    await win.getByRole('button', { name: 'Negrita', exact: true }).click();
    await win.getByLabel('Color de fuente: más colores').click();
    await win.getByRole('button', { name: 'Rojo oscuro' }).click();
    await win.keyboard.press('End');
    await win.keyboard.press('Enter');
    await win.getByRole('button', { name: 'Viñetas' }).click();
    await type('Primer punto');
    await win.keyboard.press('Enter');
    await type('Segundo punto');
    await win.keyboard.press('Enter');
    await win.keyboard.press('Enter');

    await win.getByRole('tab', { name: 'Insertar' }).click();
    await win.getByTestId('insert-table').click();
    await win.getByRole('gridcell', { name: 'Tabla de 3 × 2' }).click();
    await type('Celda');
    await win.keyboard.press(`${mod}+End`);
    await win.getByRole('tab', { name: 'Insertar' }).click();
    await win.getByTestId('insert-link').click();
    await win.getByPlaceholder('Texto que se mostrará').fill('Sitio de ejemplo');
    await win.getByPlaceholder('https://example.com').fill('https://example.com/openword');
    await win.getByRole('button', { name: 'Aplicar' }).click();
    await win.getByRole('tab', { name: 'Referencias' }).click();
    await win.getByTestId('insert-footnote').click();
    await win.keyboard.type('Nota al pie de prueba');
    await clickDocument(win);
    await win.keyboard.press(`${mod}+End`);
    await win.getByRole('tab', { name: 'Insertar' }).click();
    await win.getByTestId('insert-page-break').click();
    await win.getByRole('tab', { name: 'Insertar' }).click();
    await win.getByTestId('insert-page-number').click();
    await win.getByRole('menuitem', { name: 'Página X de Y' }).click();
    await win.getByTestId('hf-close').click();
    await win.keyboard.press(`${mod}+Home`);
    await win.getByRole('tab', { name: 'Referencias' }).click();
    await win.getByTestId('insert-toc').click();
    await win.getByRole('tab', { name: 'Disposición' }).click();
    await win.getByTestId('layout-margins').click();
    await win.getByRole('menuitemradio', { name: /Moderado/ }).click();

    // Con OPENWORD_CORPUS_OUT queda junto a los del corpus para la validación OOXML en CI.
    const dir = CORPUS_OUT ?? workDir;
    mkdirSync(dir, { recursive: true });
    const target = join(dir, 'created__todas-las-funciones.docx');
    await mockDialogs(app, { save: target });
    await win.keyboard.press(`${mod}+s`);
    await expect.poll(() => existsSync(target), { timeout: 30_000 }).toBe(true);
  },
);
