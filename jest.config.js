module.exports = {
    projects: [
        '<rootDir>/packages/core',
        '<rootDir>/packages/nestjs-adapter',
        '<rootDir>/packages/fastify-adapter',
    ],
    coverageDirectory: '<rootDir>/coverage',
    collectCoverageFrom: [
        'packages/*/src/**/*.ts',
        '!packages/*/src/**/*.interface.ts',
        '!packages/*/src/**/index.ts',
        '!packages/*/src/**/*.d.ts',
    ],
};
