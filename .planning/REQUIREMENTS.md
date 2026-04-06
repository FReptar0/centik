# Requirements: Centik

**Defined:** 2026-04-06
**Core Value:** A single user can register a financial transaction in under 30 seconds and immediately see how it impacts their budget, debt ratio, and savings rate across all views.

## v1.1 Requirements

Requirements for Glyph Finance design system overhaul. Docs-only milestone — no code changes.

### Design Tokens

- [x] **TOKENS-01**: STYLE_GUIDE.md color palette replaced with Glyph Finance tokens (OLED #000000 bg, #0A0A0A secondary, #141414 surface, #222222 borders, #E8E8E8 text, #CCFF00 accent, #FF3333 negative, #00E676 positive, #1E1E1E dot-matrix)
- [x] **TOKENS-02**: STYLE_GUIDE.md typography updated to monospaced numbers (JetBrains Mono/Space Mono) + geometric sans headings (Outfit/Satoshi), with 3-level hierarchy (Display, Body, Meta) and uppercase letterspaced metadata
- [x] **TOKENS-03**: STYLE_GUIDE.md spacing and radius updated (20-24px card padding, 12px gaps, 16px margins, 16px card radius, 12px button radius, 24px modal radius)
- [x] **TOKENS-04**: STYLE_GUIDE.md shadows replaced with elevation-only hierarchy (no decorative borders, bg shift for depth: #000000 → #0A0A0A → #141414)
- [x] **TOKENS-05**: STYLE_GUIDE.md Tailwind config section updated with new Glyph Finance CSS @theme tokens

### Components

- [x] **COMP-01**: Card specs updated (no visible borders, #141414 surface on #000000, 1px #222222 separator when stacked)
- [x] **COMP-02**: Button specs updated to pill-shaped with accent fill for primary, ghost/outline for secondary
- [x] **COMP-03**: Progress bar specs replaced with segmented battery-bar style (10 rectangular segments, 2px gaps, chartreuse fill)
- [x] **COMP-04**: Chart specs updated (no grid lines, dot endpoints, 1.5px stroke in accent, minimal axis labels)
- [x] **COMP-05**: Input specs updated (underline-only style for modal/sheet forms, standard style for desktop forms)
- [x] **COMP-06**: Table specs updated to match new elevation model and color tokens
- [x] **COMP-07**: Badge specs updated with new color palette and pill styling

### Signature Details

- [x] **SIG-01**: Dot-matrix texture specification documented (pixel-grid pattern at 40% #1E1E1E opacity for section headers/card accents)
- [x] **SIG-02**: Segmented battery-bar indicator specification documented (10 rectangular segments for budget/utilization progress)
- [x] **SIG-03**: Monospaced financial data display spec documented (left-aligned muted dollar sign at smaller size, right-aligned off-white digits)
- [x] **SIG-04**: Category icon style spec updated (8x8 pixel-art inspired, simple geometric, recognizable at small size)
- [x] **SIG-05**: Status dot animation spec documented (accent-colored pulsing glow dot near live/updating data)
- [x] **SIG-06**: Glyph-style micro-animation spec documented (pixel-dissolve fade-in effect for element rendering)

### UX Patterns

- [x] **UX-01**: UX_RULES.md navigation updated — bottom tab bar icon-only (no text labels) with small dot indicator for active state, circular accent-filled Add button
- [x] **UX-02**: UX_RULES.md amount display updated — monospaced numbers, muted smaller dollar sign, off-white digits, color-coded by direction
- [x] **UX-03**: UX_RULES.md transaction flow updated — bottom sheet modal (85% screen height), category circular icon grid with accent ring selection, custom dark numpad option
- [ ] **UX-04**: UX_RULES.md responsive patterns updated for new component specs, navigation model, and elevation hierarchy
- [ ] **UX-05**: UX_RULES.md form patterns updated (underline inputs in modals, uppercase letterspaced labels, circular category grid selector)

### References

- [ ] **REF-01**: CLAUDE.md styling section updated to reference Glyph Finance tokens (colors, fonts, radius, spacing) instead of current cyan/dark palette

## v2 Requirements

Deferred to future milestones.

### Implementation

- **IMPL-01**: Implement Glyph Finance tokens in Tailwind CSS @theme
- **IMPL-02**: Implement component redesign across all pages
- **IMPL-03**: Add dot-matrix texture CSS/SVG patterns
- **IMPL-04**: Add segmented progress bar component
- **IMPL-05**: Add pixel-dissolve micro-animations
- **IMPL-06**: Integrate monospaced font for all financial figures

### Features

- **FEAT-01**: System of value units (UDI, UMA, USD) with configurable rate providers
- **FEAT-02**: Asset/investment tracking (PPR, CETES, funds) with MXN conversion
- **FEAT-03**: Authentication (NextAuth/Clerk) for multi-user support
- **FEAT-04**: PWA with offline support

## Out of Scope

| Feature | Reason |
|---------|--------|
| Code changes to components | Docs-only milestone — implementation deferred to v1.2+ after Stitch validation |
| App name change | Keeping Centik/MisFinanzas — Glyph Finance is the design system name only |
| Light mode | Dark-only remains the design decision (OLED black reinforces this) |
| Custom icon font | Using Lucide React with pixel-art styling guidance, not building a custom font |
| Screen-by-screen Stitch prompts in docs | User-facing Stitch workflow stays separate from reference docs |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TOKENS-01 | Phase 12 | Complete |
| TOKENS-02 | Phase 12 | Complete |
| TOKENS-03 | Phase 12 | Complete |
| TOKENS-04 | Phase 12 | Complete |
| TOKENS-05 | Phase 12 | Complete |
| COMP-01 | Phase 13 | Complete |
| COMP-02 | Phase 13 | Complete |
| COMP-03 | Phase 13 | Complete |
| COMP-04 | Phase 13 | Complete |
| COMP-05 | Phase 13 | Complete |
| COMP-06 | Phase 13 | Complete |
| COMP-07 | Phase 13 | Complete |
| SIG-01 | Phase 14 | Complete |
| SIG-02 | Phase 14 | Complete |
| SIG-03 | Phase 14 | Complete |
| SIG-04 | Phase 14 | Complete |
| SIG-05 | Phase 14 | Complete |
| SIG-06 | Phase 14 | Complete |
| UX-01 | Phase 15 | Complete |
| UX-02 | Phase 15 | Complete |
| UX-03 | Phase 15 | Complete |
| UX-04 | Phase 15 | Pending |
| UX-05 | Phase 15 | Pending |
| REF-01 | Phase 16 | Pending |

**Coverage:**
- v1.1 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0

---
*Requirements defined: 2026-04-06*
*Last updated: 2026-04-06 after roadmap creation*
