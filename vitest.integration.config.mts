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
    // Per-file fork isolation prevents vi.mock() scope leakage between test
    // files (e.g. registration.test.ts mocks @/auth; totp.test.ts needs the
    // real authorizeUser). fileParallelism=false keeps DB writes serialized
    // so the shared test DB is never hit concurrently.
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: false },
    },
    fileParallelism: false,
    // Integration tests use real bcrypt cost-12 + DB roundtrips; default 5s is not enough
    testTimeout: 60000,
    hookTimeout: 60000,
  },
})
