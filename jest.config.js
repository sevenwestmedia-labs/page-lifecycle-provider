// eslint-disable-next-line no-undef
module.exports = {
    testEnvironment: 'node',
    transform: {
        '.tsx?': 'ts-jest',
    },
    testRegex: '\\.(spec|test)\\.tsx?$',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
    testPathIgnorePatterns: ['/node_modules/', 'dist'],
    verbose: false,
    collectCoverageFrom: ['**/*.{ts,tsx}', '!**/*.d.ts', '!**/node_modules/**'],
}
