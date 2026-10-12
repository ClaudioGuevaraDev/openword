// Variables de entorno que entiende OpenWord, validadas una sola vez al arrancar. Un valor
// inválido se ignora (como si no estuviera). Las de pruebas solo valen fuera del instalador.
import { z } from 'zod';

const EnvSchema = z.object({
  /** URL del servidor de Vite (la define electron-vite en desarrollo). */
  ELECTRON_RENDERER_URL: z.url().optional().catch(undefined),
  /** Carpeta de datos alternativa (pruebas E2E aisladas). */
  OPENWORD_USER_DATA: z.string().min(1).optional().catch(undefined),
  /** Intervalo de recuperación automática en ms (pruebas). */
  OPENWORD_AUTORECOVER_MS: z.coerce.number().int().min(100).max(3_600_000).optional().catch(undefined),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export function readEnv(env: NodeJS.ProcessEnv, packaged: boolean): AppEnv {
  const parsed = EnvSchema.parse(env);
  if (!packaged) return parsed;
  return { OPENWORD_USER_DATA: parsed.OPENWORD_USER_DATA };
}
