module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@agent-system/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@agent-system/governance$': '<rootDir>/../../packages/governance/src/index.ts',
    '^@agent-system/governance-v2$': '<rootDir>/src/index.ts',
    '^@agent-system/governance-v2/runtime/clock$': '<rootDir>/src/runtime/clock.ts',
    '^@agent-system/customer-data$': '<rootDir>/../../packages/customer-data/src/index.ts',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
    }],
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
};
