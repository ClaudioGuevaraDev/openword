# OpenWord: instrucciones para Claude

## Regla: `/conventional-commit` también sube la versión

Cuando el usuario pida ejecutar la skill `/conventional-commit`, además de generar el commit hay que subir la versión de la app **en todos los lugares donde aparece**, en el mismo commit.

La versión sigue el formato `A.B.C`. **Solo se puede subir `B` o `C`; `A` nunca se modifica**, aunque el cambio sea incompatible (breaking change).

| Tipo de commit (Conventional Commits)                                                | Qué se sube           | Ejemplo       |
| ------------------------------------------------------------------------------------ | --------------------- | ------------- |
| `feat`, o cualquier cambio con `!` / `BREAKING CHANGE`                               | `B`, y `C` vuelve a 0 | 0.1.3 → 0.2.0 |
| `fix`, `perf`, `refactor`, `docs`, `style`, `test`, `build`, `ci`, `chore`, `revert` | `C`                   | 0.1.3 → 0.1.4 |

Lugares donde vive la versión (deben quedar todos iguales):

- `package.json` → `"version"` (es la que muestra la app con `app.getVersion()` y la que usan los instaladores).
- `pnpm-lock.yaml` no guarda la versión del proyecto: no hay que tocarlo.

Si en el futuro la versión aparece en otro archivo (README, documentación, `electron-builder.yml`…), también se actualiza ahí. Antes de confirmar, se busca la versión anterior en el repositorio (sin `node_modules`) para no dejar ninguna desactualizada.

## Regla: las librerías se instalan en versión exacta

Toda dependencia nueva o actualizada se fija a **versión exacta** (`"1.2.3"`), nunca con rangos (`^1.2.3`, `~1.2.3`, `*`, `latest`).

- Usar pnpm, el gestor del proyecto: `pnpm add -E paquete@1.2.3` o `pnpm add -D -E paquete@1.2.3`. `saveExact: true` en `pnpm-workspace.yaml` ya lo hace por defecto, pero se pasa `-E` igual y se indica la versión explícitamente.
- Antes de instalar, consultar la versión con `pnpm view paquete version` y elegir una concreta. Si la librería tiene dependencias peer, deben ser compatibles con las versiones que ya usa el proyecto.
- Después de instalar, revisar que `package.json` quedó sin `^` ni `~` y ejecutar `pnpm run check:deps`, que falla si alguna dependencia no tiene versión exacta.
