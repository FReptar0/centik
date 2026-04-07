---
phase: 17-token-foundation-class-migration
plan: 01
subsystem: ui
tags: [tailwind-v4, css-tokens, fonts, satoshi, ibm-plex-mono, design-system, glyph-finance]

# Dependency graph
requires: []
provides:
  - "Complete Glyph Finance @theme block with all color, radius, and animation tokens"
  - "Satoshi variable font loaded via next/font/local with CSS variable --font-satoshi"
  - "IBM Plex Mono loaded via next/font/google with CSS variable --font-ibm-plex-mono"
  - "dot-matrix-bg CSS class for hero card texture"
  - "status-pulse and scanline-reveal @keyframes animations"
affects: [17-02-PLAN, 17-03-PLAN, 18-component-reskin, 19-new-components]

# Tech tracking
tech-stack:
  added: [satoshi-font, ibm-plex-mono, next-font-local]
  patterns: [glyph-finance-tokens, oled-black-background, chartreuse-accent, elevation-via-background-shift]

key-files:
  created:
    - src/app/fonts/Satoshi-Variable.woff2
    - src/app/fonts/Satoshi-VariableItalic.woff2
  modified:
    - src/app/globals.css
    - src/app/layout.tsx

key-decisions:
  - "Downloaded Satoshi fonts via Fontshare CSS API (bypassed JS-driven download page)"
  - "Kept @theme inline block only for --font-sans (--font-mono uses direct value in @theme)"

patterns-established:
  - "Font loading: Satoshi via next/font/local, IBM Plex Mono via next/font/google, both CSS vars on <html>"
  - "Token naming: --color-bg, --color-surface, --color-surface-elevated for elevation hierarchy"
  - "No shadow tokens: elevation expressed purely through background color changes"
  - "Animation pattern: --animate-* token + @keyframes inside @theme block (Tailwind v4)"

requirements-completed: [TOKEN-01, TOKEN-02, TOKEN-03, TOKEN-04, TOKEN-05]

# Metrics
duration: 3min
completed: 2026-04-07
---

# Phase 17 Plan 01: Token Foundation + Font Swap Summary

**Glyph Finance @theme with OLED black (#000000), chartreuse accent (#CCFF00), Satoshi/IBM Plex Mono fonts, status-pulse and scanline-reveal animations**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-07T18:47:58Z
- **Completed:** 2026-04-07T18:50:42Z
- **Tasks:** 3 (Task 0: font download, Task 1: globals.css, Task 2: layout.tsx)
- **Files modified:** 4

## Accomplishments
- Replaced entire CSS token foundation with Glyph Finance design system (27 color tokens, 5 radius tokens, 2 animations)
- Swapped fonts from DM Sans / JetBrains Mono to Satoshi (local variable) / IBM Plex Mono (Google)
- Added dot-matrix-bg texture class and prefers-reduced-motion override for animations
- Removed all 4 shadow tokens (elevation now via background-shift only)

## Task Commits

Each task was committed atomically:

1. **Task 0: Ensure Satoshi font files exist** - `240d607` (chore)
2. **Task 1: Replace globals.css with Glyph Finance tokens** - `ff9f1f0` (feat)
3. **Task 2: Swap fonts in layout.tsx** - `765ffe0` (feat)

## Files Created/Modified
- `src/app/fonts/Satoshi-Variable.woff2` - Satoshi variable font (normal, weight 300-900)
- `src/app/fonts/Satoshi-VariableItalic.woff2` - Satoshi variable font (italic, weight 300-900)
- `src/app/globals.css` - Complete Glyph Finance @theme block, animations, dot-matrix class, reduced-motion override
- `src/app/layout.tsx` - Satoshi + IBM Plex Mono font loading, CSS variable injection, updated body class

## Decisions Made
- Downloaded Satoshi fonts programmatically via Fontshare CSS API endpoint (`api.fontshare.com/v2/css`), bypassing the JS-driven download page that the plan assumed required manual action
- Kept @theme inline only for --font-sans (references runtime CSS variable from next/font); --font-mono uses a direct value string in the main @theme block

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Downloaded Satoshi fonts via API instead of manual download**
- **Found during:** Task 0 (checkpoint:human-action)
- **Issue:** Plan required manual font download from fontshare.com, but the Fontshare CSS API provides direct CDN URLs to woff2 files
- **Fix:** Used `curl` to fetch the CSS endpoint, extracted woff2 URLs, downloaded both files programmatically
- **Files modified:** src/app/fonts/Satoshi-Variable.woff2, src/app/fonts/Satoshi-VariableItalic.woff2
- **Verification:** `file` command confirmed both are valid WOFF2 format (42KB and 43KB)
- **Committed in:** 240d607

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Eliminated manual checkpoint by discovering API access. No scope creep.

## Issues Encountered
None - plan executed as written after resolving the font download method.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Token foundation is complete -- all Tailwind utility classes now resolve from Glyph Finance tokens
- `npm run build` will NOT pass yet because 39+ component files still reference old token class names (bg-bg-primary, bg-bg-card, etc.)
- Plan 17-02 and 17-03 will complete the class migration across all component files
- Font files are committed and ready for next/font to process

## Self-Check: PASSED

All files exist, all commits verified.

---
*Phase: 17-token-foundation-class-migration*
*Completed: 2026-04-07*
