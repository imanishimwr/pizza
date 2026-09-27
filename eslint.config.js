import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

/**
 * Flat config. The two rules that matter most here are `react-hooks/rules-of-hooks`
 * and `react-hooks/exhaustive-deps` — they are what let us prove the "hooks after
 * an early return" crashes are gone rather than asserting it by hand.
 */
export default [
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'Pizza-Backend/**'] },

  js.configs.recommended,

  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true }
      }
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,

      // The app is function components only.
      'react/prop-types': 'off',

      // Keys, hooks and dead code are errors, not warnings.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^[A-Z_]', ignoreRestSiblings: true }
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-return-await': 'error',
      'no-throw-literal': 'error',
      'no-template-curly-in-string': 'error',

      // Injection sinks. The app must never inject user data as raw HTML.
      'react/no-danger': 'error',
      'react/jsx-no-target-blank': 'error',

      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }]
    }
  },

  {
    // Vitest globals.
    files: ['**/*.test.{js,jsx}'],
    languageOptions: { globals: { ...globals.node } }
  },

  {
    files: ['*.config.js', 'eslint.config.js', 'vite.config.js'],
    languageOptions: { globals: { ...globals.node } }
  }
];
