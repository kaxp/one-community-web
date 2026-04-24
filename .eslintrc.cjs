/* eslint-disable */
// Flat config kept intentionally compact. CLAUDE.md §1.3: strict=true, no any, no @ts-ignore.
module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'react-refresh'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  settings: { react: { version: '18.3' } },
  ignorePatterns: ['dist', 'node_modules', 'coverage', '.claude', 'public/mockServiceWorker.js', 'eslint.config.js'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'react/prop-types': 'off',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
