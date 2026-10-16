import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['out/**', 'dist/**', 'node_modules/**', 'test-results/**', 'playwright-report/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: { globals: globals.browser },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: [
      'src/main/**/*.ts',
      'src/preload/**/*.ts',
      'scripts/**/*.{js,mjs}',
      'tests/**/*.ts',
      '*.config.{js,mjs,ts}',
    ],
    languageOptions: { globals: globals.node },
  },
  {
    // E2E: sin esperas fijas, aserciones que reintentan, nada de test.only olvidados.
    ...playwright.configs['flat/recommended'],
    files: ['tests/e2e/**/*.ts', 'tests/fidelity-report/**/*.ts'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      // Las pruebas de este proyecto comprueban también el disco y el proceso main.
      'playwright/no-conditional-in-test': 'off',
      'playwright/no-conditional-expect': 'off',
      // Saltar según el SO o si falta LibreOffice es legítimo; un .skip() sin condición, no.
      'playwright/no-skipped-test': ['error', { allowConditional: true }],
      // Ayudantes de las pruebas que hacen sus propias aserciones.
      'playwright/expect-expect': [
        'warn',
        { assertFunctionNames: ['expectSurfaceFits', 'expectNothingChanged'] },
      ],
    },
  },
  {
    // Reglas con información de tipos: una promesa sin await ni .catch puede tragarse un error
    // (o, en main, terminar como rechazo no manejado).
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.ts'],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
    },
  },
  {
    rules: {
      // Los paquetes Pro de docx-editor tienen licencia comercial: prohibidos en el código.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@docx-editor.dev/pro',
                '@docx-editor.dev/pro/*',
                '@docx-editor.dev/editor-api',
                '@docx-editor.dev/editor-api/*',
                '@docx-editor.dev/docx-to-pdf',
                '@docx-editor.dev/docx-to-pdf/*',
              ],
              message: 'Paquete con licencia comercial EigenPal Pro: no se usa en OpenWord.',
            },
          ],
        },
      ],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
