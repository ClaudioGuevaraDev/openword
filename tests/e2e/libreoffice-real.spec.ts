// Conversión con un LibreOffice REAL. Solo corre si está instalado (si no, se omite).
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { conversionWorkRoot } from '../../src/main/libreoffice/convert';
import { findSoffice } from '../../src/main/libreoffice/detect';
import { FIXTURES, waitForDocument, windowTitles } from './launch';
import { expect, test } from './fixtures';

test.describe('LibreOffice real', { tag: ['@slow', '@libreoffice'] }, () => {
  test.describe.configure({ mode: 'serial', timeout: 240_000 });
  let soffice: string | null = null;
  let dir = '';

  test.beforeAll(async () => {
    soffice = await findSoffice({
      platform: process.platform,
      env: { PATH: process.env['PATH'] ?? '', ProgramFiles: process.env['ProgramFiles'] ?? '' },
      home: homedir(),
      isExecutable: async (p) => existsSync(p),
      registryInstallPath: async () => null,
    });
    test.skip(!soffice, 'LibreOffice no está instalado');
    // Carpeta que también puede leer un LibreOffice de snap o flatpak.
    dir = join(conversionWorkRoot(soffice!, homedir(), join(homedir(), 'openword-e2e')), `e2e-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    copyFileSync(join(FIXTURES, 'issue-319-sections.docx'), join(dir, 'contrato.docx'));
    // LibreOffice genera los formatos antiguos a partir de un .docx real.
    for (const format of ['doc', 'rtf', 'odt']) {
      execFileSync(
        soffice!,
        [
          '--headless',
          '--norestore',
          `-env:UserInstallation=file://${join(dir, 'perfil')}`,
          '--convert-to',
          format,
          '--outdir',
          dir,
          join(dir, 'contrato.docx'),
        ],
        { timeout: 180_000, stdio: 'ignore' },
      );
      expect(existsSync(join(dir, `contrato.${format}`)), `LibreOffice generó contrato.${format}`).toBe(true);
    }
  });

  test.afterAll(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  for (const format of ['doc', 'rtf', 'odt']) {
    test(`abre un .${format} real convertido con LibreOffice`, async ({ launch }) => {
      const app = await launch({ args: [join(dir, `contrato.${format}`)], env: { OPENWORD_SOFFICE: '' } });
      const win = await app.firstWindow({ timeout: 180_000 });
      await waitForDocument(win);
      // La ventana aparece al instante con el aviso de conversión en curso.
      await expect(
        win.getByTestId('notice-converting').or(win.getByTestId('notice-converted')),
      ).toBeVisible();
      await expect(win.getByTestId('notice-converted')).toBeVisible({ timeout: 180_000 });
      await expect.poll(() => windowTitles(app)).toEqual(['contrato.docx - OpenWord']);
      await expect(win.locator('.docx-page').first()).toContainText('CLINICAL TRIAL AGREEMENT');
      await expect(win.getByTestId('status-page')).toHaveText(/de [3-6]$/);
    });
  }
});
