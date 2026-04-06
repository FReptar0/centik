# Phase 13: Component Specifications - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Update all component specs in STYLE_GUIDE.md (section "Componentes Base") to reflect Glyph Finance patterns: buttons, cards, inputs, progress bars, charts, tables, badges, and modals. This is a docs-only change — no code modifications. The token foundation (colors, typography, spacing, elevation) was established in Phase 12.

</domain>

<decisions>
## Implementation Decisions

### Buttons
- **Full pill shape** — border-radius: `--radius-full` (9999px) for all buttons. Not just more rounded — true capsule shape.
- **Primary text color**: pure black (#000000) on chartreuse (#CCFF00) background. Maximum contrast.
- **Danger button**: Use `--color-negative` (#FF3333) fill with white text. Consistent with the semantic palette.
- **Secondary button**: Keep subtle 1px `--color-border-divider` (#222222) border. Differentiates from ghost variant.
- **Toggle pills**: New component variant. Active state: chartreuse fill with black text. Inactive: ghost/transparent with secondary text. Used for Expense/Income toggle, period selector (Week/Month/Year).
- **Button press interaction**: Slight 98% scale shrink on press to mimic tactile switch feel.

### Segmented Progress Bars (Battery-Bar)
- **Replaces ALL smooth progress bars** — budget, credit utilization, debt payoff, any percentage indicator.
- **Always 10 segments**. Each segment = 10%. Simple mental math. No context-dependent counts.
- **2px gaps** between segments. Segments are rectangular.
- **Traffic-light color system preserved** on segments:
  - Chartreuse (`--color-accent`) for < 80%
  - Orange (`--color-warning`) for 80-99%
  - Red (`--color-negative`) for 100%+
- **Overflow (100%+):** Claude's Discretion — pick best visual treatment (all red segments, or red + overage text).
- **Container**: dark background at semantic color 12% opacity, same height as current (6px compact, 8px detailed).

### Charts (All Minimal)
- **No grid lines** on any chart type (bar, line/area, donut).
- **Dot endpoints**: 4px solid dots on line/area chart data points.
- **Stroke width**: 1.5px for lines (down from current 2px).
- **Area fill**: Keep subtle fill at ~10-15% opacity below line. Not pure line-only.
- **Bar charts**: Thinner bars, no border-radius. Clean rectangular fills.
- **Donut**: Thinner ring width for minimal feel.
- **Chart colors**: Claude's Discretion — chartreuse for single-series, category colors for multi-series.
- **Tooltips**: Claude's Discretion — card-style or minimal floating label.
- **Axis labels**: Minimal — only start/end dates for time series. No y-axis labels. Value on hover/tooltip.

### Inputs (Underline Everywhere)
- **All inputs are underline-only** — bottom border only, no full box. Consistent across all forms (not just modals).
- **Floating labels**: Label starts as placeholder on the underline, floats up to Label style (uppercase, letterspaced) when focused or filled.
- **Focus state**: Underline transitions from `--color-border-divider` to `--color-accent` (chartreuse) on focus.
- **Amount inputs with "$" prefix**: Claude's Discretion on underline + prefix treatment.
- **Background**: transparent (no `--color-surface` fill). The underline sits directly on whatever surface the form is on.
- **Error state**: Underline turns `--color-negative`, error text below in Meta level.

### Cards (from Stitch reference)
- **No visible borders** — elevation via background shift only (already established in Phase 12).
- **Stacked cards**: 1px `--color-border-divider` separator when cards are stacked vertically (practical concession — the "no-line rule" is aspirational but list readability requires subtle separators).
- **Hero/balance cards**: May include dot-matrix texture background pattern as accent (Phase 14 signature detail).
- **Horizontal scroll cards**: Small dark cards in a row for categories — icon + uppercase name + monospaced amount.

### Tables
- **Row separators**: Keep subtle 1px `--color-border-divider` bottom borders (Stitch reference shows these in transaction lists and settings).
- **No alternating row backgrounds** — clean, consistent surface.
- **Header**: `--color-bg` background, uppercase Label style text.

### Badges
- **Pill-shaped** (radius-full) — consistent with button pill shape.
- **Semantic variants**: subtle background + solid text color.
- **Used for**: income/expense tags, category labels, period indicators, "SEE ALL →" link text in chartreuse.

### Modals
- **Cards spec already covers base** (Phase 12: `--color-surface-elevated`, no border, `--radius-xl`).
- **Bottom sheet on mobile**: Slides up, 85% screen height, frosted glass overlay (rgba(0,0,0,0.7) + backdrop-blur).
- **Desktop**: Centered modal, same tokens.

### Claude's Discretion
- Chart tooltip style (card vs floating)
- Chart color strategy for single vs multi-series
- Amount input "$" prefix treatment with underline
- Progress bar overflow visual treatment (100%+)
- Bar chart exact thickness and spacing
- Donut ring width value

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- STYLE_GUIDE.md "Componentes Base" section (lines 285-370): Current specs that need updating
- Component specs already reference new Glyph Finance tokens from Phase 12
- Buttons, Inputs, Cards, Modales, Tablas, Badges, Progress Bars, Charts sections all exist

### Established Patterns
- Components section follows a consistent format: variants table, sizes table, then rules list
- Token references use the new Glyph Finance variable names from Phase 12

### Integration Points
- Component specs reference Phase 12 tokens (--color-surface-elevated, --color-accent, etc.)
- Progress bar spec feeds into Phase 14 (signature details: battery-bar is a signature element)
- Chart spec informs Phase 15 UX patterns (data visualization interaction patterns)

</code_context>

<specifics>
## Specific Ideas

- Stitch reference: https://stitch.withgoogle.com/projects/3897640726631447131
- 4 screens (Home, Analytics, Add Transaction, Profile) show the visual target
- The Stitch design MD mentions a "No-Line Rule" (no 1px borders) but the actual screens pragmatically use subtle dividers where needed for list readability
- Toggle pills (Expense/Income, Week/Month/Year) are prominent UI patterns in the Stitch reference
- Custom dark numpad for transaction entry — large touch targets, monospaced numbers, backspace icon
- "MADE WITH PRECISION" footer tagline in profile screen
- "SEE ALL →" link pattern in chartreuse accent

</specifics>

<deferred>
## Deferred Ideas

- Custom numpad component spec — belongs in Phase 15 (UX Patterns, transaction flow)
- Dot-matrix texture CSS/SVG implementation details — Phase 14 (Signature Details)
- Navigation bottom bar spec — Phase 15 (UX Patterns)
- "MADE WITH PRECISION" footer — nice touch, but out of scope for component specs

</deferred>

---

*Phase: 13-component-specifications*
*Context gathered: 2026-04-06*
