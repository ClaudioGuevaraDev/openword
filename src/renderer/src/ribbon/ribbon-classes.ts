// Clases de Tailwind compartidas por los controles de la cinta.

const buttonBase =
  'tw:inline-flex tw:cursor-pointer tw:items-center tw:gap-1 tw:rounded-md tw:border tw:border-transparent tw:bg-transparent tw:text-fg tw:whitespace-nowrap tw:font-[family-name:inherit] tw:text-[12px] tw:transition-colors tw:duration-100 tw:hover:enabled:bg-hover tw:active:enabled:bg-pressed tw:focus-visible:outline-2 tw:focus-visible:outline-offset-1 tw:focus-visible:outline-spark tw:aria-pressed:not-[:hover:enabled]:border-pressed-line tw:aria-pressed:not-[:hover:enabled]:bg-pressed tw:disabled:cursor-default tw:disabled:opacity-40';

/** Botón pequeño (icono, con etiqueta opcional). */
export const button = `${buttonBase} tw:min-h-7 tw:px-[5px] tw:py-0.5`;

/** Botón grande: icono de 32 px sobre la etiqueta. */
export const buttonLarge = `${buttonBase} tw:h-16 tw:min-w-18 tw:grow tw:flex-col tw:justify-center tw:gap-1 tw:px-3 tw:py-1 tw:[&>span:first-child>svg]:size-8 tw:[&>span:first-child>svg]:text-accent`;

export const icon =
  'tw:relative tw:inline-flex tw:flex-col tw:items-center tw:leading-none tw:[&>svg]:size-5';

export const label = 'tw:text-[12px] tw:leading-[1.2]';

/** Etiqueta con flecha de menú ("Pegar ▾"): flex para que la flecha quede centrada con el texto. */
export const labelWithArrow = `${label} tw:inline-flex tw:items-center tw:gap-0.5`;

export const miniArrow = 'tw:size-3 tw:flex-none tw:text-muted';

const floating = 'tw:rounded-lg tw:border tw:border-line tw:text-fg tw:shadow-float';

export const palette = `${floating} tw:w-[236px] tw:bg-ribbon tw:p-3 tw:text-[12px]`;

export const paletteTitle = 'tw:mt-3 tw:mb-1.5 tw:font-semibold';

export const paletteWide =
  'tw:w-full tw:cursor-pointer tw:rounded-md tw:border tw:border-transparent tw:bg-transparent tw:px-2 tw:py-1.5 tw:text-left tw:text-inherit tw:font-[family-name:inherit] tw:text-[length:inherit] tw:hover:bg-hover';

export const menu = `${floating} tw:min-w-[180px] tw:bg-ribbon tw:p-1 tw:text-[12px]`;

export const menuItem =
  'tw:flex tw:w-full tw:cursor-pointer tw:items-center tw:rounded-md tw:border-0 tw:bg-transparent tw:py-1.5 tw:pr-3 tw:pl-1.5 tw:text-left tw:text-inherit tw:font-[family-name:inherit] tw:text-[length:inherit] tw:outline-none tw:focus:bg-hover tw:aria-disabled:cursor-default tw:aria-disabled:opacity-40';

export const menuCheck = 'tw:w-5 tw:shrink-0 tw:text-center';

export const menuSeparator = 'tw:my-1 tw:h-px tw:bg-line';

export const comboList = `${floating} tw:max-h-[360px] tw:overflow-y-auto tw:bg-ribbon tw:p-1`;

export const check =
  'tw:flex tw:items-center tw:gap-1.5 tw:px-1.5 tw:py-1 tw:text-[12px] tw:whitespace-nowrap';
