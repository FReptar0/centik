---
phase: 2
slug: database-schema-seed
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (already configured from Phase 1) |
| **Config file** | `vitest.integration.config.mts` |
| **Quick run command** | `npx prisma validate && npx prisma generate` |
| **Full suite command** | `npm run quality` |
| **Estimated runtime** | ~15 seconds (schema validation + seed integration test) |

---

## Sampling Rate

- **After every task commit:** Run `npx prisma validate && npx prisma generate`
- **After every plan wave:** Run `npm run quality`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | DB-01, DB-02, DB-03, DB-04, DB-09 | integration | `npx prisma validate && npx prisma generate` | N/A (schema) | ⬜ pending |
| 02-02-01 | 02 | 2 | DB-05, DB-06, DB-07, DB-08 | integration | `npx prisma db seed` + integration test | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 2 | DB-05 idempotency | integration | `npx prisma db seed && npx prisma db seed` (run twice) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/integration/seed.test.ts` — integration test for seed correctness and idempotency
- [ ] `tests/setup.ts` — real test DB connection setup (replace placeholder)
- [ ] Docker test DB running: `docker compose -f docker-compose.test.yml up -d`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Migration applies on fresh DB | DB-01 | Requires clean database | Run `npx prisma migrate reset` on dev DB, verify no errors |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
