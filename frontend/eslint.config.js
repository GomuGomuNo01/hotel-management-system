import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

/**
 * Config ESLint « flat » (v9). Remplace l'absence de config qui rendait
 * `npm run lint` inopérant. Objectif : filet anti-régression sur les vrais
 * problèmes (hooks, variables non définies) sans noyer le code legacy sous le
 * style — les points de style restent en `warn`.
 */
export default [
  { ignores: ['dist/**', 'node_modules/**', 'test-results/**', 'playwright-report/**', 'coverage/**'] },

  js.configs.recommended,

  // Code applicatif (navigateur)
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // Vite + React 18 : pas besoin d'importer React, ni de PropTypes (pas de TS ici).
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // caughtErrors:'none' — un `catch (e) {}` sans usage de l'erreur est un
      // motif courant et volontaire ici ; on ne le signale pas.
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },

  // Tests Vitest + composants (navigateur + globals de test)
  {
    files: ['src/**/*.test.{js,jsx}', 'src/test/**/*.{js,jsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, ...globals.vitest },
    },
  },

  // Specs Playwright + fichiers de config (Node)
  {
    files: ['tests/**/*.{js,jsx}', '*.config.js'],
    languageOptions: {
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
  },
];
