// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

const PLANECHASE_DATA = {
  regex: 'planechase/cards(\\.pt-br)?\\.json$',
  message: "Planechase data must stay lazy: load it with PlanechaseCatalogService's import().",
};
const RELATIVE_CORE = {
  regex: '^(\\.\\./)+(.*/)?core/',
  message: 'Use an alias (@models, @services, @utils, @testing, @data, @db).',
};
const RELATIVE_SHARED = {
  regex: '^(\\.\\./)+(.*/)?shared/',
  message: 'Use @shared/….',
};

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@angular-eslint/prefer-signals': 'warn',
      '@angular-eslint/prefer-output-emitter-ref': 'warn',
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
    },
  },
  // Flat config replaces a rule's options per block, so each file matches exactly one of the
  // three blocks below and each repeats the patterns it needs.
  {
    files: ['src/app/core/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': ['error', { patterns: [PLANECHASE_DATA] }],
    },
  },
  {
    files: ['src/app/shared/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': ['error', { patterns: [PLANECHASE_DATA, RELATIVE_CORE] }],
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['src/app/core/**', 'src/app/shared/**'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        { patterns: [PLANECHASE_DATA, RELATIVE_CORE, RELATIVE_SHARED] },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
]);
