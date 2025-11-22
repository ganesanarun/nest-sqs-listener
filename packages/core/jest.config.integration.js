const baseConfig = require('../../jest.config.base');

module.exports = {
    ...baseConfig,
    displayName: 'core',
    roots: ['<rootDir>/src', '<rootDir>/integration-test'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
};
