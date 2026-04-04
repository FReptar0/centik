---
phase: 1
slug: infrastructure-scaffolding
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (latest) + Playwright (latest) |
| **Config file** | `vitest.config.mts` (unit), `vitest.integration.config.mts` (integration), `playwright.config.ts` (e2e) |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npm run quality` |
| **Estimated runtime** | ~10 seconds (infra phase — mostly build/lint checks) |

---

## Sampling Rate

- **After every task commit:** Run `npm run build && npm run lint`
- **After every plan wave:** Run `npm run quality`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01 | 01 | 1 | INFRA-01 | smoke | `npm run build` | N/A (build) | ⬜ pending |
| 01-02 | 01 | 1 | INFRA-03 | smoke | `npm run lint` | N/A (lint) | ⬜ pending |
| 01-03 | 01 | 1 | INFRA-07 | manual-only | Visual inspection | N/A | ⬜ pending |
| 01-04 | 02 | 1 | INFRA-02 | manual | `docker compose up -d && docker compose -f docker-compose.test.yml up -d` | N/A (infra) | ⬜ pending |
| 01-05 | 02 | 1 | INFRA-04 | smoke | `npx vitest run` | ❌ W0 | ⬜ pending |
| 01-06 | 02 | 1 | INFRA-05 | smoke | `npx playwright test --list` | ❌ W0 | ⬜ pending |
| 01-07 | 03 | 2 | INFRA-06 | smoke | `npm run build` | N/A (build) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠��� flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.mts` — Vitest configuration file
- [ ] `vitest.integration.config.mts` — Integration test configuration
- [ ] `playwright.config.ts` — Playwright configuration
- [ ] `tests/setup.ts` — Vitest global setup file
- [ ] Framework install: `npm install -D vitest @vitejs/plugin-react vite-tsconfig-paths jsdom @testing-library/react @testing-library/dom @playwright/test`
- [ ] Playwright browsers: `npx playwright install`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Env files exist with correct keys | INFRA-07 | File existence check, not runtime behavior | Verify `.env`, `.env.example`, `.env.test` exist with `DATABASE_URL` key |
| Docker containers start | INFRA-02 | Requires Docker daemon running | Run `docker compose up -d` and `docker compose -f docker-compose.test.yml up -d`, verify containers are healthy |
| Dark palette renders correctly | INFRA-06 | Visual verification of CSS | Start dev server, verify bg color is #0a0f1a, text is #e2e8f0 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
