export default {
  testEnvironment: 'node',
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    'backend/**/*.js',
    'discordBot/**/*.js',
    'scraperWorker/**/*.js',
    '!**/__tests__/**',
    '!**/node_modules/**'
  ]
};
