const baseConfig = require('../../jest.config.base');

module.exports = {
    ...baseConfig,
    displayName: 'nestjs-adapter',
    roots: ['<rootDir>/src', '<rootDir>/test'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
};
