module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.svg$': 'jest-transform-stub'
  },
  moduleNameMapping: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png|jpg|jpeg)$': 'jest-transform-stub'
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  collectCoverageFrom: [
    'src/hodlhut_frontend/src/**/*.{ts,tsx}',
    '!src/hodlhut_frontend/src/**/*.d.ts',
    '!src/hodlhut_frontend/src/index.tsx'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 10000,
  clearMocks: true,
  restoreMocks: true,
  // Fix for Date.now mocking in tests
  fakeTimers: {
    enableGlobally: false
  },
  // Handle MSW and other ES modules
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  // Mock globals for JSDOM environment
  setupFiles: ['<rootDir>/src/jestSetup.js']
};