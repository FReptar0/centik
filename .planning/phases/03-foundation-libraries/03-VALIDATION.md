---
phase: 3
slug: foundation-libraries
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (configured from Phase 1) |
| **Config file** | `vitest.config.mts` (unit tests with v8 coverage) |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npm run quality` |
| **Estimated runtime** | ~10 seconds (pure unit tests, no DB) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npm run quality`
- **Before `/gsd:verify-work`:** `npm run test:coverage` must report 100% on src/lib/
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | FOUND-01 | unit | `npx vitest run src/lib/serialize.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | FOUND-02, FOUND-03, FOUND-04, FOUND-05 | unit | `npx vitest run src/lib/utils.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | FOUND-08 | unit | `npx vitest run src/lib/utils.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | FOUND-06 | unit | `npx vitest run src/lib/validators.test.ts` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 2 | FOUND-07 | unit | `npm run test:coverage` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `npm install -D @vitest/coverage-v8` — coverage provider not yet installed
- [ ] `src/lib/serialize.test.ts` — tests for serializeBigInts
- [ ] `src/lib/utils.test.ts` — tests for formatMoney, toCents, parseCents, formatRate, cn
- [ ] `src/lib/validators.test.ts` — tests for all Zod schemas

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| (none) | — | — | All phase behaviors have automated verification |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
