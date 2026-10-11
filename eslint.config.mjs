import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['out/**', 'dist/**', 'spike/**', 'node_modules/**', 'test-results/**', 'playwright-report/**'],
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
