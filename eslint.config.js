// @ts-check
import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import { flatConfigs as importX } from 'eslint-plugin-import-x';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import { configs as tsConfigs } from 'typescript-eslint';

const PURE_SHARED_MESSAGE = 'src/shared must stay pure (no Node, Electron or DOM).';

export default defineConfig(
  {
    ignores: ['node_modules/**', 'out/**', 'dist/**', 'release/**', 'resources/**', 'coverage/**'],
  },
  eslint.configs.recommended,
  tsConfigs.strictTypeChecked,
  tsConfigs.stylisticTypeChecked,
  importX.recommended,
  importX.typescript,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['eslint.config.js', 'vitest.setup.ts'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      'import-x/resolver': {
        typescript: true,
        node: true,
      },
    },
    rules: {
      // Import hygiene: builtin → external → @shared → @renderer → parent → sibling, blank line between groups.
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          pathGroups: [
            { pattern: '@shared/**', group: 'internal', position: 'before' },
            { pattern: '@renderer/**', group: 'internal' },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import-x/no-cycle': 'error',
      'import-x/no-default-export': 'error',
      'import-x/no-unresolved': 'off', // handled by tsc
      'import-x/named': 'off', // handled by tsc
      'import-x/no-named-as-default-member': 'off', // false positives on CJS interop packages

      // Strictness beyond the presets
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      // Top-level `import type` is erased entirely, which matters for the sandboxed preload.
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/non-nullable-type-assertion-style': 'off', // conflicts with the rule above
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
    },
  },
  {
    // shared/ must stay pure: no Node, no Electron, no DOM globals.
    files: ['src/shared/**/*.ts'],
    ignores: ['src/shared/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['node:*', 'electron', 'fs', 'path', 'child_process', 'os'],
              message: PURE_SHARED_MESSAGE,
            },
            { group: ['@renderer/*', '../main/*', '../renderer/*'], message: PURE_SHARED_MESSAGE },
          ],
        },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'process', 'require'],
    },
  },
  {
    files: ['src/preload/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@renderer/*', '../renderer/*'],
              message: 'preload cannot import renderer code.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/main/**/*.ts'],
    ignores: ['src/main/services/process.ts', 'src/main/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@renderer/*', '../renderer/*'],
              message: 'main cannot import renderer code.',
            },
            {
              group: ['node:child_process', 'child_process'],
              message: 'Spawn processes through services/process.ts only.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat['recommended-latest'], reactRefresh.configs.vite],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['node:*', 'electron', 'fs', 'path', 'child_process'],
              message: 'Renderer must go through window.api.',
            },
            { group: ['../main/*', '../../main/*'], message: 'Renderer cannot import main code.' },
          ],
        },
      ],
    },
  },
  {
    // Config files, scripts and test setup: default exports and console output are fine, and
    // they are not part of a tsconfig project so type-aware rules are disabled.
    files: ['*.config.{js,ts}', 'scripts/**/*.mjs', 'vitest.setup.ts'],
    rules: {
      'import-x/no-default-export': 'off',
      'no-console': 'off',
    },
  },
  {
    files: ['eslint.config.js', 'scripts/**/*.mjs', 'vitest.setup.ts'],
    extends: [tsConfigs.disableTypeChecked],
    languageOptions: { globals: globals.node },
    rules: {
      'import-x/no-named-as-default': 'off', // plugin packages export both styles
    },
  },
  {
    files: ['**/*.test.{ts,tsx}'],
    languageOptions: { globals: globals.vitest },
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  prettier,
);
