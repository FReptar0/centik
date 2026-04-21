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
