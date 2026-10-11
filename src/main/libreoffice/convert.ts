// Conversión a .docx con LibreOffice en modo headless. Usa un perfil propio (no choca con
// un LibreOffice abierto), sin shell (execFile), con límite de tiempo, y trabaja en una
// carpeta dentro de userData (accesible también para LibreOffice de snap o flatpak).
import { execFile } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const TIMEOUT_MS = 120_000;

/**
 * Carpeta de trabajo que el LibreOffice instalado puede leer. Las versiones snap no ven /tmp
 * ni las carpetas ocultas del home (como ~/.config, donde vive userData): usan su propio
 * ~/snap/<nombre>/common. Flatpak, igual, con ~/.var/app/<id>/cache.
 */
export function conversionWorkRoot(soffice: string, home: string, userData: string): string {
  const snap = /^\/snap\/bin\/([^/.]+)/.exec(soffice);
  if (snap) return join(home, 'snap', snap[1]!, 'common', 'openword-conversion');
  const flatpak = /exports\/bin\/([^/]+)$/.exec(soffice);
  if (flatpak) return join(home, '.var', 'app', flatpak[1]!, 'cache', 'openword-conversion');
  return join(userData, 'conversion');
}

export class ConversionError extends Error {}

export async function convertToDocx(
  soffice: string,
  inputPath: string,
  workRoot: string,
): Promise<Uint8Array> {
  await mkdir(workRoot, { recursive: true });
  const dir = await mkdtemp(join(workRoot, 'conv-'));
  try {
    // Copia con nombre neutro: evita problemas con nombres raros o rutas sin permisos.
    const input = join(dir, `documento${extname(inputPath).toLowerCase() || '.doc'}`);
    await copyFile(inputPath, input);
    const outDir = join(dir, 'out');
    await mkdir(outDir);
    const args = [
      '--headless',
      '--norestore',
      '--nolockcheck',
      '--nodefault',
      '--nofirststartwizard',
      `-env:UserInstallation=${pathToFileURL(join(workRoot, 'perfil')).href}`,
      '--convert-to',
      'docx:MS Word 2007 XML',
      '--outdir',
      outDir,
      input,
    ];
    await new Promise<void>((resolve, reject) => {
      execFile(
        soffice,
        args,
        { timeout: TIMEOUT_MS, windowsHide: true, maxBuffer: 8 << 20 },
        (error, _stdout, stderr) => {
          if (error) {
            const killed = (error as NodeJS.ErrnoException & { killed?: boolean }).killed;
            reject(
              new ConversionError(
                killed
                  ? 'LibreOffice tardó demasiado en convertir el documento.'
                  : `LibreOffice no pudo convertir el documento. ${String(stderr).trim()}`.trim(),
              ),
            );
          } else resolve();
        },
      );
    });
    try {
      const buffer = await readFile(join(outDir, 'documento.docx'));
      return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    } catch {
      throw new ConversionError('LibreOffice no generó el documento convertido.');
    }
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
