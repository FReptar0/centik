# Phase 14: Signature Visual Identity - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Document the six distinctive Glyph Finance visual signatures in STYLE_GUIDE.md with enough detail that a developer (or Stitch AI) can implement each one from the specification alone. This is a docs-only change — no code modifications. Two of the six signatures (SIG-02 battery-bar and SIG-03 monospaced display) were already fully specced in Phases 12-13, so this phase focuses on the remaining four plus a dedicated "Identidad Visual" section that ties all six together.

</domain>

<decisions>
## Implementation Decisions

### SIG-01: Dot-Matrix Texture
- **Where:** Hero cards only — dashboard balance card and analytics comparison card. NOT all elevated cards, NOT section headers.
- **Grid size:** 8x8 pixel grid. Matches the pixel-art icon aesthetic.
- **Coverage:** Full card surface. Subtle texture covers the entire hero card background.
- **Color/opacity:** `--color-dot-matrix` (#1E1E1E) at 40% opacity. "A whisper, not a shout."
- **Implementation detail level:** Include ready-to-copy CSS/SVG code (repeating SVG background-image or CSS radial-gradient).

### SIG-02: Segmented Battery-Bar (Already specced)
- Fully documented in Phase 13 STYLE_GUIDE.md. 10 segments, 2px gaps, traffic-light colors, CSS guidance included.
- Phase 14 just references this in the unified "Identidad Visual" section. No new spec work needed.

### SIG-03: Monospaced Financial Display (Already specced)
- Fully documented in Phase 12 STYLE_GUIDE.md typography section. IBM Plex Mono, muted smaller dollar sign, color-coded.
- Phase 14 just references this in the unified section. No new spec work needed.

### SIG-04: Category Icon Style
- **Style:** 8x8 pixel-art inspired — simple, geometric, recognizable at small size.
- **Library:** Still Lucide React — the pixel-art descriptor is an aesthetic guidance for icon selection and rendering, not a custom icon set.
- **Implementation:** Document guidance on which Lucide icons to prefer (geometric, thin-stroke) and how to render them to feel "pixel-inspired" (e.g., stroke-width 1.5px, crisp rendering, no anti-aliasing smoothing).
- **Container:** Already specced in Phase 12 (muted category color at 12% opacity background, 36x36 or 40x40, border-radius 12px).

### SIG-05: Status Dot Animation
- **Placement:** Claude's Discretion — pick the most impactful placement (current period indicator, nav active state, updating KPIs, or combination).
- **Size:** 4px solid circle. No glow, no shadow. Consistent with the shadow-free elevation philosophy.
- **Color:** `--color-accent` (#CCFF00) chartreuse.
- **Pulse behavior:** Claude's Discretion — continuous gentle pulse vs pulse-on-change. Pick what fits the "calm, precise" aesthetic.
- **Include:** CSS keyframe animation code in the spec.

### SIG-06: Pixel-Dissolve Micro-Animation
- **Priority:** Core identity element — spec in full detail with CSS keyframe examples.
- **Trigger:** Data refresh moments — when KPIs update, charts re-render, or new data appears. Numbers "dissolve" into new values.
- **Visual style:** Scanline reveal — element renders top-to-bottom in horizontal scanlines, like a CRT or dot-matrix printer.
- **Duration:** 400-600ms. Clearly visible but doesn't frustrate.
- **Include:** Full CSS @keyframes example with clip-path or mask approach and timing function.

### Claude's Discretion
- Status dot placement strategy (which elements get dots)
- Status dot pulse behavior (continuous vs on-change)
- Exact scanline reveal CSS approach (clip-path vs mask-image)
- Category icon Lucide selection guidance (which specific icons feel most "pixel-art")
- How to structure the "Identidad Visual" section — whether as a standalone new section or integrated into existing sections

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- STYLE_GUIDE.md already contains: dot-matrix color token, battery-bar spec (full CSS), monospaced typography spec, icon container spec, elevation hierarchy
- Phase 12 defined `--color-dot-matrix: #1E1E1E` token in the @theme block
- Phase 13 Progress Bars section includes complete battery-bar CSS guidance

### Established Patterns
- STYLE_GUIDE.md uses Spanish language
- Component specs include CSS/code examples where helpful (battery-bar has CSS guidance, focus rings have CSS rule)
- Sections follow the Glyph Finance restructured organization

### Integration Points
- New "Identidad Visual" section consolidates all 6 signatures in one place
- References existing sections (battery-bar in Componentes Base, typography in Tipografia)
- Dot-matrix CSS will be used by hero card implementations
- Scanline animation will be used by data-updating components

</code_context>

<specifics>
## Specific Ideas

- Stitch project design MD mentions "4x4 or 8x8 dot grid texture" for active/premium card states — user chose 8x8
- Stitch design MD: "Dot-Matrix Accents: Use a 4x4 or 8x8 dot grid texture in the background of cards to denote 'active' or 'premium' states"
- The scanline reveal should feel like "a dot-matrix printer rendering data" — mechanical, precise, retro
- Status dot is inspired by Nothing Phone's glyph interface — small LED indicators that communicate state without text

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 14-signature-visual-identity*
*Context gathered: 2026-04-06*
