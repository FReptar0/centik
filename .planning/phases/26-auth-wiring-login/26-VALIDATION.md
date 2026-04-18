---
phase: 26
slug: auth-wiring-login
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-17
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.mts |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run && npm run build` |
| **Integration test command** | `npm run test:integration` |
| **E2E test command** | `npm run test:e2e` |
| **Estimated runtime** | ~30 seconds (unit), ~60 seconds (integration), ~30 seconds (e2e) |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 26-00-01 | 00 | 0 | TEST-02 | stubs | `npx vitest run src/auth.test.ts src/proxy.test.ts src/actions/auth.test.ts` | W0 creates | ⬜ pending |
| 26-01-01 | 01 | 1 | AUTH-02, AUTH-05 | tsc+stubs | `npx tsc --noEmit && npx vitest run src/auth.test.ts src/proxy.test.ts src/actions/auth.test.ts` | ✅ W0 | ⬜ pending |
| 26-02-01 | 02 | 1 | AUTH-03 | build+tests | `npm run build && npm run test:run` | ✅ W0 | ⬜ pending |
| 26-03-01 | 03 | 2 | AUTH-04 | build | `npm run build` | N/A (UI) | ⬜ pending |
| 26-03-02 | 03 | 2 | TEST-02 | unit | `npx vitest run src/auth.test.ts src/proxy.test.ts src/actions/auth.test.ts src/lib/validators.test.ts` | ✅ W0 | ⬜ pending |
| 26-03-03 | 03 | 2 | TEST-02 | integration+e2e | `npm run test:integration` | Plan 03 creates | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/auth.test.ts` — stubs for authorize, JWT, session callbacks (Plan 00 creates)
- [x] `src/proxy.test.ts` — stubs for proxy redirect behavior (Plan 00 creates)
- [x] `src/actions/auth.test.ts` — stubs for login action (Plan 00 creates)

*Wave 0 plan (26-00-PLAN.md) creates all stub files before Wave 1 execution.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Login page visual design matches Glyph Finance | AUTH-04 | Visual verification | Visit /login, verify OLED black bg, FloatingInput, chartreuse button, Centik branding |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved
