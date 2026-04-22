# Deferred Items — Phase 30

Out-of-scope discoveries that should be addressed later but NOT fixed within the
originating plan (per executor scope-boundary rule).

## Pre-existing lint warnings (discovered Plan 30-01)

**File:** `src/app/(app)/movimientos/actions.ts`

**Warnings (3):**
- L86: `'_error' is defined but never used` (`@typescript-eslint/no-unused-vars`)
- L141: `'_error' is defined but never used` (`@typescript-eslint/no-unused-vars`)
- L173: `'_error' is defined but never used` (`@typescript-eslint/no-unused-vars`)

**Cause:** Pre-existing from Phase 25/27 era — these are caught-but-ignored Prisma
errors in Server Actions. The underscore prefix convention should suppress the
warning; ESLint config may need `argsIgnorePattern: '^_'` explicitly set.

**Why deferred:** Not caused by Plan 30-01 changes (that plan touched
`prisma.config.ts`, `.env.example`, and `src/lib/env*.ts` stubs only). No file
in `src/app/(app)/movimientos/` was modified.

**Suggested owner:** A future lint-pass plan or integrated into Phase 30-06
(final polish/deploy verification).

## Flaky test: backup-codes consume unit test (re-confirmed Plan 30-04)

**File:** `src/lib/backup-codes.test.ts`

**Symptom:** When the full test suite is run in parallel (710 tests across
48 files), two tests in this file can fail with a mock-call-count assertion
(`expect(updateMany).not.toHaveBeenCalled()`) — but running the file in
isolation passes all 14 tests cleanly. Re-running the full suite immediately
after a failure also passes 710/710.

**Cause:** Parallel worker cross-contamination on shared `vi.fn()` spies for
`prisma.backupCode.updateMany`. Pre-existing from Phase 29 — not caused by
any Plan 30-04 change (30-04 only adds `prisma/seed.prod.ts` and one
`package.json` script).

**Why deferred:** Strictly a test-harness isolation issue, no production
behaviour affected. Adding `vi.resetAllMocks()` to the `backup-codes.test.ts`
`beforeEach` (or moving the file to `singleFork` pool) would address it.

**Suggested owner:** A future test-stability plan; not blocking for 30-04.

