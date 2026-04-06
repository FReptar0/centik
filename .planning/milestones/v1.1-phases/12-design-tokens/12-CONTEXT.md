# Phase 12: Design Tokens - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Rewrite STYLE_GUIDE.md foundational sections (colors, typography, spacing, elevation, Tailwind config) with the Glyph Finance design system tokens. This phase covers sections 1-6 and 9-10 of the current doc (design principles, color palette, typography, spacing, borders/radius, shadows, amount formatting, and Tailwind config). Component specs (section 8) are Phase 13. This is a docs-only change — no code modifications.

</domain>

<decisions>
## Implementation Decisions

### Font choices
- Monospaced font for financial numbers: **IBM Plex Mono** (replaces JetBrains Mono)
- Geometric sans for headings and body: **Satoshi** (replaces DM Sans)
- ALL financial numbers use IBM Plex Mono everywhere — tables, lists, cards, inputs, KPIs. Not just display amounts.
- 5-level type hierarchy: Display, Heading, Body, Label, Meta (compromise between Glyph Finance's strict 3-level and current 8-size scale)
- Metadata/labels: uppercase, letterspaced +2px, smaller size, muted color

### Category colors
- Keep distinct category colors but **desaturate significantly** — muted versions of current colors
- Document **explicit hex values** for each muted category color (not a formula/rule)
- Icon containers: muted category color at low opacity behind the icon (same pattern as current, with muted colors)
- Highest-spending category card gets a **subtle chartreuse left-border accent** in budget/dashboard views

### Token naming
- **Rename CSS variables to match Glyph Finance spec vocabulary** — breaks from current naming
- New names: --color-bg, --color-surface, --color-surface-elevated, --color-surface-hover, --color-border-divider, --color-dot-matrix, --color-text-tertiary, etc.
- No migration table in STYLE_GUIDE.md — document only the new system. Implementation figures out the migration.
- Keep **subtle variants** (--color-accent-subtle, --color-positive-subtle, etc.) at ~12-15% opacity for badge/tag backgrounds
- **Drop all shadows** — pure elevation-only hierarchy. Focus rings use solid outline, no glow shadow.

### Document language and structure
- STYLE_GUIDE.md stays in **Spanish**
- **Restructure** the document to follow Glyph Finance spec organization (Philosophy → Visual Identity → tokens), not current numbered sections
- Header: "STYLE_GUIDE.md — Centik Design System" (no separate "Glyph Finance" branding in the doc)

### Claude's Discretion
- Exact muted hex values for each category color (derive from desaturation of current colors)
- Section ordering within the restructured document
- Level of detail in the Tailwind @theme block comments
- How to document the 5-level type hierarchy sizes (exact px/rem values)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/globals.css`: Current @theme block (52 lines) — will be replaced entirely in implementation
- JetBrains Mono already in font stack — will be replaced by IBM Plex Mono
- DM Sans loaded via next/font/google — will be replaced by Satoshi

### Established Patterns
- Tailwind v4 CSS-first @theme pattern (no tailwind.config.ts)
- `@theme inline` for next/font CSS variable injection — same pattern needed for Satoshi
- Category colors defined as --color-cat-* variables in @theme
- Semantic colors follow --color-{semantic} pattern

### Integration Points
- globals.css @theme block is the single source of truth for all design tokens
- :focus-visible rule references --color-accent — will change to chartreuse
- body styles reference --color-bg-primary and --color-text-primary

</code_context>

<specifics>
## Specific Ideas

- Nothing OS × Bloomberg Terminal × Dieter Rams aesthetic — retro-futuristic minimalism
- OLED black (#000000) as primary background — pure black, not near-black
- Chartreuse (#CCFF00) is the accent — electric, Nothing-inspired
- "Calm, confident, precise, slightly playful in details" mood
- Dot-matrix texture: #1E1E1E at 40% opacity — "a whisper, not a shout"
- No gradients (except very subtle dark-to-darker on backgrounds)
- No rounded blob shapes or bubbly UI
- WCAG 2.1 AA accessible contrast ratios required

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 12-design-tokens*
*Context gathered: 2026-04-06*
