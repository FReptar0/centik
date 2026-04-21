# Phase 29 — Deferred Items

Items discovered during Phase 29 execution that are out-of-scope for the current plan and deferred for later cleanup. Per the executor scope-boundary rule, pre-existing issues in unrelated files are documented here, not fixed inline.

## Lint warnings in `src/app/(app)/movimientos/actions.ts`

**Discovered:** Plan 29-01 Task 3 (npm run lint)
**Scope:** Pre-existing warnings, not introduced by Phase 29 changes

| Line | Rule | Variable |
|------|------|----------|
| 86:12 | `@typescript-eslint/no-unused-vars` | `_error` |
| 141:12 | `@typescript-eslint/no-unused-vars` | `_error` |
| 173:12 | `@typescript-eslint/no-unused-vars` | `_error` |

**Proposed fix:** Rename the caught errors to `_` (single underscore) which is the conventional ESLint ignore pattern, or update the ESLint config to allow `_error` via `argsIgnorePattern: '^_'` (likely already configured for `_` alone). Address in a dedicated `chore/lint-cleanup` task outside Phase 29.

**Note:** These were present in the codebase before Plan 29-01 began. They were not introduced by the BackupCode schema, dep install, env updates, or Wave-0 test stubs.

## Flaky parallel-test race in `tests/integration/registration.test.ts`

**Discovered:** Plan 29-01 Task 3 (npm run test:run)
**Scope:** Pre-existing flake; not caused by any Phase 29 change

**Symptom:** When `tests/integration/registration.test.ts` is discovered by the default `vitest.config.mts` runner (no `singleFork`), it intermittently fails with `PrismaClientKnownRequestError: The table 'public.InviteToken' does not exist in the current database`. Passes ~60% of runs in isolation and when run via `npm run test:integration` (which uses `vitest.integration.config.mts` with `pool: 'forks', singleFork: true`).

**Root cause:** `tests/integration/registration.test.ts` (and likely other integration files co-located in `tests/integration/`) imports `../setup` which calls `dotenv.config({ path: '.env.test' })`. When the default unit runner discovers these files and runs them in the default multi-worker pool, workers share a PrismaClient without the integration config's single-fork guarantee, causing transient schema/db visibility races.

**Verification that this is pre-existing:**
- I did NOT modify `vitest.config.mts`, `vitest.integration.config.mts`, `tests/setup.ts`, `tests/integration/registration.test.ts`, or any related file in Plan 29-01.
- When only the Wave-0 changes are applied, running `npm run test:run` yields intermittent green/3-failure results. The same test in isolation (`npx vitest run tests/integration/registration.test.ts`) passes cleanly.
- `npm run test:integration` (the intended runner for these files) remains green and deterministic.

**Proposed fix (future plan):** Either (a) exclude `tests/integration/**` from the default `vitest.config.mts` include pattern so those files only run under `vitest.integration.config.mts`, or (b) mark integration files with a test filename pattern that the unit runner doesn't pick up. Safest is option (a): one-line change to `vitest.config.mts` adding `exclude: ['node_modules', 'e2e/**', 'tests/integration/**']`.

