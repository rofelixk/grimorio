const { createCjsPreset } = require('jest-preset-angular/presets');

/** @type {import('jest').Config} */
const preset = createCjsPreset();

module.exports = {
  ...preset,
  testEnvironment: 'jest-preset-angular/environments/jest-jsdom-env',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/', '<rootDir>/.angular/'],
  moduleNameMapper: {
    ...preset.moduleNameMapper,
    '^@shared/interfaces$': '<rootDir>/src/app/shared/interfaces/index.ts',
    '^@shared/constants$': '<rootDir>/src/app/shared/constants/index.ts',
    '^@shared/config$': '<rootDir>/src/app/shared/config/index.ts',
    '^@shared/services$': '<rootDir>/src/app/shared/services/index.ts',
    '^@shared/components$': '<rootDir>/src/app/shared/components/index.ts',
    '^@shared/guards$': '<rootDir>/src/app/shared/guards/index.ts',
  },
};
