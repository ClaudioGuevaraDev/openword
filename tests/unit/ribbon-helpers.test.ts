import { describe, expect, it } from 'vitest';
import { shortcutLabel } from '../../src/renderer/src/ribbon/shortcut-label';
import { builtInStyleName } from '../../src/renderer/src/ribbon/controls/style-names';

const es = (key: string, opts?: Record<string, unknown>) =>
  (
    ({
      'styles.Heading': `Título ${String(opts?.['n'])}`,
      'styles.Title': 'Título',
      'styles.NoSpacing': 'Sin espaciado',
    }) as Record<string, string>
  )[key] ?? key;

describe('shortcutLabel', () => {
  it('Windows/Linux en español e inglés', () => {
    expect(shortcutLabel('Mod+Shift+S', 'other', 'es')).toBe('Ctrl+Mayús+S');
    expect(shortcutLabel('Mod+Shift+S', 'other', 'en')).toBe('Ctrl+Shift+S');
  });
  it('macOS con símbolos en el orden de Apple', () => {
    expect(shortcutLabel('Mod+Shift+S', 'darwin')).toBe('⇧⌘S');
    expect(shortcutLabel('Mod+Alt+C', 'darwin')).toBe('⌥⌘C');
  });
});

describe('builtInStyleName', () => {
  it('traduce los estilos integrados de Word', () => {
    expect(builtInStyleName('Heading1', 'heading 1', es)).toBe('Título 1');
    expect(builtInStyleName('Ttulo2', 'Título 2', es)).toBe('Título 2');
    expect(builtInStyleName('Title', 'Title', es)).toBe('Título');
    expect(builtInStyleName('NoSpacing', 'No Spacing', es)).toBe('Sin espaciado');
  });
  it('deja intactos los estilos propios del documento', () => {
    expect(builtInStyleName('MiEstilo', 'Mi estilo corporativo', es)).toBeNull();
  });
});
