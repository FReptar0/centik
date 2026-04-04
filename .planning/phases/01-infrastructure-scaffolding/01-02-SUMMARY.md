---
phase: 01-infrastructure-scaffolding
plan: 02
subsystem: infra
tags: [eslint, prettier, vitest, playwright, prisma, testing, linting, formatting]

# Dependency graph
requires:
  - phase: 01-01
    provides: "Project scaffolding with all dependencies installed, package.json scripts, prisma.config.ts"
provides:
  - "ESLint 9 flat config with eslint-config-prettier integration"
  - "Prettier configured with project style (no semis, single quotes, trailing commas)"
  - "Vitest unit test config (jsdom) and integration test config (node, serial)"
  - "Playwright E2E config targeting localhost:3000 with chromium"
  - "Prisma 7 stub schema with Period model for toolchain validation"
  - "PrismaClient singleton with PrismaPg adapter in src/lib/prisma.ts"
affects: [01-03, all-future-phases]

# Tech tracking
tech-stack:
  added: []
  patterns: ["ESLint flat config with Prettier conflict resolution", "Vitest unit+integration dual config", "Playwright chromium-only E2E setup", "Prisma stub schema for incremental validation", "Native Vite tsconfigPaths resolution (no plugin)", "Vitest configs excluded from tsconfig to avoid Next.js build type errors"]

key-files:
  created: ["eslint.config.mjs", ".prettierrc", ".prettierignore", "vitest.config.mts", "vitest.integration.config.mts", "tests/setup.ts", "playwright.config.ts", "e2e/.gitkeep", "src/lib/prisma.ts"]
  modified: ["prisma/schema.prisma", "tsconfig.json"]

key-decisions:
  - "Used native Vite resolve.tsconfigPaths instead of deprecated vite-tsconfig-paths plugin"
  - "Excluded vitest config files from tsconfig.json to prevent Next.js build type errors on Vitest-specific pool options"
  - "Kept datasource URL in prisma.config.ts only (Prisma 7 pattern) rather than duplicating in schema.prisma"

patterns-established:
  - "ESLint + Prettier separate tools (not eslint-plugin-prettier) per Prettier team recommendation"
  - "Vitest configs use .mts extension and are excluded from tsconfig"
  - "Integration tests run in serial with forks pool for DB safety"

requirements-completed: [INFRA-03, INFRA-04, INFRA-05]

# Metrics
duration: 5min
completed: 2026-04-04
---

# Phase 1 Plan 2: Dev Toolchain Configuration Summary

**ESLint 9 flat config with Prettier, Vitest dual configs (unit + integration), Playwright E2E, and Prisma 7 stub schema with PrismaClient singleton**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-04T22:10:48Z
- **Completed:** 2026-04-04T22:15:45Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Configured ESLint 9 with eslint-config-prettier/flat to prevent formatting rule conflicts
- Set up Prettier with project style conventions (no semicolons, single quotes, trailing commas, 100 char width)
- Created dual Vitest configurations: jsdom for unit tests, node with serial forks for integration tests
- Configured Playwright with chromium targeting localhost:3000 with dev server auto-start
- Added stub Period model to Prisma schema and created PrismaClient singleton with PrismaPg adapter

## Task Commits

Each task was committed atomically:

1. **Task 1: Configure ESLint flat config with Prettier and set up Prettier** - `dc16804` (feat)
2. **Task 2: Configure Vitest, Playwright, and Prisma 7 stub schema** - `ae47c89` (feat)

## Files Created/Modified
- `eslint.config.mjs` - ESLint 9 flat config with eslint-config-prettier integration
- `.prettierrc` - Prettier formatting rules (no semi, single quotes, trailing commas)
- `.prettierignore` - Excludes generated files, lock files, and markdown
- `vitest.config.mts` - Unit test config with jsdom environment and v8 coverage
- `vitest.integration.config.mts` - Integration test config with node environment and serial forks
- `tests/setup.ts` - Placeholder for Phase 2 test DB connection
- `playwright.config.ts` - E2E config with chromium project and dev server
- `e2e/.gitkeep` - Empty directory for Playwright tests
- `prisma/schema.prisma` - Added stub Period model for toolchain validation
- `src/lib/prisma.ts` - PrismaClient singleton with PrismaPg adapter
- `tsconfig.json` - Excluded vitest config files from type checking

## Decisions Made
- Used native Vite `resolve.tsconfigPaths: true` instead of the deprecated `vite-tsconfig-paths` plugin. Vite now supports tsconfig paths natively and warns against the plugin.
- Excluded `vitest.config.mts` and `vitest.integration.config.mts` from `tsconfig.json` because Next.js type-checks all `.mts` files during build, and Vitest-specific `poolOptions` types are not recognized by the Vite type definitions.
- Kept datasource URL exclusively in `prisma.config.ts` (Prisma 7 pattern) rather than adding `url = env("DATABASE_URL")` to `schema.prisma` as the plan suggested. The 01-01 research confirmed Prisma 7 moved URL config out of the schema file.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced deprecated vite-tsconfig-paths plugin with native Vite option**
- **Found during:** Task 2 (Vitest configuration)
- **Issue:** Vitest emitted deprecation warning: "vite-tsconfig-paths plugin is detected. Vite now supports tsconfig paths resolution natively"
- **Fix:** Removed `vite-tsconfig-paths` import and plugin usage, replaced with `resolve: { tsconfigPaths: true }` in both Vitest configs
- **Files modified:** `vitest.config.mts`, `vitest.integration.config.mts`
- **Verification:** `npx vitest run` runs without deprecation warnings
- **Committed in:** ae47c89 (Task 2 commit)

**2. [Rule 3 - Blocking] Excluded vitest configs from tsconfig to fix build failure**
- **Found during:** Task 2 (build verification)
- **Issue:** `npm run build` failed with TypeScript error: "poolOptions does not exist in type InlineConfig" because Next.js type-checked the `.mts` vitest config files
- **Fix:** Added `vitest.config.mts` and `vitest.integration.config.mts` to tsconfig.json `exclude` array
- **Files modified:** `tsconfig.json`
- **Verification:** `npm run build` passes with zero errors
- **Committed in:** ae47c89 (Task 2 commit)

**3. [Rule 1 - Bug] Kept datasource URL in prisma.config.ts only**
- **Found during:** Task 2 (Prisma schema update)
- **Issue:** Plan specified adding `url = env("DATABASE_URL")` to schema.prisma, but Prisma 7 research confirmed URL belongs in prisma.config.ts only
- **Fix:** Kept existing pattern from 01-01 with URL in prisma.config.ts, only added stub Period model to schema
- **Files modified:** `prisma/schema.prisma`
- **Verification:** `npx prisma generate` succeeds
- **Committed in:** ae47c89 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking)
**Impact on plan:** All auto-fixes necessary for correct toolchain operation. No scope creep -- deviations reflect Prisma 7 and Vite version-specific requirements not fully captured in the plan.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Full quality toolchain operational: lint, format, test (unit + integration + e2e), build
- PrismaClient singleton ready for Phase 2 schema expansion and migrations
- All configs validated: `npm run build`, `npm run lint`, `npm run format:check`, `npx vitest run`, `npx playwright test --list` all pass
- Ready for Plan 03 (Tailwind theme tokens, DM Sans font, Recharts validation)

## Self-Check: PASSED

All created files verified on disk. Both task commits (dc16804, ae47c89) verified in git log.

---
*Phase: 01-infrastructure-scaffolding*
*Completed: 2026-04-04*
