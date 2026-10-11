// Word muestra los estilos integrados con su nombre localizado ("Heading 1" → "Título 1").
// Los identificadores y nombres en inglés son los estándar de OOXML (styles.xml).

type Translate = (key: string, options?: Record<string, unknown>) => string;

const BUILT_IN = new Set([
  'Normal',
  'Title',
  'Subtitle',
  'NoSpacing',
  'Quote',
  'IntenseQuote',
  'ListParagraph',
  'Emphasis',
  'Strong',
  'SubtleEmphasis',
  'IntenseEmphasis',
  'TOCHeading',
  'Caption',
  'Header',
  'Footer',
]);

/** Nombre localizado de un estilo integrado, o null si es un estilo propio del documento. */
export function builtInStyleName(styleId: string, name: string, t: Translate): string | null {
  const heading = /^(?:heading|título|titulo)\s*([1-9])$/i.exec(name) ?? /^Heading([1-9])$/.exec(styleId);
  if (heading) return t('styles.Heading', { n: heading[1] });
  const key = name.replace(/\s+/g, '');
  const normalized = key.toLowerCase() === 'tocheading' ? 'TOCHeading' : key;
  if (BUILT_IN.has(normalized)) return t(`styles.${normalized}`);
  if (BUILT_IN.has(styleId)) return t(`styles.${styleId}`);
  return null;
}
