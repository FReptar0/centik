# Phase 18: New Primitive Components - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Build 4 new reusable UI primitives in `src/components/ui/`: BatteryBar, FloatingInput, StatusDot, TogglePills. All specs are locked in STYLE_GUIDE.md (Phases 12-14). Each component must be fully tested in isolation. No feature integration yet — that happens in Phases 19-21.

</domain>

<decisions>
## Implementation Decisions

All decisions are locked from STYLE_GUIDE.md and UX_RULES.md. No user discussion needed — specs are comprehensive.

### BatteryBar (COMP-01)
- See STYLE_GUIDE.md > Componentes Base > Progress Bars (Battery-Bar)
- 10 rectangular segments, 2px gaps, traffic-light colors
- ARIA: role="progressbar", aria-valuenow, aria-valuemin, aria-valuemax
- Two heights: 6px (compact) and 8px (detailed)
- Overflow (100%+): all segments red + text indicator

### FloatingInput (COMP-02)
- See STYLE_GUIDE.md > Componentes Base > Inputs
- Underline-only, transparent background
- Floating label: placeholder position → uppercase Label style on focus/fill
- Chartreuse underline on focus, --color-negative on error
- Amount variant: "$" prefix in --color-text-tertiary
- Real `<label htmlFor>` for accessibility

### StatusDot (COMP-03)
- See STYLE_GUIDE.md > Identidad Visual > Status Dot
- 4px chartreuse solid circle
- @keyframes status-pulse (already defined in globals.css @theme)
- Disabled when prefers-reduced-motion active
- Configurable placement via className/style props

### TogglePills (COMP-04)
- See STYLE_GUIDE.md > Componentes Base > Buttons > Toggle variants
- Active: chartreuse fill (#CCFF00), black text (#000000)
- Inactive: transparent, --color-text-secondary
- onChange callback with selected value
- Used for: Expense/Income toggle, Week/Month/Year period selector

### Testing (TEST-02, TEST-04)
- BatteryBar: segments render, colors change at thresholds, overflow state, ARIA attributes
- FloatingInput: states (empty, focused, filled, error), floating behavior, label association
- StatusDot: renders, has animation class, reduced-motion disabled
- TogglePills: active/inactive rendering, onChange fires with correct value

### Claude's Discretion
- Props API design for each component (TypeScript interfaces)
- Whether FloatingInput uses a wrapper div or direct styling on input element
- BatteryBar CSS approach (flexbox with gap vs grid)
- Test structure (describe/it grouping)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/Modal.tsx` — pattern for UI primitive structure (single file, default export, Props interface)
- `cn()` utility from clsx + tailwind-merge — used for conditional class names
- globals.css @keyframes `status-pulse` and `scanline-reveal` already defined (Phase 17)
- `--color-accent`, `--color-warning`, `--color-negative` tokens available

### Established Patterns
- One component per file, PascalCase, default export
- Props interface named `{ComponentName}Props`
- Test files co-located: `Component.test.tsx`
- `"use client"` directive for interactive components

### Integration Points
- BatteryBar will replace smooth progress bars in Phase 20 (budget, debt views)
- FloatingInput will replace all inputs in Phase 21 (transaction form + app-wide)
- StatusDot will be placed on period indicator and nav in Phase 19
- TogglePills will be used in transaction form (Phase 21) and possibly period selector

</code_context>

<specifics>
## Specific Ideas

No specific user preferences beyond the locked specs.

</specifics>

<deferred>
## Deferred Ideas

None — discussion was skipped (specs are comprehensive).

</deferred>

---

*Phase: 18-new-primitive-components*
*Context gathered: 2026-04-07*
