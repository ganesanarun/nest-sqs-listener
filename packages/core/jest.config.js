const baseConfig = require('../../jest.config.base');

module.exports = {
    ...baseConfig,
    displayName: 'core',
    roots: ['<rootDir>/src', '<rootDir>/test'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
};
