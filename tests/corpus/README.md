# Corpus de fidelidad

Documentos `.docx` reales para comprobar que OpenWord los abre y los guarda sin perder nada. El origen y la licencia de cada archivo están en [`manifest.json`](manifest.json):

| Carpeta        | Origen                                       | Licencia   |
| -------------- | -------------------------------------------- | ---------- |
| `libreoffice/` | LibreOffice, `sw/qa/extras/ooxmlexport/data` | MPL-2.0    |
| `python-docx/` | python-docx, `tests/test_files`              | MIT        |
| `docx-editor/` | eigenpal/docx-editor v2.27.0, `e2e/fixtures` | Apache-2.0 |

Los archivos MPL-2.0 se usan solo como datos de prueba y no se distribuyen con la app.

Para agregar un documento:

1. Copia el archivo a la carpeta de su origen. Solo se aceptan licencias que permitan redistribuirlo.
2. Vuelve a generar `manifest.json` o agrega su entrada a mano.
3. Ejecuta `pnpm run fidelity`.

Cuando un usuario reporta un documento que se ve mal o pierde contenido, conviene agregarlo aquí (con su permiso) como caso de regresión.
