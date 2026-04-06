# Phase 15: UX Interaction Patterns - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Update UX_RULES.md with Glyph Finance interaction patterns: icon-only bottom nav with dot indicator, monospaced amount display, transaction bottom sheet with custom numpad and category grid, responsive patterns for new components, and underline form patterns. Update content within existing 11-section structure (no restructure). Full old-token sweep — zero legacy hex references when done.

</domain>

<decisions>
## Implementation Decisions

### Bottom Navigation (UX-01)
- **Keep 5 items + separate FAB** — Inicio, Movimientos, Deudas, Presupuesto, Mas. No restructure to 4 icons.
- **Remove text labels** — icon-only. True to Nothing OS aesthetic.
- **Active state:** 4px chartreuse dot positioned 8px below the active icon. No icon color change for active.
- **Inactive icons:** `--color-text-secondary` (#999999) — muted, not white.
- **"Mas" (More):** Claude's Discretion — keep slide-up sheet or replace with alternative. Pick what fits icon-only nav.
- **FAB stays separate** — circular 48px chartreuse, floating above nav, for transaction creation only.

### Amount Display (UX-02)
- Already fully specced in STYLE_GUIDE.md Phase 12 typography section.
- UX_RULES.md section 10 ("Patrones Especificos de Finanzas") needs updating to reference new tokens and monospaced display rules.
- Key change: dollar sign treatment (muted, smaller) must be reflected in UX rules for transaction lists, KPIs, and amount inputs.

### Transaction Flow (UX-03)
- **Custom dark numpad:** Full spec in UX_RULES.md. Dark surface, large touch targets (48px min), monospaced IBM Plex Mono numbers, backspace icon. Grid layout.
- **Category selector:** Claude's Discretion — 4x2 grid or horizontal scroll, based on 8 default categories.
- **Selected category:** Chartreuse accent ring border around the circular icon.
- **Bottom sheet:** Drag handle at top (40px wide, 4px tall, `--color-border-divider`). Plus X button top-left and "SAVE" top-right in chartreuse.
- **Save behavior:** Brief checkmark success state animation (200ms) before sheet closes, then toast confirmation.
- **Dot-matrix texture:** Hero amount input area gets dot-matrix texture background (referencing Identidad Visual spec).

### Responsive Patterns (UX-04)
- Update breakpoint behaviors to reference new Glyph Finance component specs (pill buttons, underline inputs, battery-bar progress, elevation-only cards).
- Mobile bottom sheet for modals (already specced in Phase 13 STYLE_GUIDE.md).
- Desktop centered modal (already specced).
- Dashboard KPI grid, chart layouts, table-to-card mobile conversion — update token references.

### Form Patterns (UX-05)
- **Underline inputs everywhere** (locked from Phase 13).
- **Floating labels** (locked from Phase 13).
- **Validation:** Error state — underline turns `--color-negative`, error text below in Meta level. Already in STYLE_GUIDE.md.
- **Category selector:** Circular icon grid with chartreuse ring (for transaction form). For other selects (< 6 options): radio group visual or grid of buttons.
- **Amount inputs:** Underline with "$" prefix treatment, `inputMode="decimal"`, IBM Plex Mono.

### Document Updates
- **Keep existing 11-section structure** — no reorganization.
- **Full old-token sweep** — replace every old hex reference (#22d3ee, #0a0f1a, #111827, etc.) with Glyph Finance tokens. Zero legacy when done.
- **Spanish language** — consistent with STYLE_GUIDE.md.
- **Cross-references:** Point to STYLE_GUIDE.md for component specs where applicable, rather than duplicating.

### Claude's Discretion
- "Mas" overflow menu pattern (slide-up sheet vs alternative)
- Category selector layout (4x2 grid vs horizontal scroll)
- Exact numpad grid layout and key sizing
- Which UX_RULES.md sections need the most updating vs light touch
- How to handle the checkmark success animation spec (simple description vs CSS keyframe)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- UX_RULES.md: 11 sections, ~370 lines, Spanish language
- Current section 3 (Layout y Navegacion) has sidebar + bottom tab bar + FAB specs
- Current section 4.1 (Registro Rapido de Transaccion) has the 4-step transaction flow
- Current section 7 (Formularios) has input/validation patterns
- Current section 10 (Patrones Especificos de Finanzas) has amount color coding and budget traffic-light rules

### Established Patterns
- UX_RULES.md uses numbered sections (1-11) with subsections
- References STYLE_GUIDE.md tokens by variable name (--color-accent, --text-secondary, etc.)
- Transaction flow described as "4 steps" with progressive disclosure

### Integration Points
- Section 3: Nav spec feeds into Phase 4 layout context (sidebar + tabs)
- Section 4.1: Transaction flow references FAB behavior, modal/sheet pattern
- Section 7: Form patterns reference STYLE_GUIDE.md input spec
- Section 10: Finance patterns reference amount formatting from STYLE_GUIDE.md

</code_context>

<specifics>
## Specific Ideas

- Stitch Home screen: bottom nav with 4 icons, no text, dot under active, circular chartreuse Add button
- Stitch Add Transaction: bottom sheet, hero amount with dot-matrix, Expense/Income toggle pills, circular category icons, custom dark numpad
- The checkmark success animation before sheet close is a small UX touch that adds "precision instrument" feel
- Custom numpad aligns with the "laboratory equipment" vibe from the Stitch design MD

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 15-ux-interaction-patterns*
*Context gathered: 2026-04-06*
