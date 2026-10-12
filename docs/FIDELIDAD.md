# Fidelidad con Microsoft Word

OpenWord verifica la compatibilidad con Word en cuatro niveles. El primero corre en cada push y PR; el segundo y el tercero, al publicar una versión (o a mano, con el workflow E2E); el cuarto necesita Microsoft Word una sola vez.

| Nivel                       | Qué comprueba                                                                                                                                                                       | Cómo se ejecuta                                         |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 1. Corpus sin DOM           | Los 39 documentos de `tests/corpus` se leen y se escriben con el motor sin perder partes, con binarios idénticos y XML equivalente.                                                 | `pnpm run fidelity`                                     |
| 2. Corpus en la app         | Lo mismo, pero abriendo cada documento en OpenWord y usando "Guardar como" (el camino real del usuario). Incluye un documento creado desde cero con todas las funciones de la app.  | `pnpm run test:e2e` (`tests/e2e/corpus.spec.ts`)        |
| 3. Validación OOXML         | Los documentos guardados por OpenWord no tienen errores de esquema nuevos según el Open XML SDK de Microsoft (las reglas de Word). El documento creado desde cero no tiene ninguno. | Job `ooxml-validation` de `e2e.yml` (o en local, abajo) |
| 4. Paginación frente a Word | El PDF de OpenWord tiene las mismas páginas y los mismos saltos de página que el de Word.                                                                                           | `pnpm run fidelity:report`                              |

Si LibreOffice está instalado, las E2E también comprueban que abre y exporta a PDF los documentos guardados por OpenWord.

## Diferencias conocidas del motor

Están revisadas una por una y declaradas en `tests/fidelity/corpus.test.ts` y `tests/e2e/corpus.spec.ts`:

- **Marcadores duplicados:** dos marcadores `_GoBack` con el mismo nombre quedan con el mismo id. Es una entrada anómala; Word regenera ese marcador.
- **Controles de contenido vacíos:** se guardan con su texto de marcador de posición ("Click here to enter a date.", en inglés) y `<w:showingPlcHdr/>`, igual que los muestra Word.

Otras normalizaciones se consideran equivalentes y el comparador las ignora:

- Indentación y orden de atributos.
- Prefijos de namespace.
- `rsid`, `w14:paraId` y `xml:space`.
- Renumeración coherente de relaciones (`r:id`), marcadores y marcas de revisión.

Los estilos integrados de Word que el contenido usa y la plantilla no define (por ejemplo `FootnoteReference` o `TOC1`) se agregan al guardar con su definición estándar.

## Informe frente a Word (nivel 4)

1. En un equipo con Microsoft Word, abre cada documento de `tests/corpus/<carpeta>/<nombre>.docx` y elige **Archivo › Guardar como › PDF**.
2. Guarda el PDF como `tests/fidelity/word-reference/<carpeta>__<nombre>.pdf`, por ejemplo `libreoffice__footnote.pdf`.
3. Ejecuta `pnpm run fidelity:report`.
4. El informe queda en `tests/fidelity/report/report.md` y muestra, por documento:
   - páginas en OpenWord frente a Word;
   - cuántos saltos de página coinciden (misma primera y última palabra por página);
   - la primera página que difiere.

Conviene generar las referencias con las fuentes de Office instaladas (Calibri, Cambria, Aptos), ya que el documento se diseñó con ellas. En la máquina de OpenWord se mide con las fuentes reales si están instaladas y, si no, con sustitutos de métricas idénticas.

## Validación OOXML en local

```bash
dotnet build tools/ooxml-validator -c Release -o /tmp/validator
OPENWORD_CORPUS_OUT=/tmp/corpus-out pnpm exec playwright test corpus
OOXML_VALIDATOR=/tmp/validator/OoxmlValidator.dll node scripts/validate-ooxml.mjs /tmp/corpus-out
```

## Agregar un documento que falla

Cuando alguien reporta un documento que se ve mal o pierde contenido:

1. Con su permiso, agrega el documento a `tests/corpus/` con su licencia en `manifest.json`.
2. Si el problema es de paginación, agrega también su PDF de Word a `tests/fidelity/word-reference/`.
3. Corrige el problema, o declara la diferencia conocida con su explicación y repórtala al proyecto del motor.
