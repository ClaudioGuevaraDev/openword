import { mkdtemp, readFile, rm, writeFile, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ConversionError, convertToDocx } from '../../src/main/libreoffice/convert';
import { findSoffice, sofficeCandidates, type DetectDeps } from '../../src/main/libreoffice/detect';

const deps = (over: Partial<DetectDeps>): DetectDeps => ({
  platform: 'linux',
  env: {},
  home: '/home/ana',
  isExecutable: async () => false,
  registryInstallPath: async () => null,
  ...over,
});

describe('detección de LibreOffice', () => {
  it('Windows: registro y Program Files', async () => {
    const list = await sofficeCandidates(
      deps({
        platform: 'win32',
        env: { ProgramFiles: 'C:\\Program Files' },
        registryInstallPath: async () => 'D:\\LO\\program',
      }),
    );
    expect(list[0]).toContain('LO');
    expect(list.some((p) => p.includes('Program Files') && p.endsWith('soffice.exe'))).toBe(true);
  });
  it('macOS: la app en /Applications', async () => {
    expect(await sofficeCandidates(deps({ platform: 'darwin' }))).toContain(
      '/Applications/LibreOffice.app/Contents/MacOS/soffice',
    );
  });
  it('Linux: PATH, snap y flatpak', async () => {
    const list = await sofficeCandidates(deps({ env: { PATH: '/usr/local/bin:/usr/bin' } }));
    expect(list).toContain('/usr/bin/soffice');
    expect(list).toContain('/snap/bin/libreoffice');
    expect(list).toContain('/var/lib/flatpak/exports/bin/org.libreoffice.LibreOffice');
  });
  it('devuelve el primero ejecutable, o null si no hay', async () => {
    expect(
      await findSoffice(
        deps({ env: { PATH: '/usr/bin' }, isExecutable: async (p) => p === '/snap/bin/libreoffice' }),
      ),
    ).toBe('/snap/bin/libreoffice');
    expect(await findSoffice(deps({}))).toBeNull();
  });
});

describe.skipIf(process.platform === 'win32')('convertToDocx (con un soffice simulado)', () => {
  let dir: string;
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ow-lo-'));
  });
  afterAll(() => rm(dir, { recursive: true, force: true }));

  /** Script que imita a soffice: escribe <outdir>/<nombre>.docx con contenido conocido. */
  async function fakeSoffice(body: string): Promise<string> {
    const path = join(dir, `soffice-${Math.random().toString(36).slice(2)}`);
    await writeFile(path, `#!/bin/sh\n${body}\n`);
    await chmod(path, 0o755);
    return path;
  }

  it('pasa perfil aislado y devuelve los bytes convertidos', async () => {
    const soffice = await fakeSoffice(
      'for a; do case "$prev" in --outdir) out="$a";; esac; prev="$a"; last="$a"; done\n' +
        'echo "$@" > "$out/../args.txt"; printf PKfake > "$out/documento.docx"; cp "$out/../args.txt" ' +
        join(dir, 'args.txt'),
    );
    const input = join(dir, 'viejo.doc');
    await writeFile(input, 'x');
    const bytes = await convertToDocx(soffice, input, join(dir, 'work'));
    expect(Buffer.from(bytes).toString()).toBe('PKfake');
    const args = await readFile(join(dir, 'args.txt'), 'utf8');
    expect(args).toContain('--headless');
    expect(args).toMatch(/-env:UserInstallation=file:\/\//);
    expect(args).toContain('docx:MS Word 2007 XML');
  });

  it('informa el error si LibreOffice falla o no genera salida', async () => {
    const input = join(dir, 'roto.rtf');
    await writeFile(input, 'x');
    await expect(convertToDocx(await fakeSoffice('exit 3'), input, join(dir, 'work'))).rejects.toBeInstanceOf(
      ConversionError,
    );
    await expect(convertToDocx(await fakeSoffice('exit 0'), input, join(dir, 'work'))).rejects.toThrow(
      'no generó',
    );
  });
});
