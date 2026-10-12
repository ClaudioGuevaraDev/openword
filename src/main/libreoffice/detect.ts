// Busca LibreOffice instalado (opcional): se usa para abrir .doc, .rtf y .odt.
import { execFile } from 'node:child_process';
import { access, constants } from 'node:fs/promises';
import { homedir } from 'node:os';
import { delimiter, join } from 'node:path';

export interface DetectDeps {
  readonly platform: NodeJS.Platform;
  readonly env: NodeJS.ProcessEnv;
  readonly home: string;
  readonly isExecutable: (path: string) => Promise<boolean>;
  /** Windows: ruta de instalación según el registro (o null). */
  readonly registryInstallPath: () => Promise<string | null>;
}

const isExecutable = async (path: string) => {
  try {
    await access(path, process.platform === 'win32' ? constants.F_OK : constants.X_OK);
    return true;
  } catch {
    return false;
  }
};

function registryInstallPath(): Promise<string | null> {
  if (process.platform !== 'win32') return Promise.resolve(null);
  return new Promise((resolve) => {
    // Ruta absoluta: Windows buscaría antes «reg» en la carpeta actual que en el PATH.
    const reg = join(process.env['SystemRoot'] ?? 'C:\\Windows', 'System32', 'reg.exe');
    execFile(
      reg,
      ['query', 'HKLM\\SOFTWARE\\LibreOffice\\UNO\\InstallPath', '/ve'],
      { timeout: 5000, windowsHide: true },
      (err, out) => {
        if (err) return resolve(null);
        const match = /REG_SZ\s+(.+)$/m.exec(out);
        resolve(match?.[1]?.trim() ?? null);
      },
    );
  });
}

export const defaultDetectDeps = (): DetectDeps => ({
  platform: process.platform,
  env: process.env,
  home: homedir(),
  isExecutable,
  registryInstallPath,
});

/** Rutas candidatas, en orden de preferencia. */
export async function sofficeCandidates(deps: DetectDeps): Promise<string[]> {
  const list: string[] = [];
  if (deps.env['OPENWORD_SOFFICE']) list.push(deps.env['OPENWORD_SOFFICE']);
  if (deps.platform === 'win32') {
    const fromRegistry = await deps.registryInstallPath();
    if (fromRegistry) list.push(join(fromRegistry, 'soffice.exe'));
    for (const key of ['ProgramFiles', 'ProgramFiles(x86)', 'ProgramW6432']) {
      const base = deps.env[key];
      if (base) list.push(join(base, 'LibreOffice', 'program', 'soffice.exe'));
    }
  } else if (deps.platform === 'darwin') {
    list.push('/Applications/LibreOffice.app/Contents/MacOS/soffice');
    list.push(join(deps.home, 'Applications', 'LibreOffice.app', 'Contents', 'MacOS', 'soffice'));
  } else {
    for (const dir of (deps.env['PATH'] ?? '').split(delimiter).filter(Boolean)) {
      list.push(join(dir, 'soffice'), join(dir, 'libreoffice'));
    }
    list.push(
      '/usr/lib/libreoffice/program/soffice',
      '/opt/libreoffice/program/soffice',
      '/snap/bin/libreoffice',
      '/var/lib/flatpak/exports/bin/org.libreoffice.LibreOffice',
      join(deps.home, '.local', 'share', 'flatpak', 'exports', 'bin', 'org.libreoffice.LibreOffice'),
    );
  }
  return [...new Set(list)];
}

export async function findSoffice(deps: DetectDeps = defaultDetectDeps()): Promise<string | null> {
  // OPENWORD_SOFFICE=none: comportarse como si no estuviera instalado (pruebas).
  if (deps.env['OPENWORD_SOFFICE'] === 'none') return null;
  for (const candidate of await sofficeCandidates(deps)) {
    if (await deps.isExecutable(candidate)) return candidate;
  }
  return null;
}
