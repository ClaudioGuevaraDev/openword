import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RecoveryStore } from '../../src/main/documents/recovery';

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ow-rec-'));
});
afterEach(() => rm(dir, { recursive: true, force: true }));

const ID1 = '11111111-aaaa-bbbb-cccc-000000000001';
const ID2 = '22222222-aaaa-bbbb-cccc-000000000002';

describe('RecoveryStore', () => {
  it('escribe, lista (más reciente primero), adopta y descarta', async () => {
    const store = new RecoveryStore(join(dir, 'recovery'));
    await store.write(ID1, new Uint8Array([1, 2]), {
      displayName: 'Informe.docx',
      filePath: '/docs/Informe.docx',
    });
    await new Promise((r) => setTimeout(r, 5));
    await store.write(ID2, new Uint8Array([3]), { displayName: 'Documento1', filePath: null });
    const list = await store.list();
    expect(list.map((d) => d.displayName)).toEqual(['Documento1', 'Informe.docx']);
    expect(Array.from(list[1]!.bytes)).toEqual([1, 2]);

    const newId = '33333333-aaaa-bbbb-cccc-000000000003';
    await store.adopt(ID1, newId);
    expect((await store.list()).map((d) => d.id).sort()).toEqual([ID2, newId].sort());
    await store.discard(newId);
    await store.discard(ID2);
    expect(await readdir(join(dir, 'recovery'))).toEqual([]);
  });

  it('rechaza ids que podrían salir de la carpeta y limpia copias incompletas', async () => {
    const store = new RecoveryStore(dir);
    await expect(
      store.write('../../evil', new Uint8Array([1]), { displayName: 'x', filePath: null }),
    ).rejects.toThrow();
    await store.write(ID1, new Uint8Array([1]), { displayName: 'x', filePath: null });
    await rm(join(dir, `${ID1}.docx`));
    expect(await store.list()).toEqual([]);
    expect(await readdir(dir)).toEqual([]);
  });
});
