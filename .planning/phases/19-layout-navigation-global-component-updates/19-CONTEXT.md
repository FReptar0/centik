# Phase 19: Layout, Navigation + Global Component Updates - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Apply Glyph Finance visual specs to the app frame: pill buttons everywhere, borderless cards, icon-only bottom nav with dot indicator, bottom sheet modals on mobile, pill badges, dot-matrix texture on hero cards, StatusDot placement, and DynamicIcon tuning. All 8 requirements are visual updates to existing components — no new features, no new components.

</domain>

<decisions>
## Implementation Decisions

All decisions locked from STYLE_GUIDE.md, UX_RULES.md, and prior phase contexts. No user discussion needed.

### UPDATE-01: Pill Buttons
- All buttons: border-radius 9999px (radius-full), 98% scale press (active:scale-[0.98])
- Primary: --color-accent fill, #000000 text
- Secondary: transparent + 1px --color-border-divider border
- Danger: --color-negative (#FF3333) fill, white text
- Ghost: transparent, --color-text-secondary text
- See STYLE_GUIDE.md > Componentes Base > Buttons

### UPDATE-02: Borderless Cards
- No visible borders — elevation via background-shift only
- Stacked cards: 1px --color-border-divider separator
- Hero cards (dashboard balance, analytics): dot-matrix texture background (UPDATE-10)
- Horizontal scroll cards for categories (dashboard)
- See STYLE_GUIDE.md > Componentes Base > Cards

### UPDATE-05: Icon-Only Bottom Nav
- Remove text labels from MobileNav
- 4px chartreuse dot indicator 8px below active icon
- Inactive icons: --color-text-secondary (#999999)
- FAB stays separate (circular 48px chartreuse)
- StatusDot on active nav icon (UPDATE-12)
- See UX_RULES.md > Section 3.2

### UPDATE-06: Bottom Sheet Modals
- Mobile: 85vh, slide up from bottom, drag handle (40px x 4px), top-corner radius (--radius-xl)
- Desktop: centered modal, --radius-xl, no visible borders
- Modal.tsx needs headerContent prop for custom header layouts
- See STYLE_GUIDE.md > Componentes Base > Modales

### UPDATE-09: Pill Badges
- All badges: border-radius 9999px (radius-full)
- 6 semantic variants (accent, positive, negative, warning, info, neutral)
- Subtle background + solid text color
- See STYLE_GUIDE.md > Componentes Base > Badges

### UPDATE-10: Dot-Matrix Texture
- Hero cards only (dashboard balance, analytics comparison)
- 8x8 SVG data URI, --color-dot-matrix at 40% opacity
- CSS pseudo-element overlay (::before with pointer-events: none)
- See STYLE_GUIDE.md > Identidad Visual > Textura Dot-Matrix

### UPDATE-12: StatusDot Placement
- Current period indicator (period selector)
- Nav active state (bottom nav + sidebar)
- Use StatusDot component from Phase 18
- See STYLE_GUIDE.md > Identidad Visual > Status Dot

### UPDATE-13: DynamicIcon Tuning
- Default strokeWidth: 1.5px (down from 2px default)
- shape-rendering: crispEdges for pixel-aligned rendering
- See STYLE_GUIDE.md > Identidad Visual > Iconos de Categoria

### Claude's Discretion
- Whether to create a shared Button component or update classes inline across files
- How to implement the drag handle visual in bottom sheet (CSS pseudo-element vs div)
- Dot-matrix texture CSS specifics (z-index, positioning)
- Whether StatusDot in nav is always visible or only on current period pages
- Order of file updates within each plan

</decisions>

<code_context>
## Existing Code Insights

### Key Files to Modify
- `src/components/layout/MobileNav.tsx` — text labels removal, dot indicator
- `src/components/layout/Sidebar.tsx` — StatusDot placement
- `src/components/layout/FAB.tsx` — pill shape already applied via token migration
- `src/components/layout/PeriodSelector.tsx` — StatusDot for current period
- `src/components/ui/Modal.tsx` — bottom sheet pattern, headerContent prop
- `src/components/dashboard/KPICard.tsx` — card styling, dot-matrix on hero
- `src/components/ui/DynamicIcon.tsx` — strokeWidth default, crispEdges

### Primitives Available (Phase 18)
- `StatusDot` — ready to import and place
- `TogglePills` — available but adoption is Phase 21 (transaction form)
- `BatteryBar` — available but adoption is Phase 20 (progress bars)
- `FloatingInput` — available but adoption is Phase 21 (forms)

### Established Patterns
- Tokens already migrated (Phase 17) — all files use new Glyph Finance class names
- cn() utility for conditional classes
- "use client" on interactive components

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

*Phase: 19-layout-navigation-global-component-updates*
*Context gathered: 2026-04-08*
