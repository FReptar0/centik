# Phase 4: Layout Shell - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Create the responsive application layout: desktop sidebar navigation (fixed 240px, icons-only on tablet), mobile bottom tab bar (5 equal items with "Más" overflow), floating action button for quick transaction entry, page header pattern with period selector, and DynamicIcon component for rendering Lucide icons by DB string name.

</domain>

<decisions>
## Implementation Decisions

### Desktop sidebar
- Top: "Centik" app name in cyan accent, bold — no logo image, no tagline
- Nav items with Lucide icons + labels (see i18n below)
- Active state: accent color background at 15% + accent text
- Inactive: text-secondary, hover → text-primary
- Footer: nothing — keep clean
- Width: fixed 240px on desktop (≥1024px)

### Tablet behavior (768-1023px)
- Sidebar collapses to ~64px, icons only
- Hover tooltip shows the full label
- No hamburger menu on tablet — collapsed sidebar is always visible

### Mobile bottom tab bar (<768px)
- 5 equal items: Inicio, Movimientos, Deudas, Presupuesto, Más
- NO center [+] button in the tab bar — FAB is separate (see below)
- "Más" (MoreHorizontal icon) opens a slide-up sheet with: Ingresos, Historial, Configuración (future)
- Icons 20px with 10px label below
- Active state: accent color icon + label

### Floating Action Button (FAB)
- Position: bottom-right corner, floating above content (and above bottom tab bar on mobile)
- Appearance: circular 48px, cyan accent background, white "+" icon
- Always visible on every page — never hidden
- Tap opens transaction form:
  - Mobile: bottom sheet sliding up, max 90vh
  - Desktop: centered modal, max-width 480px
- The FAB is for transaction creation ONLY — unambiguous purpose

### Navigation labels — i18n-ready Spanish
- Default: Spanish labels stored in a constants/locale file
- Sidebar: Inicio, Movimientos, Deudas, Presupuesto, Ingresos, Historial
- Mobile tabs: Inicio, Movimientos, Deudas, Presupuesto, Más
- Easy to swap to English later by changing the constants file — no runtime toggle in MVP

### Page header pattern
- Title: text-2xl bold (page name)
- Subtitle: period indicator in text-muted (e.g., "Abril 2026") — only on period-aware pages
- Primary action button right-aligned (varies by page)
- Period selector appears in the header of period-aware pages (Dashboard, Movimientos, Presupuesto, Historial)

### Period selector
- Arrow buttons: < Abril 2026 > — tap left/right to navigate months
- No dropdown in MVP — arrow navigation only
- Closed period indicator: lock icon (Lucide Lock) next to month name + subtle info banner below header: "Periodo cerrado — solo lectura"
- Period selector only shows on period-aware pages, not on Deudas or Ingresos

### DynamicIcon component
- Renders Lucide icons by string name from DB (e.g., "utensils" → Utensils component)
- Static icon map for tree-shaking — NOT dynamic import of entire library
- Map includes all 8 default category icons + common extras for custom categories

### Claude's Discretion
- Exact transition animations for sidebar collapse, sheet slide-up, modal fade
- Toast notification container placement (top-right desktop, top-center mobile — from UX_RULES.md)
- Loading.tsx placeholder content for each route
- Exact "Más" sheet design (just a list of nav items)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/layout.tsx`: Root layout with DM Sans font and dark theme classes — modify to add sidebar/nav structure
- `src/app/globals.css`: Full Tailwind v4 @theme dark palette with 30+ design tokens — all colors ready
- `src/lib/utils.ts`: `cn()` utility ready for conditional class names
- `src/lib/constants.ts`: DEFAULT_CATEGORIES with Lucide icon names and colors
- `lucide-react`: Already installed
- `clsx` + `tailwind-merge`: Already installed

### Established Patterns
- Tailwind v4 CSS-first with `@theme` variables
- `next/font/google` DM Sans with CSS variable `--font-dm-sans`
- Server Components by default, Client Components only for interactivity
- `cn()` for conditional class merging

### Integration Points
- `src/app/layout.tsx`: Add sidebar + mobile nav + FAB wrapper
- `src/components/layout/Sidebar.tsx`: New — desktop sidebar (Client Component for active state)
- `src/components/layout/MobileNav.tsx`: New — bottom tab bar + "Más" sheet (Client Component)
- `src/components/layout/PageHeader.tsx`: New — reusable header with optional period selector
- `src/components/layout/FAB.tsx`: New — floating action button (Client Component)
- `src/components/ui/DynamicIcon.tsx`: New — Lucide icon resolver by name
- `src/components/ui/Modal.tsx`: New — shared modal primitive (for FAB transaction form later)
- Placeholder pages for each route: `src/app/movimientos/page.tsx`, etc.

</code_context>

<specifics>
## Specific Ideas

- The FAB being separate from the bottom tab bar is a deliberate UX choice — it avoids confusion about whether [+] adds to the current view or always opens transaction creation
- The tablet collapsed sidebar (icons-only with tooltips) provides a middle ground between full sidebar and hidden nav
- "Más" is a standard mobile pattern (iOS "More" tab) — users expect it to open a list of additional options
- Spanish nav labels in a constants file aligns with the Zod i18n approach from Phase 3

</specifics>

<deferred>
## Deferred Ideas

- Runtime language toggle (ES/EN) — future feature, not MVP
- Toast notification system — Phase 11 (Polish), not Phase 4

</deferred>

---

*Phase: 04-layout-shell*
*Context gathered: 2026-04-05*
