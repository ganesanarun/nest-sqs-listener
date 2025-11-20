const baseConfig = require('../../jest.config.base');

module.exports = {
    ...baseConfig,
    displayName: 'fastify-adapter',
    roots: ['<rootDir>/src', '<rootDir>/test'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    // Force Jest to exit after tests complete to handle lingering async operations
    forceExit: true,
};