// Configuración de ESLint del repositorio web.
// Se ejecuta desde la raíz: npm run lint
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  // Carpetas que no se revisan
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/coverage/**'],
  },

  // Reglas base para todo el código JavaScript y TypeScript
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  // Web (React en el navegador)
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },

  // Archivos de configuración que corren en Node.js (vite.config.ts, etc.)
  {
    files: ['**/*.config.{js,cjs,mjs,ts}', '**/*.cjs'],
    languageOptions: { globals: { ...globals.node } },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
);
