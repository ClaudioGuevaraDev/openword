import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { FIXTURES, mockDialogs, waitForDocument } from './launch';
import { applyStyle, clickDocument, expect, mod, saveAndRead, test as base } from './fixtures';

const test = base.extend<{ out: string }>({
  // Cada prueba empieza con el cursor en la página y "Guardar como" simulado hacia `out`.
  out: [
    async ({ app, win, workDir }, use) => {
      const out = join(workDir, 'resultado.docx');
      await mockDialogs(app, { save: out });
      await clickDocument(win);
      await use(out);
    },
    { auto: true },
  ],
});

/** PNG de 2×2 rojo, generado a mano (cabecera + IHDR + IDAT + IEND). */
function tinyPng(): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff]! ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(2, 0);
  ihdr.writeUInt32BE(2, 4);
  ihdr[8] = 8; // profundidad
  ihdr[9] = 2; // RGB
  const raw = Buffer.from([0, 255, 0, 0, 255, 0, 0, 0, 255, 0, 0, 255, 0, 0]);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** BMP de 2×2 azul (24 bits): el motor no lo acepta directo, la app lo convierte a PNG. */
function tinyBmp(): Buffer {
  const rowSize = 8; // 2 píxeles × 3 bytes + 2 de relleno
  const pixels = Buffer.alloc(rowSize * 2);
  for (const row of [0, 1]) for (const col of [0, 1]) pixels.set([255, 0, 0], row * rowSize + col * 3); // BGR
  const header = Buffer.alloc(54);
  header.write('BM', 0);
  header.writeUInt32LE(54 + pixels.length, 2);
  header.writeUInt32LE(54, 10);
  header.writeUInt32LE(40, 14);
  header.writeInt32LE(2, 18);
  header.writeInt32LE(2, 22);
  header.writeUInt16LE(1, 26);
  header.writeUInt16LE(24, 28);
  header.writeUInt32LE(pixels.length, 34);
  return Buffer.concat([header, pixels]);
}

test('insertar tabla 3×2 con la cuadrícula; la pestaña Tabla agrega y elimina filas', async ({
  app,
  win,
  out,
}) => {
  await win.getByRole('tab', { name: 'Insertar' }).click();
  await win.getByTestId('insert-table').click();
  await win.getByRole('gridcell', { name: 'Tabla de 3 × 2' }).click();
  await expect(win.getByRole('tab', { name: 'Tabla' })).toBeVisible();
  await win.getByRole('tab', { name: 'Tabla' }).click();
  await win.getByTestId('row-below').click();
  await win.getByTestId('col-right').click();
  const pkg = await saveAndRead(app, win, out);
  const xml = pkg['word/document.xml']!;
  expect(xml.match(/<w:tbl>/g)).toHaveLength(1);
  expect(xml.match(/<w:tr[ >]/g)).toHaveLength(3);
  expect(xml.match(/<w:gridCol /g)).toHaveLength(4);
});

test('eliminar tabla quita la pestaña contextual', async ({ win }) => {
  await win.getByRole('tab', { name: 'Insertar' }).click();
  await win.getByTestId('insert-table').click();
  await win.getByRole('gridcell', { name: 'Tabla de 2 × 2' }).click();
  await win.getByRole('tab', { name: 'Tabla' }).click();
  await win.getByTestId('delete-table').click();
  await expect(win.getByRole('tab', { name: 'Tabla' })).toHaveCount(0);
  await expect(win.getByRole('tab', { name: 'Inicio' })).toHaveAttribute('aria-selected', 'true');
});

test('insertar imágenes PNG y BMP (convertida a PNG) desde el diálogo', async ({
  app,
  win,
  out,
  workDir,
}) => {
  writeFileSync(join(workDir, 'roja.png'), tinyPng());
  writeFileSync(join(workDir, 'azul.bmp'), tinyBmp());
  await win.getByRole('tab', { name: 'Insertar' }).click();
  await mockDialogs(app, { save: out, open: [join(workDir, 'roja.png')] });
  await win.getByTestId('insert-image').click();
  await expect(win.locator('.docx-page').getByRole('img').first()).toBeVisible();
  // La imagen recién insertada queda seleccionada (como en Word): mover el cursor detrás.
  await win.keyboard.press('ArrowRight');
  await win.keyboard.press('End');
  await win.keyboard.press('Enter');
  await mockDialogs(app, { save: out, open: [join(workDir, 'azul.bmp')] });
  await win.getByRole('tab', { name: 'Insertar' }).click();
  await win.getByTestId('insert-image').click();
  await expect(win.locator('.docx-page').getByRole('img')).toHaveCount(2);
  await expect(win.getByTestId('notice-error')).toHaveCount(0);
  const pkg = await saveAndRead(app, win, out);
  const media = Object.keys(pkg).filter((name) => name.startsWith('word/media/'));
  expect(media).toEqual([expect.stringMatching(/\.png$/), expect.stringMatching(/\.png$/)]);
  expect(pkg['word/document.xml']!.match(/<w:drawing[\s>]/g) ?? []).toHaveLength(2);
});

test('salto de página y salto de sección (página siguiente)', async ({ app, win, out }) => {
  await win.keyboard.type('Página uno');
  await win.getByRole('tab', { name: 'Insertar' }).click();
  await win.getByTestId('insert-page-break').click();
  await win.keyboard.type('Página dos');
  await win.getByRole('tab', { name: 'Disposición' }).click();
  await win.getByTestId('layout-breaks').click();
  await win.getByRole('menuitem', { name: /Página siguiente/ }).click();
  await expect(win.getByTestId('status-page')).toHaveText(/de 3/);
  const xml = (await saveAndRead(app, win, out))['word/document.xml']!;
  expect(xml).toContain('<w:br w:type="page"/>');
  expect(xml.match(/<w:sectPr/g)?.length).toBeGreaterThanOrEqual(2);
});

test('encabezado: escribir, primera página diferente y cerrar', async ({ app, win, out }) => {
  await win.getByRole('tab', { name: 'Insertar' }).click();
  await win.getByTestId('insert-header').click();
  await expect(win.getByRole('tab', { name: 'Encabezado y pie de página' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await win.keyboard.type('Informe anual');
  await win.getByRole('checkbox', { name: 'Primera página diferente' }).check();
  await win.getByTestId('hf-close').click();
  await expect(win.getByRole('tab', { name: 'Encabezado y pie de página' })).toHaveCount(0);
  const pkg = await saveAndRead(app, win, out);
  const headers = Object.entries(pkg).filter(([name]) => /^word\/header\d+\.xml$/.test(name));
  expect(headers.map(([, xml]) => xml)).toContainEqual(expect.stringContaining('Informe anual'));
  expect(pkg['word/document.xml']).toContain('<w:titlePg');
});

test('número de página al final de la página crea un pie con el campo PAGE', async ({ app, win, out }) => {
  await win.getByRole('tab', { name: 'Insertar' }).click();
  await win.getByTestId('insert-page-number').click();
  await win.getByRole('menuitem', { name: 'Final de página' }).click();
  await win.getByTestId('hf-close').click();
  const pkg = await saveAndRead(app, win, out);
  const footers = Object.entries(pkg).filter(([name]) => /^word\/footer\d+\.xml$/.test(name));
  expect(footers.map(([, xml]) => xml)).toContainEqual(expect.stringMatching(/PAGE/));
});

test('Disposición: márgenes Estrecho, orientación horizontal y tamaño A4', async ({ app, win, out }) => {
  await win.getByRole('tab', { name: 'Disposición' }).click();
  await win.getByTestId('layout-margins').click();
  await win.getByRole('menuitemradio', { name: /Estrecho/ }).click();
  await win.getByTestId('layout-size').click();
  await win.getByRole('menuitemradio', { name: /\bA4\b/ }).click();
  await win.getByTestId('layout-orientation').click();
  await win.getByRole('menuitemradio', { name: 'Horizontal' }).click();
  const xml = (await saveAndRead(app, win, out))['word/document.xml']!;
  const pgMar = /<w:pgMar [^>]*>/.exec(xml)?.[0] ?? '';
  const pgSz = /<w:pgSz [^>]*>/.exec(xml)?.[0] ?? '';
  for (const side of ['top', 'bottom', 'left', 'right']) expect(pgMar).toContain(`w:${side}="720"`);
  expect(pgSz).toContain('w:w="16838"');
  expect(pgSz).toContain('w:h="11906"');
  expect(pgSz).toContain('w:orient="landscape"');
});

test('Disposición: sangría izquierda y espaciado antes', async ({ app, win, out }) => {
  await win.keyboard.type('Párrafo con sangría');
  await win.getByRole('tab', { name: 'Disposición' }).click();
  const unit = await win.evaluate(() =>
    window.openword.app.info().then((i) => (i.region === 'US' ? 'in' : 'cm')),
  );
  const indent = win.getByTestId('indent-left');
  await indent.fill(unit === 'in' ? '1' : '2,54');
  await indent.press('Enter');
  const before = win.getByTestId('space-before');
  await before.fill('12');
  await before.press('Enter');
  const xml = (await saveAndRead(app, win, out))['word/document.xml']!;
  expect(/<w:ind [^>]*>/.exec(xml)?.[0]).toContain('w:left="1440"');
  expect(/<w:spacing [^>]*>/.exec(xml)?.[0]).toContain('w:before="240"');
});

test('Referencias: tabla de contenido y nota al pie', async ({ app, win, out }) => {
  await win.keyboard.type('Introducción');
  await applyStyle(win, 'Título 1');
  await win.keyboard.press('End');
  await win.keyboard.press('Enter');
  await win.keyboard.type('Texto con nota');
  await win.getByRole('tab', { name: 'Referencias' }).click();
  await win.getByTestId('insert-footnote').click();
  await win.keyboard.type('Fuente de la nota');
  await clickDocument(win, { x: 150, y: 110 });
  await win.keyboard.press(`${mod}+Home`);
  await win.getByRole('tab', { name: 'Referencias' }).click();
  await win.getByTestId('insert-toc').click();
  const pkg = await saveAndRead(app, win, out);
  expect(pkg['word/document.xml']).toMatch(/TOC \\o/);
  expect(pkg['word/footnotes.xml']).toContain('Fuente de la nota');
});

test('vínculo: se crea desde la cinta y Ctrl+clic lo abre fuera solo si es http(s)', async ({
  app,
  win,
  out,
}) => {
  await win.keyboard.type('Sitio web');
  await win.keyboard.press(`${mod}+a`);
  await win.getByRole('tab', { name: 'Insertar' }).click();
  await win.getByTestId('insert-link').click();
  // El texto a mostrar se rellena con la selección, pero en CI a veces Ctrl+A aún no llegó al
  // motor: se escribe explícitamente para no depender de ello.
  await win.getByTestId('hyperlink-popup-text').fill('Sitio web');
  await win.getByPlaceholder('https://example.com').fill('https://example.com/openword');
  await win.getByRole('button', { name: 'Aplicar' }).click();
  // El motor solo abre el vínculo al hacer clic dentro de su <a>: se espera a que esté dibujado.
  const link = win.locator('.docx-page').getByRole('link', { name: 'Sitio web' }).first();
  await expect(link).toBeVisible();

  await app.evaluate(({ shell }) => {
    const g = globalThis as unknown as { __owExternal: string[] };
    g.__owExternal = [];
    shell.openExternal = (async (url: string) => {
      g.__owExternal.push(url);
    }) as typeof shell.openExternal;
  });
  await link.click({ modifiers: [mod] });
  await expect
    .poll(() => app.evaluate(() => (globalThis as unknown as { __owExternal: string[] }).__owExternal))
    .toEqual(['https://example.com/openword']);
  expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1);

  const pkg = await saveAndRead(app, win, out);
  expect(pkg['word/document.xml']).toContain('<w:hyperlink');
  expect(pkg['word/_rels/document.xml.rels']).toContain('https://example.com/openword');
});

test('pestaña Imagen: girar una imagen en línea; el ajuste explica por qué no aplica', async ({
  app,
  win,
  out,
  workDir,
}) => {
  writeFileSync(join(workDir, 'roja.png'), tinyPng());
  await mockDialogs(app, { save: out, open: [join(workDir, 'roja.png')] });
  await win.getByRole('tab', { name: 'Insertar' }).click();
  await win.getByTestId('insert-image').click();
  await win.locator('.docx-page').getByRole('img').first().click();
  await expect(win.getByRole('tab', { name: 'Formato de imagen' })).toHaveAttribute('aria-selected', 'true');
  await expect(win.getByTestId('image-wrap')).toBeDisabled();
  await expect(win.getByTestId('image-wrap')).toHaveAttribute(
    'title',
    /solo se puede cambiar en imágenes flotantes/,
  );
  await win.getByRole('button', { name: 'Girar 90° a la derecha' }).click();
  const xml = (await saveAndRead(app, win, out))['word/document.xml']!;
  expect(xml).toMatch(/rot="5400000"/);
});

test('pestaña Imagen: cambiar el ajuste de una imagen flotante', async ({ launch, workDir }) => {
  const path = join(workDir, 'flotante.docx');
  writeFileSync(path, readFileSync(join(FIXTURES, 'float-wrap-comprehensive-test.docx')));
  const floating = await launch({ args: [path] });
  const w = await floating.firstWindow();
  await waitForDocument(w);
  // Las imágenes del documento no tienen texto alternativo (alt=""): no tienen rol img.
  await w.locator('.docx-page img').first().click();
  await expect(w.getByRole('tab', { name: 'Formato de imagen' })).toHaveAttribute('aria-selected', 'true');
  await expect(w.getByTestId('image-wrap')).toBeEnabled();
  await w.getByTestId('image-wrap').click();
  await w.getByRole('menuitemradio', { name: /Arriba y abajo/ }).click();
  const pkg = await saveAndRead(floating, w, path);
  expect(pkg['word/document.xml']).toContain('<wp:wrapTopAndBottom');
});

test('imagen: al estirarla se ve una vista previa que sigue al marco; Esc la cancela', async ({
  launch,
  workDir,
}) => {
  const path = join(workDir, 'flotante.docx');
  writeFileSync(path, readFileSync(join(FIXTURES, 'float-wrap-comprehensive-test.docx')));
  const floating = await launch({ args: [path] });
  const w = await floating.firstWindow();
  await waitForDocument(w);
  const image = w.locator('.docx-page img').first();
  await image.click();
  const frame = w.getByRole('group', { name: 'Imagen seleccionada' });
  const preview = w.locator('.ow-image-drag-preview');
  const before = (await image.boundingBox())!;

  const drag = async (finish: () => Promise<void>) => {
    const handle = (await w
      .getByRole('button', { name: 'Cambiar tamaño de la esquina inferior derecha' })
      .boundingBox())!;
    await w.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await w.mouse.down();
    await w.mouse.move(handle.x + handle.width / 2 + 60, handle.y + handle.height / 2 + 40, { steps: 5 });
    // A mitad del arrastre, la copia ocupa exactamente el marco del motor.
    await expect(preview).toBeVisible();
    const [p, f] = [(await preview.boundingBox())!, (await frame.boundingBox())!];
    for (const key of ['x', 'y', 'width', 'height'] as const)
      expect(Math.abs(p[key] - f[key])).toBeLessThan(2);
    expect(f.width).toBeGreaterThan(before.width + 30);
    await finish();
    await expect(preview).toHaveCount(0);
  };

  // Esc cancela: la imagen no cambia.
  await drag(() => w.keyboard.press('Escape'));
  await w.mouse.up();
  expect((await image.boundingBox())!.width).toBeCloseTo(before.width, 0);

  // Al soltar, el motor aplica el tamaño nuevo.
  await drag(() => w.mouse.up());
  await expect.poll(async () => (await image.boundingBox())!.width).toBeGreaterThan(before.width + 30);
});

test('pestaña Tabla: bordes y sombreado de celda', async ({ app, win, out }) => {
  await win.getByRole('tab', { name: 'Insertar' }).click();
  await win.getByTestId('insert-table').click();
  await win.getByRole('gridcell', { name: 'Tabla de 2 × 2' }).click();
  await win.getByRole('tab', { name: 'Tabla' }).click();
  await win.getByTestId('table-borders').click();
  await win.getByRole('menuitem', { name: 'Bordes externos' }).click();
  await win.getByRole('button', { name: 'Sombreado' }).click();
  await win.getByRole('menuitem', { name: 'Amarillo claro' }).click();
  const xml = (await saveAndRead(app, win, out))['word/document.xml']!;
  expect(xml).toMatch(/<w:shd [^>]*w:fill="FFF2CC"/);
  expect(xml).toMatch(/<w:(top|tblBorders|tcBorders)/);
});
