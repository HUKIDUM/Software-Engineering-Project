const nextJest = require('next/jest')

// Providing the path to your Next.js app to load next.config.js and .env files in your test environment
const createJestConfig = nextJest({
  dir: './',
})

// Add any custom config to be passed to Jest
/** @type {import('jest').Config} */
const customJestConfig = {
  // Add more setup options before each test is run
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Use jsdom environment for testing React components
  testEnvironment: 'jest-environment-jsdom',

  // Handle module aliases (if you have them in tsconfig.json)
  // Example: moduleNameMapper: { '^@/components/(.*)$': '<rootDir>/src/components/$1', }
  // Check your tsconfig.json for aliases like "@/*"
  moduleNameMapper: {
     // Handle @/ alias
     '^@/(.*)$': '<rootDir>/src/$1',

     // Example: force modules to resolve with the CJS entry point
     // Use this if you encounter issues with ESM modules in dependencies
     // 'module-name': require.resolve('module-name'),
  }

  // Add any other Jest options here
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig) 