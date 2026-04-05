---
phase: 04-layout-shell
plan: 01
subsystem: ui
tags: [lucide-react, dynamic-icon, modal, responsive, navigation, constants]

# Dependency graph
requires:
  - phase: 03-foundation
    provides: cn() utility, constants.ts, types
provides:
  - DynamicIcon component resolving Lucide icons by DB string name
  - ICON_MAP with ~30 statically imported icons for tree-shaking
  - Nav constants (SIDEBAR_NAV_ITEMS, MOBILE_TAB_ITEMS, MORE_MENU_ITEMS)
  - PERIOD_AWARE_ROUTES and MONTH_NAMES_ES
  - Responsive Modal/Sheet primitive (bottom sheet mobile, centered modal desktop)
affects: [04-layout-shell, 05-income-crud, 06-categories, 07-transactions]

# Tech tracking
tech-stack:
  added: []
  patterns: [static-icon-map, css-only-responsive-modal, nav-constants-i18n-ready]

key-files:
  created:
    - src/components/ui/DynamicIcon.tsx
    - src/components/ui/DynamicIcon.test.tsx
    - src/components/ui/Modal.tsx
    - src/components/ui/Modal.test.tsx
  modified:
    - src/lib/constants.ts
    - src/lib/constants.test.ts

key-decisions:
  - "DynamicIcon uses static named imports from lucide-react (NOT barrel export) for tree-shaking"
  - "Modal renders both mobile and desktop markup simultaneously with CSS-only responsive (prevents hydration mismatch)"
  - "Tests use afterEach cleanup and getAllBy queries to account for dual-render CSS responsive pattern"

patterns-established:
  - "Static icon map: resolve DB string names to Lucide components via ICON_MAP export"
  - "CSS-only responsive modal: both layouts rendered, Tailwind breakpoints show/hide"
  - "Nav constants: i18n-ready Spanish labels in typed NavItem array"

requirements-completed: [LAYOUT-07]

# Metrics
duration: 4min
completed: 2026-04-05
---

# Phase 4 Plan 1: UI Primitives and Nav Constants Summary

**DynamicIcon with static import map (~30 icons), responsive Modal/Sheet primitive, and typed nav constants (sidebar 6, mobile 4, more 3) with Spanish labels**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-05T02:57:01Z
- **Completed:** 2026-04-05T03:01:41Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- DynamicIcon resolves all 8 default category icons plus nav and custom icons via static import map, falling back to Package for unknown names
- Responsive Modal renders as bottom sheet on mobile and centered modal on desktop using CSS-only approach (no JS viewport detection)
- Nav constants define all sidebar, mobile tab, and more menu items with typed NavItem interface and validated icon name references

## Task Commits

Each task was committed atomically:

1. **Task 1: DynamicIcon component and nav constants with tests** - `900b859` (feat)
2. **Task 2: Modal/Sheet responsive primitive with tests** - `6b7973d` (feat)

## Files Created/Modified
- `src/components/ui/DynamicIcon.tsx` - Lucide icon resolver by DB string name with ICON_MAP export
- `src/components/ui/DynamicIcon.test.tsx` - Tests for icon resolution, fallback, prop pass-through
- `src/components/ui/Modal.tsx` - Client Component responsive modal/sheet with backdrop, Escape, title
- `src/components/ui/Modal.test.tsx` - Tests for open/close, Escape key, backdrop click, title rendering
- `src/lib/constants.ts` - Added NavItem interface, SIDEBAR_NAV_ITEMS, MOBILE_TAB_ITEMS, MORE_MENU_ITEMS, PERIOD_AWARE_ROUTES, MONTH_NAMES_ES
- `src/lib/constants.test.ts` - Added tests for nav item counts, icon name validation, month names, period routes

## Decisions Made
- DynamicIcon uses individual named imports from lucide-react (NOT the `icons` barrel export) to preserve tree-shaking -- barrel import would add all 1,694 icons to the bundle
- Modal renders both mobile bottom sheet and desktop centered modal markup simultaneously, using Tailwind responsive classes (`md:hidden` / `hidden md:flex`) to show/hide -- this prevents React hydration mismatches
- Tests use `afterEach(cleanup)` and `getAllBy*` queries to account for the dual-render responsive pattern where elements appear twice in the DOM

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test assertions for dual-render CSS responsive pattern**
- **Found during:** Task 2 (Modal tests)
- **Issue:** Tests used `getByText` which expects a single element, but both mobile and desktop variants render the same content in the DOM
- **Fix:** Changed to `getAllByText` / `getAllByRole` and added `afterEach(cleanup)` to prevent cross-test DOM leakage
- **Files modified:** src/components/ui/Modal.test.tsx
- **Verification:** All 7 Modal tests pass
- **Committed in:** 6b7973d (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary fix for test correctness with the CSS-only responsive approach. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- DynamicIcon ready for use in Sidebar, MobileNav, and all components that render category icons
- Nav constants ready for Sidebar and MobileNav to consume
- Modal primitive ready for FAB transaction form and any future form overlays
- All icon names used in nav constants validated against ICON_MAP

## Self-Check: PASSED

All 6 source/test files verified on disk. Both task commits (900b859, 6b7973d) verified in git history.

---
*Phase: 04-layout-shell*
*Completed: 2026-04-05*
