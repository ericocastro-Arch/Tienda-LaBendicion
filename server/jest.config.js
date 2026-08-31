export default {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(js)$': 'babel-jest',
  },
  testMatch: ['**/test/**/*.test.js'],
  moduleFileExtensions: ['js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
  ],
  coverageThreshold: {
    global: {
      statements: 85,
      functions: 85,
      lines: 85,
      branches: 70,
    },
  },
}
