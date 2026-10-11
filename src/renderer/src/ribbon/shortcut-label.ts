/** "Mod+Shift+S" → "Ctrl+Mayús+S" (Win/Linux) o "⇧⌘S" (macOS), para los tooltips. */
export function shortcutLabel(
  combo: string,
  platform: 'darwin' | 'other',
  language: 'es' | 'en' = 'es',
): string {
  const parts = combo.split('+');
  const key = parts.pop() ?? '';
  if (platform === 'darwin') {
    const symbols: Record<string, string> = { Mod: '⌘', Shift: '⇧', Alt: '⌥', Ctrl: '⌃' };
    const order = ['Ctrl', 'Alt', 'Shift', 'Mod'];
    return (
      parts
        .sort((a, b) => order.indexOf(a) - order.indexOf(b))
        .map((p) => symbols[p] ?? p)
        .join('') + key
    );
  }
  const names: Record<string, string> = {
    Mod: 'Ctrl',
    Shift: language === 'es' ? 'Mayús' : 'Shift',
    Alt: 'Alt',
  };
  return [...parts.map((p) => names[p] ?? p), key].join('+');
}
