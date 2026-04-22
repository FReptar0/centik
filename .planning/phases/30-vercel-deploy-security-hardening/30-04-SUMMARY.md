---
phase: 30-vercel-deploy-security-hardening
plan: 04
subsystem: infra
tags: [seed, production, admin, idempotent, bcrypt, deploy]

requires:
  - phase: 25-schema-auth-multi-tenant
    provides: User model with email unique index + isAdmin/isApproved/hashedPassword/totpEnabled fields
  - phase: 30-vercel-deploy-security-hardening
    provides: Phase 30 plans 30-01..30-03 complete (dual-URL Prisma, boot-time env validator, security headers + CSP)

provides:
  - prisma/seed.prod.ts production admin seed (admin-only, idempotent, no password rotation on re-run)
  - db:seed:prod npm script wiring the seed via tsx
affects: [30-06 smoke checklist, Vercel post-deploy runbook]

tech-stack:
  added: []
  patterns:
    - "Production-only admin seed — findUnique-then-branch (update flags-only OR create with fresh bcrypt hash); idempotent by email unique constraint"
    - "Hash-before-write discipline (Phase 28 P03 carry-forward) — bcrypt cost 12 runs on a standalone line before any prisma call, preventing DB connection pinning during ~300ms hash"
    - "Fail-fast env validation in seed — throw immediately when ADMIN_EMAIL missing OR ADMIN_PASSWORD missing OR < 12 chars, before adapter/PrismaClient is even constructed"
    - "Manual-one-shot seed wiring — npm script exists but is NEVER referenced in build, quality, or postinstall chains (D-11)"

key-files:
  created:
    - prisma/seed.prod.ts
  modified:
    - package.json

key-decisions:
  - "[30-04] prisma/seed.prod.ts branches on findUnique-before-mutate instead of upsert with hashedPassword in the update payload — the update-branch is data:{isAdmin:true,isApproved:true} with NO hashedPassword field, so D-10 no-rotation is structurally guaranteed (not just by convention)"
  - "[30-04] bcrypt.hash(password, 12) runs inside the create branch only, AFTER the existence check has ruled out the update path — saves a ~300ms hash computation on idempotent re-runs and avoids connection pinning per Phase 28 P03 discipline"
  - "[30-04] ADMIN_PASSWORD length gate (< 12 chars throws) lives inline in the seed rather than in src/lib/env.ts — the seed is a standalone CLI that does not go through Next.js boot, so env.ts's Zod schema cannot gate it; inline validation is the simplest robust path"
  - "[30-04] .catch handler uses console.error — intentional exception to D-31's no-console-log rule because seed.prod.ts is a one-shot CLI tool, not runtime/user-facing code; D-31 scope is app runtime"
  - "[30-04] Seed wires DATABASE_URL (pooled) not DIRECT_URL — a single-row upsert is pooler-safe and operators already have DATABASE_URL populated by the Vercel Marketplace; they would need to manually set DIRECT_URL otherwise"
  - "[30-04] db:seed:prod placed between test:e2e and quality in package.json — adjacent to other test/runtime scripts, NOT inside build/quality/postinstall chains (D-11 compliance)"

patterns-established:
  - "Production seed pattern: findUnique-then-branch beats upsert-with-update-fields when you need structural guarantees about what is NOT written on the update path (e.g. 'password MUST NOT rotate'). upsert's update clause is a free-form write and can hide bugs."
  - "Cost-12 bcrypt + $transaction discipline: compute the hash on a standalone line BEFORE opening any transaction or reaching a Prisma adapter that uses pool-per-connection semantics."

requirements-completed: [DEPLOY-03]

duration: ~10min
completed: 2026-04-22
---

# Phase 30 Plan 04: Production Admin Seed Summary

**Production-only admin seed shipped — prisma/seed.prod.ts creates exactly one User row idempotently, never rotates an existing admin's password, and fails fast if ADMIN_EMAIL is missing or ADMIN_PASSWORD is shorter than 12 characters. Wired via `npm run db:seed:prod` (tsx) and deliberately excluded from build/quality/postinstall chains per D-11.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-22T00:03:00Z
- **Completed:** 2026-04-22T00:13:26Z
- **Tasks:** 2
- **Files touched:** 2 (1 created, 1 modified)

## Accomplishments

- `prisma/seed.prod.ts` created (68 lines). Imports `dotenv/config`, the generated Prisma client, `@prisma/adapter-pg`, and `bcryptjs`. Reads `ADMIN_EMAIL` + `ADMIN_PASSWORD` from env with no defaults. Throws immediately if either is missing; throws if `ADMIN_PASSWORD.length < 12`. Calls `prisma.user.findUnique({ where: { email }, select: { id: true } })`; if the row exists, calls `prisma.user.update({ where: { email }, data: { isAdmin: true, isApproved: true } })` (no `hashedPassword` in the payload — D-10 no-rotation is structural); otherwise hashes the password with bcrypt cost 12 on a standalone line and calls `prisma.user.create` with `{ email, hashedPassword, isAdmin: true, isApproved: true, totpEnabled: false }`. Main is wrapped in `.then(disconnect).catch(err => { console.error(err); disconnect; exit(1) })`.
- `package.json` scripts gains exactly one entry: `"db:seed:prod": "tsx prisma/seed.prod.ts"`, placed between `test:e2e` and `quality`. NOT referenced in build, quality, or postinstall (D-11 compliance verified with a Node inline script).
- Smoke tested against the local Docker Postgres (`centik-db-1`): first run with `ADMIN_EMAIL=test-prod-seed@centik.local ADMIN_PASSWORD=superLongDevPass123` printed `Admin user ... created.`. Second run with a DIFFERENT password (`differentPasswordZ123`) printed `Admin user ... already exists -- flags verified (password NOT rotated).` and the DB hash field was byte-for-byte identical (`$2b$12$FAw0dQAmw01ViLN/WAKKzO3YOnB5vy.zps.XcbZi9oTBd8lgUtd0i` on both runs). Fail-fast paths also verified: `ADMIN_PASSWORD=tooshort` throws `ADMIN_PASSWORD is required and must be at least 12 characters`; unset `ADMIN_EMAIL` throws `ADMIN_EMAIL is required for production seed`. Test user deleted from DB post-smoke.

## Task Commits

1. **Task 1: prisma/seed.prod.ts (admin-only, idempotent, no rotation, no demo data)** — `9588a03` (feat)
2. **Task 2: package.json db:seed:prod script** — `b4eada4` (chore)

**Plan metadata:** (appended below as final commit)

## Verification Results

### Grep Gates (from 30-VALIDATION.md Task 30-04-04)

| Gate | Result |
|------|--------|
| `test -f prisma/seed.prod.ts` | PASS (68 lines) |
| `grep -q "ADMIN_EMAIL" prisma/seed.prod.ts` | PASS (2 occurrences: env read + throw message) |
| `grep -q "ADMIN_PASSWORD" prisma/seed.prod.ts` | PASS (2 occurrences: env read + throw message) |
| `grep -q "bcrypt.hash" prisma/seed.prod.ts` | PASS (L45: `await bcrypt.hash(password!, 12)`) |
| `grep -q "length < 12" prisma/seed.prod.ts` | PASS (L16) |
| `grep -q "throw new Error.*ADMIN_" prisma/seed.prod.ts` | PASS (L14 + L17) |
| `! grep -E "prisma\.(category\|debt\|transaction\|incomeSource\|period\|budget\|valueUnit\|unitRate\|monthlySummary\|asset\|backupCode)\.(create\|createMany\|upsert\|update)"` | PASS (0 matches against all 11 forbidden entity writes) |
| `node -e "require('./package.json').scripts['db:seed:prod']"` | PASS (prints `tsx prisma/seed.prod.ts`) |
| `! grep seed:prod in build/quality/postinstall scripts` | PASS (none of the three chains reference seed:prod) |
| `hashedPassword` only in create branch, NOT in update branch | PASS (2 occurrences: L45 hash creation + L50 inside create `data`, confirmed by manual review of update branch at L34-37) |

### Idempotency Smoke Test

```
# Run 1 (create)
$ ADMIN_EMAIL=test-prod-seed@centik.local ADMIN_PASSWORD=superLongDevPass123 npm run db:seed:prod
> centik@0.1.0 db:seed:prod
> tsx prisma/seed.prod.ts
Admin user test-prod-seed@centik.local created.

# DB hash after Run 1:
$2b$12$FAw0dQAmw01ViLN/WAKKzO3YOnB5vy.zps.XcbZi9oTBd8lgUtd0i

# Run 2 (idempotent no-rotate — DIFFERENT password attempted)
$ ADMIN_EMAIL=test-prod-seed@centik.local ADMIN_PASSWORD=differentPasswordZ123 npm run db:seed:prod
> centik@0.1.0 db:seed:prod
> tsx prisma/seed.prod.ts
Admin user test-prod-seed@centik.local already exists -- flags verified (password NOT rotated).

# DB hash after Run 2 — IDENTICAL to Run 1:
$2b$12$FAw0dQAmw01ViLN/WAKKzO3YOnB5vy.zps.XcbZi9oTBd8lgUtd0i
```

### Fail-Fast Validation

```
# Missing ADMIN_EMAIL
$ ADMIN_PASSWORD=somepass123456 npx tsx prisma/seed.prod.ts
Error: ADMIN_EMAIL is required for production seed.

# Short ADMIN_PASSWORD
$ ADMIN_EMAIL=x@y.com ADMIN_PASSWORD=tooshort npx tsx prisma/seed.prod.ts
Error: ADMIN_PASSWORD is required and must be at least 12 characters.
```

Both throws fire BEFORE `new PrismaClient` is constructed — no DB connection is opened on invalid env.

### Quality Loop

| Check | Result |
|-------|--------|
| `npm run build` | PASS (compiled in 10.2s; 12 static pages generated; proxy middleware emitted) |
| `npm run lint` | PASS (0 errors; 3 pre-existing warnings in `src/app/(app)/movimientos/actions.ts` — out-of-scope, documented in `deferred-items.md`) |
| `npm run test:run` | PASS (710/710 tests, 48/48 files green) |

Note: first `npm run test:run` invocation had 2 transient failures in `src/lib/backup-codes.test.ts` due to a pre-existing parallel-worker race (Phase 29 era). Re-running immediately produced 710/710 green. Isolated run of the file (all 14 tests) also passes cleanly. Documented in `deferred-items.md`.

## Deviations from Plan

### Auto-fixed Issues

None.

### Out-of-scope discoveries (logged to `deferred-items.md`, NOT fixed)

**1. [Scope-boundary] Pre-existing lint warnings in `src/app/(app)/movimientos/actions.ts`**
- Three `'_error' is defined but never used` warnings at L86, L141, L173
- Not caused by Plan 30-04 (we touched prisma/seed.prod.ts + package.json only)
- Suggested owner: future lint-pass plan or Phase 30-06

**2. [Scope-boundary] Flaky backup-codes.test.ts in full parallel run**
- 2/14 tests in `src/lib/backup-codes.test.ts` can intermittently fail with mock-call-count mismatch when the full suite runs in parallel
- Passes 14/14 in isolation; passes 710/710 on re-run of full suite
- Root cause: vi.fn() spy cross-contamination across workers
- Not caused by Plan 30-04
- Suggested owner: future test-stability plan

### Authentication Gates

None.

## Files Changed

```
 prisma/seed.prod.ts  | 68 +++++++++++++++++++++++++++++++++++++++++++ (NEW)
 package.json         |  1 +
 2 files changed, 69 insertions(+)
```

## Threat Register Coverage (from 30-04-PLAN threat_model)

| Threat ID | Mitigation Landed Where | Status |
|-----------|-------------------------|--------|
| T-30-SEED-001 (Tampering / Info Disclosure — admin-seed write surface) | `prisma/seed.prod.ts` body contains only `prisma.user.findUnique`, `prisma.user.update` (flags only), `prisma.user.create` — grep gate for 11 forbidden entity writes returns 0 matches. No demo data leaks into prod. D-12 structurally enforced. | MITIGATED |
| T-30-SEED-002 (Availability / Integrity — existing admin password) | `update` branch at L34-37 writes only `{ isAdmin: true, isApproved: true }`; `hashedPassword` is in scope ONLY in the `create` branch (L45 + L50). Smoke test confirmed byte-identical DB hash after re-run with different password. Accidental re-run cannot brick login. D-10 structurally enforced. Secondary: ADMIN_PASSWORD < 12 chars throws before any DB contact, preventing weak-password creates. | MITIGATED |

No new threat surface introduced (no new network endpoints, no auth paths, no file-system access, no schema changes).

## Self-Check: PASSED

- Created file exists: `prisma/seed.prod.ts` — FOUND (68 lines)
- Modified file exists: `package.json` — FOUND (line 18: `"db:seed:prod": "tsx prisma/seed.prod.ts"`)
- Commit `9588a03` exists — FOUND (`feat(30-04): production admin seed (idempotent, no rotation)`)
- Commit `b4eada4` exists — FOUND (`chore(30-04): add db:seed:prod npm script`)
- All grep gates pass
- Smoke test idempotency proven (byte-identical hash across runs)
- Quality loop green (build + lint + 710/710 tests)
