module.exports = {
    projects: [
        {
            displayName: 'core-integration',
            testMatch: ['<rootDir>/packages/core/integration-test/**/*.spec.ts'],
            preset: 'ts-jest',
            testEnvironment: 'node',
            roots: ['<rootDir>/packages/core'],
            moduleNameMapper: {
                '^@/(.*)$': '<rootDir>/packages/core/src/$1',
            },
            maxWorkers: 1,
        },
        // Add other packages with integration tests as they are created
        // {
        //     displayName: 'nestjs-adapter-integration',
        //     testMatch: ['<rootDir>/packages/nestjs-adapter/integration-test/**/*.spec.ts'],
        //     preset: 'ts-jest',
        //     testEnvironment: 'node',
        //     roots: ['<rootDir>/packages/nestjs-adapter'],
        //     maxWorkers: 1,
        // },
        // {
        //     displayName: 'fastify-adapter-integration',
        //     testMatch: ['<rootDir>/packages/fastify-adapter/integration-test/**/*.spec.ts'],
        //     preset: 'ts-jest',
        //     testEnvironment: 'node',
        //     roots: ['<rootDir>/packages/fastify-adapter'],
        //     maxWorkers: 1,
        // },
    ],
    coverageDirectory: '<rootDir>/coverage/integration',
    collectCoverageFrom: [
        'packages/*/src/**/*.ts',
        '!packages/*/src/**/*.interface.ts',
        '!packages/*/src/**/index.ts',
        '!packages/*/src/**/*.d.ts',
    ],
    coverageReporters: ['text', 'lcov', 'html'],
    verbose: true,
    maxWorkers: 1,
    maxConcurrency: 1,
};