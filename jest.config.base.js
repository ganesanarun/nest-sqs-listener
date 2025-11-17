module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
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
    testTimeout: 10000,
    verbose: true,
    maxWorkers: 1,
    maxConcurrency: 1,
};
