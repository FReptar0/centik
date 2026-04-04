import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    passWithNoTests: true,
    include: ['tests/integration/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
  },
})
