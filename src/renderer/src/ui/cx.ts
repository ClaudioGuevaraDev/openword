/** Une clases de Tailwind, descartando las vacías o condicionales falsas. */
export function cx(...classes: readonly (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
