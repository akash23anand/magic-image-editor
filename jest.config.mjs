export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  testTimeout: 10000
};