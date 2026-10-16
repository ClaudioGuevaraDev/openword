# Distribución

`pnpm run package` genera los instaladores para el SO actual. **Salen sin firmar**: antes de entregarlos a usuarios finales hace falta firmarlos.

## Publicar una versión

1. Sube la versión en `package.json` (lo hace `/conventional-commit`) y haz push a `main`.
2. Crea y sube el tag con esa versión: `git tag v0.6.2 && git push origin v0.6.2`.
3. El workflow `release.yml`:
   - comprueba que el tag coincide con `package.json` (si no, falla en segundos);
   - corre las E2E en los 3 SO y la validación OOXML (`e2e.yml`);
   - **solo si pasan**, genera los instaladores de los 3 SO, que quedan como artifacts del run (`openword-<so>`).

Los pushes a `main` y los PR solo corren las comprobaciones rápidas (`ci.yml`: lint, tipos, unitarias y corpus). Para correr las E2E sin publicar una versión: Actions → E2E → Run workflow.

| SO      | Formatos                                   | Firma necesaria                                                                                                       |
| ------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Windows | Instalador NSIS (x64 y arm64), por usuario | Certificado Authenticode o Azure Trusted Signing. Sin firma, SmartScreen muestra "Windows protegió su PC".            |
| macOS   | `.dmg` y `.zip` (x64 y arm64)              | Apple Developer ID (99 USD/año) + notarización. Sin ella, Gatekeeper bloquea la app.                                  |
| Linux   | `.deb` (recomendado) y AppImage            | No es obligatoria. El `.deb` instala un perfil de AppArmor para que el sandbox de Chromium funcione en Ubuntu 24.04+. |

## Configurar la firma en el CI

- **macOS:**
  - `CSC_LINK`: el certificado .p12 en base64.
  - `CSC_KEY_PASSWORD`.
  - Para la notarización: `APPLE_API_KEY`, `APPLE_API_KEY_ID` y `APPLE_API_ISSUER`.
  - Quitar `CSC_IDENTITY_AUTO_DISCOVERY: 'false'` del job `package` de `release.yml`.
- **Windows:**
  - `CSC_LINK` y `CSC_KEY_PASSWORD` (Authenticode), o la configuración `azureSignOptions` de electron-builder para Azure Trusted Signing.

## Endurecimiento incluido

Electron Fuses: sin `RunAsNode`, sin `NODE_OPTIONS`, sin `--inspect`, con integridad ASAR y cargando la app solo desde el ASAR. El paquete no incluye `node_modules`, porque Vite empaqueta todo en `out/`.

## Actualizaciones automáticas

No están incluidas todavía. Se pueden agregar con `electron-updater` publicando las versiones en GitHub Releases o en un servidor propio. Requieren builds firmados.
