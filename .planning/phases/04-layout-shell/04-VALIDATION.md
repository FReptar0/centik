---
phase: 4
slug: layout-shell
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (unit) — visual verification for UI components |
| **Config file** | `vitest.config.mts` |
| **Quick run command** | `npm run build && npm run lint` |
| **Full suite command** | `npm run quality` |
| **Estimated runtime** | ~20 seconds (build + lint, no UI tests for pure layout) |

---

## Sampling Rate

- **After every task commit:** Run `npm run build && npm run lint`
- **After every plan wave:** Run `npm run quality`
- **Before `/gsd:verify-work`:** Full quality + visual inspection
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | LAYOUT-07 | smoke | `npm run build && npm run lint` | N/A | ⬜ pending |
| 04-01-02 | 01 | 1 | LAYOUT-01, LAYOUT-02 | smoke + visual | `npm run build && npm run lint` | N/A | ⬜ pending |
| 04-02-01 | 02 | 2 | LAYOUT-03, LAYOUT-04 | smoke + visual | `npm run build && npm run lint` | N/A | ⬜ pending |
| 04-03-01 | 03 | 3 | LAYOUT-05, LAYOUT-06 | smoke + visual | `npm run build && npm run lint` | N/A | ⬜ pending |

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. No new test frameworks needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sidebar renders with icons and active state | LAYOUT-02 | Visual UI check | Desktop viewport: sidebar visible, active route highlighted in cyan |
| Mobile bottom tabs render 5 equal items | LAYOUT-03 | Visual UI check | Mobile viewport (<768px): 5 equal tabs, no [+] center button |
| FAB visible on all pages | LAYOUT-04 | Visual UI check | Check FAB bottom-right on both desktop and mobile viewports |
| Period selector arrows work | LAYOUT-06 | Interactive check | Click arrows, verify month changes in header |
| DynamicIcon renders by name | LAYOUT-07 | Visual check | Verify category icons display correctly in sidebar/nav |
| Tablet sidebar collapses to icons-only | LAYOUT-02 | Visual check | Tablet viewport (768-1023px): sidebar shows icons only, ~64px wide |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
