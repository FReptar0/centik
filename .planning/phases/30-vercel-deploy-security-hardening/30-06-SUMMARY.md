---
phase: 30-vercel-deploy-security-hardening
plan: 06
subsystem: docs
tags: [verification, runbook, smoke-checklist, deploy, hsts, operator-guide, wave-3]

# Dependency graph
requires:
  - phase: 30-vercel-deploy-security-hardening
    plan: 01
    provides: Prisma 7 dual-URL config (prisma.config.ts -> DIRECT_URL), Vercel Marketplace env-var contract documented in .env.example
  - phase: 30-vercel-deploy-security-hardening
    plan: 02
    provides: Boot-time Zod env validator + consumer sweep (env.ts now throws on any missing prod var)
  - phase: 30-vercel-deploy-security-hardening
    plan: 03
    provides: next.config.ts static security headers + src/proxy.ts per-request CSP nonce + HSTS prod-gate
  - phase: 30-vercel-deploy-security-hardening
    plan: 04
    provides: prisma/seed.prod.ts idempotent no-rotate admin seed + npm run db:seed:prod script
  - phase: 30-vercel-deploy-security-hardening
    plan: 05
    provides: 12 read-isolation tests + 13 mutation-IDOR tests (71/71 integration green)
provides:
  - Operator-ready 30-VERIFICATION.md runbook (476 lines, 11 sections, 11-item smoke checklist)
  - Upstream trace for the upsertBudgets partial-IDOR finding (30-05 deferred -> deferred-items.md + 30-VERIFICATION.md §8.1)
  - Final pre-deploy automated quality-gate evidence (710/710 unit + 71/71 integration green)
affects: [phase-30-final-signoff, v3.0-milestone-close]

# Tech tracking
tech-stack:
  added: []  # documentation-only plan
  patterns:
    - "Operator runbook pattern: 11 sections structured as Pre-Deploy -> Provision -> Config -> Deploy -> Seed -> Smoke -> Preload -> Watch-Items -> Rollback -> Sign-Off -> Appendix; readable top-to-bottom without prior Claude context"
    - "Smoke-checklist pattern: numbered 1..11, each item names the feature verified + exact command or UI step; three classes of verification (curl headers, UI interaction, terminal rate-limit)"
    - "Checkpoint boundary: runbook writing is autonomous; running the runbook is checkpoint:human-action (requires real Vercel dashboard + Upstash + authenticator app)"

key-files:
  created:
    - .planning/phases/30-vercel-deploy-security-hardening/30-VERIFICATION.md
  modified:
    - .planning/phases/30-vercel-deploy-security-hardening/deferred-items.md
    - prisma/seed.prod.ts (prettier-only from pre-flight gate)
    - tests/integration/isolation-actions.test.ts (prettier-only)
    - tests/integration/isolation-actions-totp.test.ts (prettier-only)

key-decisions:
  - "[30-06] Runbook expanded to 11 sections (vs plan's 6) — added Rollback Plan (§9) and Appendix (§11) per special-instructions. Sections §6 smoke checklist + §7 HSTS + §8 Known Watch-Items are the D-27/D-28 floor; §9-§11 are operator safety net additions."
  - "[30-06] upsertBudgets IDOR finding from Plan 30-05 elevated from 30-05-SUMMARY to deferred-items.md AND cross-referenced as §8.1 of 30-VERIFICATION.md — makes it visible to the operator during deploy verification, not buried in a plan summary."
  - "[30-06] Pre-flight prettier fix on 3 files (seed.prod.ts + 2 isolation tests) committed separately (e52fb8d) as style(30-06) — unblocks the pre-runbook gate without conflating format changes with the runbook deliverable."
  - "[30-06] DEPLOY-04 remains 'Pending' in REQUIREMENTS.md — the requirement is 'Centik is deployed and accessible on Vercel with all environment variables configured'. The runbook is written and the code is ready, but actual deploy + smoke pass is the operator's step. DEPLOY-04 moves to Complete after the operator signs off on the §6 smoke checklist."
  - "[30-06] Plan pauses at a human-action checkpoint (not human-verify) — the operator must actually RUN the runbook against a real Vercel deploy before Phase 30 can close. No Claude-runnable verification substitutes for this."

patterns-established:
  - "Phase-final docs-only plan pattern: (1) pre-flight quality gate, (2) write the runbook, (3) produce SUMMARY noting operator-pending completion, (4) checkpoint:human-action pauses plan until operator signs off."
  - "Deferred-items.md is the canonical landing spot for scope-boundary discoveries that cross plan boundaries — 30-VERIFICATION.md §8 cites the file directly so the operator tracks unresolved items during deploy."

requirements-completed: []  # DEPLOY-04 awaits operator smoke-check; ISOL-05/DEPLOY-01/02/03/TEST-03 completed by Plans 30-01..30-05

# Metrics
duration: ~12min
completed: 2026-04-22
---

# Phase 30 Plan 06: Production Deploy Runbook Summary

## One-liner

**Operator-ready 30-VERIFICATION.md runbook written — 476 lines across 11 sections covering first-time Vercel deploy, env-var contract, Prisma Postgres + Upstash provisioning, build-command override, one-time admin seed, 11-item smoke checklist, HSTS preload submission, known post-deploy watch-items (including the upsertBudgets IDOR finding), rollback plan, and final sign-off checklist. Pre-flight quality gate green (710/710 unit + 71/71 integration).**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-22T00:35:00Z (approximate)
- **Completed:** 2026-04-22T00:47:00Z (approximate)
- **Tasks:** 1 auto-task (runbook) + 1 checkpoint:human-action (operator smoke-check — PENDING)
- **Files touched:** 2 (1 created, 1 modified) — plus 3 prettier-only fixes in pre-flight

## Accomplishments

### 1. Pre-flight automated quality gate (green)

Before writing any documentation, ran the mandated pre-runbook gate:

```bash
npm run quality && npm run test:integration
```

Initial run surfaced 3 prettier violations in files committed by earlier plans:
- `prisma/seed.prod.ts` (from Plan 30-04)
- `tests/integration/isolation-actions.test.ts` (from Plan 30-05)
- `tests/integration/isolation-actions-totp.test.ts` (from Plan 30-05)

Fixed via `npx prettier --write` (whitespace/line-break only — no behavior change) and committed separately as `style(30-06): apply prettier to phase 30 files left unformatted by prior plans` (e52fb8d). This is a Rule 1 inline fix (bug in a committed-green plan) blocking the pre-runbook gate; the separate commit keeps the format fix distinct from the docs deliverable.

After the fix:
- `npm run quality`: PASS (build + lint 0 errors / 3 pre-existing warnings + format:check all good + 710/710 unit tests)
- `npm run test:integration`: PASS (8 files, 71/71 tests, 123s)

### 2. Wrote `.planning/phases/30-vercel-deploy-security-hardening/30-VERIFICATION.md` (476 lines)

Structure:

| § | Title | Lines | Purpose |
| --- | --- | --- | --- |
| 0 | Header | 1-12 | Title + written date + scope + audience + prerequisite |
| 1 | Pre-Deploy Prep | ~13-110 | Quality gate + secret generation + env-var table |
| 2 | Provisioning | ~112-145 | Prisma Postgres via Vercel Marketplace + Upstash Redis |
| 3 | Deploy Configuration | ~147-175 | Build-command override + defaults |
| 4 | First Deploy | ~177-195 | Trigger + watch + verify |
| 5 | One-Time Admin Seed | ~197-245 | vercel env pull + db:seed:prod + idempotency proof |
| 6 | **Smoke Checklist (11 items)** | ~247-280 | The D-27 floor — 11 numbered items, exact commands/UI steps |
| 7 | HSTS Preload Submission | ~282-310 | https://hstspreload.org procedure + warnings |
| 8 | Known Post-Deploy Watch-Items | ~312-360 | upsertBudgets IDOR (§8.1), rate-limit verification (§8.2), HSTS emission (§8.3), CSP violations (§8.4), env-validation errors (§8.5) |
| 9 | Rollback Plan | ~362-400 | Code-level (promote prior deploy), DB-level (support ticket or manual migrate resolve), what NOT to do |
| 10 | Final Sign-Off | ~402-430 | 10-item checklist for closing Phase 30 |
| 11 | Appendix — Verification Commands | ~432-476 | Pre-deploy, header check, seed idempotency, rate-limit keys, CSP nonce freshness, observability via Vercel logs |

All grep gates from 30-VALIDATION.md Task 30-06-01 + 30-06-02 pass:

| Gate | Result |
| --- | --- |
| `ls .planning/phases/30-vercel-deploy-security-hardening/30-VERIFICATION.md` | PASS (exit 0) |
| `grep -c "^[[:space:]]*[0-9]\+\." ... 30-VERIFICATION.md` | PASS (41 matches — ≥11 required) |
| `grep -q "migrate deploy" 30-VERIFICATION.md` | PASS |
| `grep -q "db:seed:prod" 30-VERIFICATION.md` | PASS |
| `grep -q "hstspreload.org" 30-VERIFICATION.md` | PASS |

### 3. Elevated the upsertBudgets IDOR finding into deferred-items.md

Plan 30-05 discovered a partial-IDOR hole in `src/app/(app)/presupuesto/actions.ts upsertBudgetsAction`: an authenticated User A can create a stale User-A-owned Budget row pointing at User B's periodId + categoryId (no mutation of User B's data, but stale rows accumulate). The finding lived only in `30-05-SUMMARY.md §Deferred Issues` until now.

Appended the full reproduction + proposed fix + test-coverage-to-add to `.planning/phases/30-vercel-deploy-security-hardening/deferred-items.md` and cross-referenced it from 30-VERIFICATION.md §8.1. The operator reading the runbook will see it during deploy verification, not bury it.

## Task Commits

1. **Pre-flight format fix:** `e52fb8d` (`style(30-06): apply prettier to phase 30 files left unformatted by prior plans`)
2. **Task 1 — runbook + deferred-items append:** `a338087` (`docs(30-06): add production deploy runbook + smoke checklist`)

**Plan metadata commit:** (next)

**Checkpoint Task 2 (operator smoke-check):** PENDING — see below.

## Verification

### Grep Gates (30-VALIDATION.md Task 30-06-01, 30-06-02)

All 5 grep gates pass (see "Wrote 30-VERIFICATION.md" section above).

### Automated Quality Gate (30-VALIDATION.md Task 30-06-03)

```
npm run quality          # 710/710 unit tests + build + lint + format:check
npm run test:integration # 71/71 integration tests across 8 files
```

Both exit 0 against `main` including the runbook commit. Docs-only changes do not touch the src/ build surface.

### Self-Check

- `.planning/phases/30-vercel-deploy-security-hardening/30-VERIFICATION.md` exists — FOUND (476 lines)
- `.planning/phases/30-vercel-deploy-security-hardening/deferred-items.md` exists — FOUND (upsertBudgets section appended)
- Commit `e52fb8d` (prettier fix) — FOUND in git log
- Commit `a338087` (runbook) — FOUND in git log
- Pre-runbook gate: `npm run quality && npm run test:integration` exits 0
- Grep gates: all 5 pass
- 11+ numbered items in smoke checklist: 41 matches (11 in §6 + others throughout document)

## Deviations from Plan

### Rule 1 - Bug — Pre-flight prettier fix

- **Found during:** Pre-flight `npm run quality` invocation (Task 1 pre-check)
- **Issue:** 3 files committed by earlier plans (Plan 30-04 committed `prisma/seed.prod.ts`; Plan 30-05 committed the 2 isolation-actions test files) failed `prettier --check`. This blocked the pre-runbook gate — Task 1 mandates `npm run quality` must exit 0 before writing 30-VERIFICATION.md.
- **Fix:** `npx prettier --write` on the 3 files (whitespace/line-break only — no behavior change). Committed separately as `style(30-06): apply prettier to phase 30 files left unformatted by prior plans` (e52fb8d) to keep format fix distinct from docs deliverable.
- **Files modified:** `prisma/seed.prod.ts`, `tests/integration/isolation-actions.test.ts`, `tests/integration/isolation-actions-totp.test.ts`
- **Commit:** `e52fb8d`

### Plan deviation — runbook expanded to 11 sections

- **Plan called for:** ~220 lines, §0-§5 (Prerequisites, Deploy Runbook, Smoke Checklist, HSTS, Post-Deploy Monitoring, Final Sign-Off)
- **Delivered:** 476 lines, §1-§11 (Pre-Deploy Prep, Provisioning, Deploy Config, First Deploy, One-Time Admin Seed, Smoke Checklist, HSTS Preload, Known Watch-Items, Rollback Plan, Final Sign-Off, Appendix)
- **Rationale:** Prompt's `<special_instructions>` specified a 10-section structure with explicit sections for Rollback Plan and Appendix — beyond the plan's 6-section floor. Special-instructions also mandated elevating the upsertBudgets IDOR finding as a §8 watch-item. Both deltas are operator-safety additions, not scope creep.
- **Length:** 476 lines — within the 300-500 target from special-instructions.
- **No rule-1/2/3 auto-fix needed** — this is an authorized scope expansion per special-instructions.

### Out-of-scope discoveries

None. The 3 pre-existing lint warnings in `src/app/(app)/movimientos/actions.ts` were already tracked in `deferred-items.md` from Plan 30-01.

### Authentication Gates

None.

## Issues Encountered

None beyond the prettier pre-flight gap (auto-fixed as Rule 1).

## Phase 30 Overall — State at End of Plan 30-06

### Requirements Status

| Requirement | Status | Where |
| --- | --- | --- |
| ISOL-05 | Complete | Plan 30-05 (12 read tests + 13 mutation tests) |
| DEPLOY-01 | Complete | Plan 30-01 (Prisma 7 dual-URL + Vercel Marketplace contract) |
| DEPLOY-02 | Complete | Plan 30-03 (CSP + HSTS + 4 other headers) |
| DEPLOY-03 | Complete | Plan 30-04 (seed.prod.ts idempotent no-rotate) |
| **DEPLOY-04** | **Pending** | **Operator-to-complete after §6 smoke-check passes on real Vercel deploy** |
| TEST-03 | Complete | Plan 30-05 (cross-user isolation suite expanded) |

### Plans Status

| Plan | Status | Summary |
| --- | --- | --- |
| 30-01 | Complete | Prisma dual-URL + env stubs |
| 30-02 | Complete | Zod env validator + consumer sweep |
| 30-03 | Complete | Security headers + CSP nonce |
| 30-04 | Complete | Production admin seed |
| 30-05 | Complete | Cross-user isolation test expansion |
| **30-06** | **Runbook written (Task 1 ✓), operator smoke-check PENDING (Task 2)** | See below |

### Deferred Issues Tracked for Post-Phase-30

- **upsertBudgets partial-IDOR** (Plan 30-05 discovery → `deferred-items.md` → 30-VERIFICATION.md §8.1) — low severity, no data mutation of other users, but stale rows accumulate. Proposed fix: add period-ownership guard matching `closePeriod` / `reopenPeriod` pattern. Suggested owner: Phase 30.1 gap-closure or follow-up issue.
- **3 pre-existing lint warnings** in `src/app/(app)/movimientos/actions.ts` — unchanged since Plan 30-01 discovery. Suggested owner: future lint-pass plan.
- **Flaky backup-codes.test.ts** parallel-worker race — passes 710/710 on re-run; passes 14/14 in isolation. Suggested owner: future test-stability plan.

## Next Step — Plan 30-06 Task 2 (checkpoint:human-action)

Plan 30-06 Task 2 is a `checkpoint:human-verify` per the plan file — but because the work is on a real Vercel deploy with real Upstash + real authenticator app, it is operationally a `human-action`. The operator must:

1. Read `.planning/phases/30-vercel-deploy-security-hardening/30-VERIFICATION.md` end-to-end.
2. Execute §1-§5 (pre-deploy prep through admin seed) against a real Vercel project.
3. Run §6 (11-item smoke checklist) against the deployed URL.
4. Optionally execute §7 (HSTS preload submission) after 1 week of stable HTTPS.

When all 11 smoke-checklist items pass, mark:
- `DEPLOY-04` → Complete in `.planning/REQUIREMENTS.md`
- Phase 30 → Complete in `.planning/ROADMAP.md`
- Milestone v3.0 → Shipped in `.planning/STATE.md`

See 30-VERIFICATION.md §10 Final Sign-Off for the closing checklist.

## Self-Check: PASSED

- `.planning/phases/30-vercel-deploy-security-hardening/30-VERIFICATION.md` — FOUND (476 lines)
- `.planning/phases/30-vercel-deploy-security-hardening/deferred-items.md` — FOUND (upsertBudgets section appended)
- Commit `e52fb8d` (pre-flight prettier fix) — FOUND in git log
- Commit `a338087` (runbook + deferred-items append) — FOUND in git log
- Pre-runbook quality gate: `npm run quality && npm run test:integration` exits 0
- All 5 grep gates from 30-VALIDATION.md pass

---
*Phase: 30-vercel-deploy-security-hardening*
*Plan: 06*
*Completed (Task 1 docs): 2026-04-22*
*Task 2 (operator smoke-check): PENDING*
