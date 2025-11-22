module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    // Clear test patterns specifically for unit tests - exclude integration and documentation tests
    testMatch: [
        '**/test/**/*.spec.ts',
        '**/test/**/*.test.ts',
        '!**/integration-test/**/*',
        '!**/test/documentation/**/*'
    ],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/coverage/',
        '/integration-test/',
        '/test/documentation/'
    ],
    transform: {
        '^.+\\.ts$': 'ts-jest',
    },
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.interface.ts',
        '!src/**/index.ts',
        '!src/**/*.d.ts',
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    coverageThreshold: {
        global: {
            branches: 67,
            functions: 75,
            lines: 76,
            statements: 76,
        },
    },
    moduleFileExtensions: ['ts', 'js', 'json'],
    // Set timeout to 20 seconds for unit tests as specified in requirements
    testTimeout: 20000,
    verbose: true,
    maxWorkers: '50%',
    maxConcurrency: 5,
};
