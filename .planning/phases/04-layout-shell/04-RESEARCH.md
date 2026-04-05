# Phase 4: Layout Shell - Research

**Researched:** 2026-04-05
**Domain:** Next.js 16 App Router layout architecture, responsive navigation, Lucide icon rendering, Tailwind v4 CSS-first responsive design
**Confidence:** HIGH

## Summary

Phase 4 builds the responsive application shell: desktop sidebar, tablet collapsed sidebar, mobile bottom tab bar, floating action button (FAB), page header with period selector, and a DynamicIcon component. All layout components are Client Components because they depend on `usePathname` for active state detection. The root layout (Server Component) composes them.

Next.js 16.2.2 with React 19.2.4 is installed. The app uses Tailwind v4 CSS-first configuration (`@theme` in `globals.css`, not `tailwind.config.ts`). Lucide-react 1.7.0 is ESM-only; all needed icons exist and are available via named imports. The `icons` barrel export must NOT be used -- it defeats tree-shaking and imports all 1,694 icons.

**Primary recommendation:** Build 7 components (Sidebar, MobileNav, MobileMoreSheet, FAB, PageHeader, PeriodSelector, DynamicIcon) plus a nav constants file and a Modal/Sheet UI primitive. Use `usePathname()` for active state. Use Tailwind responsive breakpoints `md:` (768px) and `lg:` (1024px) to match the three-tier layout (mobile/tablet/desktop). Placeholder pages for all routes are needed so navigation works.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Desktop sidebar: "Centik" name in cyan, 240px fixed, icons-only on tablet (64px)
- Nav items with Lucide icons + labels; active state: accent color background at 15% + accent text
- Tablet behavior (768-1023px): sidebar collapses to ~64px icons only, hover tooltip shows label, no hamburger
- Mobile bottom tab bar (<768px): 5 equal items: Inicio, Movimientos, Deudas, Presupuesto, Mas
- NO center [+] button in the tab bar -- FAB is separate
- "Mas" (MoreHorizontal icon) opens a slide-up sheet with: Ingresos, Historial, Configuracion
- FAB: bottom-right corner, circular 48px, cyan accent background, white "+" icon, always visible
- FAB tap opens: bottom sheet on mobile (max 90vh), centered modal on desktop (max-width 480px)
- FAB is for transaction creation ONLY
- Navigation labels in Spanish stored in constants file (i18n-ready, no runtime toggle)
- Sidebar labels: Inicio, Movimientos, Deudas, Presupuesto, Ingresos, Historial
- Mobile tab labels: Inicio, Movimientos, Deudas, Presupuesto, Mas
- Page header: text-2xl bold title, subtitle with period in text-muted, primary action right-aligned
- Period selector: < Abril 2026 > arrow navigation, no dropdown
- Closed period: lock icon + "Periodo cerrado -- solo lectura" banner
- Period selector only on period-aware pages (Dashboard, Movimientos, Presupuesto, Historial)
- DynamicIcon: static icon map for tree-shaking, NOT dynamic import of entire library
- Map includes all 8 default category icons + common extras

### Claude's Discretion
- Exact transition animations for sidebar collapse, sheet slide-up, modal fade
- Toast notification container placement (deferred to Phase 11)
- Loading.tsx placeholder content for each route
- Exact "Mas" sheet design (just a list of nav items)

### Deferred Ideas (OUT OF SCOPE)
- Runtime language toggle (ES/EN) -- future feature, not MVP
- Toast notification system -- Phase 11 (Polish), not Phase 4
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LAYOUT-01 | Root layout with dark theme (bg #0a0f1a), DM Sans font, and Tailwind v4 custom color palette | Already exists in `src/app/layout.tsx` + `globals.css`. Need to modify layout to add sidebar/nav/FAB wrapper structure. |
| LAYOUT-02 | Desktop sidebar navigation (fixed, 240px) with Lucide icons and active state highlighting | Client Component using `usePathname()` from `next/navigation`. Fixed positioning with `w-60` on `lg:`, collapsed `w-16` on `md:`. Active state via accent bg at 15% opacity. |
| LAYOUT-03 | Mobile bottom tab bar (5 items: Dashboard, Movimientos, Deudas, Presupuesto, Mas) | Client Component with fixed bottom positioning, hidden on `md:` and above. 5 equal flex items. "Mas" opens slide-up sheet. Note: CONTEXT.md corrects REQUIREMENTS.md -- no [+] in tab bar, and 5th item is "Mas" not "Presupuesto". |
| LAYOUT-04 | Floating "+" FAB button for quick transaction entry (always visible) | Separate Client Component, `fixed bottom-right`, z-index above tab bar. Opens placeholder modal/sheet (actual form built in Phase 6/7). |
| LAYOUT-05 | Page header pattern with title, period indicator, and primary action button | Server Component wrapper (`PageHeader`) accepting title, optional period selector, optional action slot. |
| LAYOUT-06 | Period selector showing current month/year with navigation to previous periods | Client Component with arrow buttons. Needs Prisma query for available periods OR URL-based period navigation. Closed period indicator with Lock icon + banner. |
| LAYOUT-07 | DynamicIcon component that renders Lucide icons by name from DB string | Static import map of ~25-30 icons. DB stores lowercase names (e.g., "utensils"), component maps to PascalCase imports (e.g., `Utensils`). |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.2 | App Router, layouts, navigation | Already installed; defines layout architecture |
| react | 19.2.4 | Components, hooks | Already installed |
| lucide-react | 1.7.0 | Icon library | Already installed; ESM named exports for tree-shaking |
| tailwindcss | 4.x | Styling, responsive breakpoints | Already installed; CSS-first @theme config |
| clsx + tailwind-merge | installed | Conditional class merging via `cn()` | Already in `src/lib/utils.ts` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next/navigation | (bundled) | `usePathname`, `Link` | Active nav state, client-side navigation |
| next/font/google | (bundled) | DM Sans variable font | Already configured in root layout |

### No Additional Dependencies Needed
This phase requires zero new npm installs. All needed libraries are already present.

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/
    layout.tsx              # MODIFY: Add Sidebar + MobileNav + FAB wrapper
    page.tsx                # MODIFY: Dashboard placeholder
    loading.tsx             # NEW: Root loading skeleton
    movimientos/
      page.tsx              # NEW: Placeholder page
      loading.tsx           # NEW: Loading skeleton
    deudas/
      page.tsx              # NEW: Placeholder page
      loading.tsx           # NEW: Loading skeleton
    presupuesto/
      page.tsx              # NEW: Placeholder page
      loading.tsx           # NEW: Loading skeleton
    ingresos/
      page.tsx              # NEW: Placeholder page
      loading.tsx           # NEW: Loading skeleton
    historial/
      page.tsx              # NEW: Placeholder page
      loading.tsx           # NEW: Loading skeleton
  components/
    layout/
      Sidebar.tsx           # NEW: Desktop/tablet sidebar (Client Component)
      MobileNav.tsx         # NEW: Bottom tab bar (Client Component)
      MobileMoreSheet.tsx   # NEW: "Mas" slide-up sheet (Client Component)
      FAB.tsx               # NEW: Floating action button (Client Component)
      PageHeader.tsx        # NEW: Reusable page header
      PeriodSelector.tsx    # NEW: Month navigator (Client Component)
    ui/
      DynamicIcon.tsx       # NEW: Lucide icon resolver by DB name
      Modal.tsx             # NEW: Shared modal/sheet primitive (Client Component)
  lib/
    constants.ts            # MODIFY: Add NAV_ITEMS, PERIOD_AWARE_ROUTES
```

### Pattern 1: Server Layout Composing Client Components
**What:** Root layout stays a Server Component. It imports Client Components (Sidebar, MobileNav, FAB) and renders them alongside `{children}`.
**When to use:** Always -- layouts should not be Client Components.
**Example:**
```typescript
// Source: Next.js 16 docs (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md)
// app/layout.tsx -- Server Component (no "use client")
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { FAB } from '@/components/layout/FAB'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-bg-primary text-text-primary font-sans">
        <div className="flex h-full">
          {/* Desktop/tablet sidebar -- hidden on mobile */}
          <Sidebar />
          {/* Main content area */}
          <main className="flex-1 lg:ml-60 md:ml-16 pb-16 md:pb-0">
            {children}
          </main>
        </div>
        {/* Mobile bottom nav -- hidden on md+ */}
        <MobileNav />
        {/* FAB -- always visible */}
        <FAB />
      </body>
    </html>
  )
}
```

### Pattern 2: Active Navigation with usePathname
**What:** Client Components use `usePathname()` from `next/navigation` to determine active route and apply styling.
**When to use:** All nav components (Sidebar, MobileNav).
**Why not useSelectedLayoutSegment:** `usePathname` is simpler for our flat route structure. `useSelectedLayoutSegment` returns the segment one level below the layout -- for our root layout, it returns the first path segment (e.g., `"movimientos"`, `"deudas"`, `null` for home). Both work, but `usePathname` is more explicit and future-proof for nested routes.
**Example:**
```typescript
// Source: Next.js 16 docs (use-pathname.md)
'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// For root-level routes, checking startsWith handles future nested routes
const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
```

### Pattern 3: Responsive Three-Tier Layout with Tailwind Breakpoints
**What:** Use Tailwind v4 responsive prefixes to show/hide components at breakpoints.
**When to use:** Layout shell -- sidebar vs tab bar.
**Key breakpoints:**
```
< md (768px):   Mobile    -- Show MobileNav (bottom tabs), hide Sidebar
md to lg:       Tablet    -- Show Sidebar collapsed (64px icons-only), hide MobileNav
>= lg (1024px): Desktop   -- Show Sidebar expanded (240px), hide MobileNav
```
**Example:**
```typescript
// Sidebar container
<aside className="hidden md:flex md:w-16 lg:w-60 fixed inset-y-0 left-0 ...">

// MobileNav container
<nav className="md:hidden fixed bottom-0 inset-x-0 h-16 ...">

// Main content offset
<main className="md:ml-16 lg:ml-60 pb-16 md:pb-0 ...">
```

### Pattern 4: DynamicIcon with Static Import Map
**What:** Map lowercase DB icon names to statically imported Lucide components.
**When to use:** Anywhere category icons need rendering from DB data.
**Critical finding:** Lucide-react 1.7.0 is ESM. The `icons` barrel export (1,694 icons) must NOT be imported -- it defeats tree-shaking. Use individual named imports only.
**Example:**
```typescript
// Source: Verified against lucide-react 1.7.0 ESM exports
import {
  Utensils, Zap, Clapperboard, Smartphone, Car, Package,
  Briefcase, Laptop, Home, CreditCard, PiggyBank, Receipt,
  ShoppingCart, Heart, GraduationCap, Plane, Gift, Coffee,
  Dumbbell, Pill, type LucideProps
} from 'lucide-react'
import { type ComponentType } from 'react'

const ICON_MAP: Record<string, ComponentType<LucideProps>> = {
  // Default category icons (from seed data)
  utensils: Utensils,
  zap: Zap,
  clapperboard: Clapperboard,
  smartphone: Smartphone,
  car: Car,
  package: Package,
  briefcase: Briefcase,
  laptop: Laptop,
  // Common extras for custom categories
  home: Home,
  'credit-card': CreditCard,
  'piggy-bank': PiggyBank,
  receipt: Receipt,
  'shopping-cart': ShoppingCart,
  heart: Heart,
  'graduation-cap': GraduationCap,
  plane: Plane,
  gift: Gift,
  coffee: Coffee,
  dumbbell: Dumbbell,
  pill: Pill,
}

interface DynamicIconProps extends LucideProps {
  name: string
}

export default function DynamicIcon({ name, ...props }: DynamicIconProps) {
  const IconComponent = ICON_MAP[name]
  if (!IconComponent) return <Package {...props} />  // Fallback to Package
  return <IconComponent {...props} />
}
```

### Pattern 5: Modal/Sheet Primitive with Responsive Behavior
**What:** A shared UI primitive that renders as a bottom sheet on mobile and a centered modal on desktop.
**When to use:** FAB opens this for transaction creation; reused later for other forms.
**Example:**
```typescript
'use client'
// On mobile (<md): bottom sheet (fixed bottom-0, slides up, max-h-[90vh])
// On desktop (md+): centered modal (fixed inset-0, flex items-center justify-center)
// Both: backdrop overlay with blur, escape to close, focus trap
```

### Pattern 6: Nav Item Constants (i18n-ready)
**What:** Define all navigation items in a typed constants structure with labels, icons, and routes.
**When to use:** Shared between Sidebar and MobileNav for consistency.
**Example:**
```typescript
// src/lib/constants.ts -- add to existing file
import type { ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: string  // Lucide icon name for DynamicIcon
  /** Pages where period selector should appear */
  periodAware?: boolean
}

export const SIDEBAR_NAV_ITEMS: NavItem[] = [
  { label: 'Inicio', href: '/', icon: 'layout-dashboard', periodAware: true },
  { label: 'Movimientos', href: '/movimientos', icon: 'arrow-left-right', periodAware: true },
  { label: 'Deudas', href: '/deudas', icon: 'credit-card' },
  { label: 'Presupuesto', href: '/presupuesto', icon: 'piggy-bank', periodAware: true },
  { label: 'Ingresos', href: '/ingresos', icon: 'banknote' },
  { label: 'Historial', href: '/historial', icon: 'history', periodAware: true },
]

export const MOBILE_TAB_ITEMS: NavItem[] = [
  { label: 'Inicio', href: '/', icon: 'layout-dashboard' },
  { label: 'Movimientos', href: '/movimientos', icon: 'arrow-left-right' },
  { label: 'Deudas', href: '/deudas', icon: 'credit-card' },
  { label: 'Presupuesto', href: '/presupuesto', icon: 'piggy-bank' },
  // 5th item "Mas" is handled specially in MobileNav, not in this array
]

export const MORE_MENU_ITEMS: NavItem[] = [
  { label: 'Ingresos', href: '/ingresos', icon: 'banknote' },
  { label: 'Historial', href: '/historial', icon: 'history' },
  { label: 'Configuracion', href: '/configuracion', icon: 'settings' },
]

/** Routes where the period selector should appear */
export const PERIOD_AWARE_ROUTES = ['/', '/movimientos', '/presupuesto', '/historial']

/** Spanish month names for period display */
export const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const
```

### Anti-Patterns to Avoid
- **Importing `icons` from lucide-react:** This barrel export includes all 1,694 icons and destroys tree-shaking. Always use individual named imports.
- **Making root layout a Client Component:** Layouts should stay Server Components. Extract interactive parts (nav, FAB) into separate Client Components.
- **Using usePathname in the layout directly:** Layouts don't re-render on navigation. `usePathname` must be in a Client Component that the layout imports.
- **Fetching period data in the layout:** Layouts are cached and don't re-render. Period data should be fetched in pages or in a Client Component using the `use` hook or `useEffect`.
- **Using `window.matchMedia` for responsive behavior:** Use Tailwind responsive classes (`md:`, `lg:`) which work with SSR. JS media queries cause hydration mismatches.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Icon rendering by DB name | Runtime dynamic import of lucide-react | Static import map in DynamicIcon | Dynamic import loads entire icon library (~600KB); static map includes only needed icons |
| Responsive show/hide | JS-based viewport detection | Tailwind responsive prefixes (`md:hidden`, `lg:flex`) | CSS media queries work with SSR, no hydration mismatch |
| Active route detection | Manual URL parsing | `usePathname()` from `next/navigation` | Built-in Next.js hook, reactive to navigation |
| Client-side navigation | `window.location` or `<a>` tags | `next/link` `Link` component | Prefetching, soft navigation, SPA experience |
| Class name merging | String concatenation | `cn()` from `src/lib/utils.ts` | Handles Tailwind class conflicts via tailwind-merge |
| Focus trapping in modals | Manual DOM manipulation | CSS-based approach or future portal with `inert` attribute | Focus trap libraries add complexity; use `dialog` element or `inert` for simplicity |

**Key insight:** The layout shell is purely client-side UI with no data fetching (except potentially the period selector, which should be minimally coupled). Keep it simple: Tailwind for responsive, Next.js hooks for routing state, static imports for icons.

## Common Pitfalls

### Pitfall 1: Layout Re-render Assumption
**What goes wrong:** Developers put `usePathname` directly in the layout, expecting it to update on navigation. Layouts are cached and do NOT re-render.
**Why it happens:** Mental model from Pages Router where `_app.tsx` re-rendered on every navigation.
**How to avoid:** All pathname-dependent logic must be in Client Components imported by the layout. The Next.js 16 docs explicitly state: "Layouts do not re-render on navigation."
**Warning signs:** Active nav state not updating when clicking links.

### Pitfall 2: Lucide-React icons Barrel Import
**What goes wrong:** Importing `{ icons }` from `lucide-react` pulls in all 1,694 icon definitions, adding ~200-600KB to the client bundle.
**Why it happens:** The `icons` object exists for dynamic lookup but is not tree-shakeable.
**How to avoid:** Use individual named imports: `import { Utensils, Zap } from 'lucide-react'`. Build a static map of only needed icons.
**Warning signs:** Large JavaScript bundle, slow initial page load.

### Pitfall 3: Hydration Mismatch with Responsive Components
**What goes wrong:** Using JavaScript (e.g., `window.innerWidth`, `matchMedia`) to conditionally render mobile vs desktop UI causes hydration errors because the server doesn't know the viewport.
**Why it happens:** Server renders one version, client detects viewport and tries to render different markup.
**How to avoid:** Use CSS-based responsive design (Tailwind breakpoint prefixes). Both mobile and desktop markup is rendered by the server; CSS shows/hides the appropriate version.
**Warning signs:** React hydration warnings in console, flash of wrong layout.

### Pitfall 4: Fixed Positioning Z-Index Stacking
**What goes wrong:** FAB appears behind the mobile tab bar, or the "Mas" sheet appears behind the FAB.
**Why it happens:** Multiple fixed-position elements compete for stacking context.
**How to avoid:** Define a clear z-index scale:
```
Sidebar:          z-30
MobileNav:        z-40
FAB:              z-40 (same level as MobileNav, positioned above it via bottom offset)
Sheet/Modal:      z-50
Sheet backdrop:   z-50
```
**Warning signs:** Elements overlapping incorrectly, clickable elements hidden behind others.

### Pitfall 5: Mobile Tab Bar Obscuring Page Content
**What goes wrong:** The last items in a scrollable list are hidden behind the fixed mobile tab bar (64px).
**Why it happens:** Fixed positioning takes the tab bar out of document flow.
**How to avoid:** Add `pb-16 md:pb-0` to the main content area so mobile gets 64px bottom padding.
**Warning signs:** Users can't see or tap the last few items in lists on mobile.

### Pitfall 6: Sidebar Width Transition Jank
**What goes wrong:** Animating sidebar width between 64px (tablet) and 240px (desktop) on viewport resize causes layout shifts.
**Why it happens:** Width transitions cause reflow of main content.
**How to avoid:** Don't animate on viewport resize. The sidebar width changes via CSS media queries which apply instantly. Only animate if adding a manual toggle button (not in scope for MVP).
**Warning signs:** Jerky content reflow when resizing browser.

### Pitfall 7: Period Selector Data Coupling
**What goes wrong:** Trying to fetch period data in the layout to pass to the PeriodSelector, making the layout depend on database state.
**Why it happens:** PeriodSelector needs to know current month/year and whether the period is closed.
**How to avoid:** Two options: (1) PeriodSelector derives current period from `new Date()` client-side and uses URL params for navigation, with the page itself fetching period data and passing `isClosed` as a prop. (2) PeriodSelector is a Client Component that fetches via a lightweight API route. Option 1 is simpler for MVP.
**Warning signs:** Layout becoming async, needing Suspense boundaries for the entire shell.

## Code Examples

Verified patterns from official sources:

### Active Nav Link Component
```typescript
// Source: Next.js 16 docs - layout.md "Active Nav Links" example
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import DynamicIcon from '@/components/ui/DynamicIcon'
import type { NavItem } from '@/lib/constants'

interface NavLinkProps {
  item: NavItem
  collapsed?: boolean
}

export function NavLink({ item, collapsed = false }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = item.href === '/'
    ? pathname === '/'
    : pathname.startsWith(item.href)

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
        isActive
          ? 'bg-accent/15 text-accent'
          : 'text-text-secondary hover:text-text-primary hover:bg-bg-card-hover',
        collapsed && 'justify-center px-0'
      )}
      title={collapsed ? item.label : undefined}
    >
      <DynamicIcon name={item.icon} size={18} />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  )
}
```

### Loading.tsx Skeleton Pattern
```typescript
// Source: Next.js 16 docs - loading.md
// app/movimientos/loading.tsx
export default function MovimientosLoading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-bg-card rounded-lg" />
        <div className="h-10 w-32 bg-bg-card rounded-md" />
      </div>
      {/* List skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-16 bg-bg-card rounded-xl" />
        ))}
      </div>
    </div>
  )
}
```

### Tooltip for Collapsed Sidebar
```typescript
// Pure CSS tooltip approach -- no library needed
// Uses Tailwind group + peer or title attribute
<Link
  href={item.href}
  title={item.label}  // Native browser tooltip
  className="relative group ..."
>
  <DynamicIcon name={item.icon} size={18} />
  {/* Custom tooltip (optional, better than native) */}
  <span className="absolute left-full ml-2 px-2 py-1 text-xs font-medium
    bg-bg-elevated text-text-primary rounded-md shadow-sm
    opacity-0 group-hover:opacity-100 transition-opacity
    pointer-events-none whitespace-nowrap z-50">
    {item.label}
  </span>
</Link>
```

### Bottom Sheet Slide-Up Animation
```typescript
// CSS-only animation using Tailwind classes
// Sheet container
<div className={cn(
  'fixed inset-x-0 bottom-0 z-50 bg-bg-card rounded-t-xl border-t border-border',
  'transform transition-transform duration-300 ease-out',
  isOpen ? 'translate-y-0' : 'translate-y-full'
)}>
  {/* Drag handle indicator */}
  <div className="flex justify-center py-3">
    <div className="w-10 h-1 bg-border-light rounded-full" />
  </div>
  {/* Sheet content */}
  {children}
</div>

// Backdrop
{isOpen && (
  <div
    className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
    onClick={onClose}
  />
)}
```

### Modal Fade + Scale Animation
```typescript
// Desktop modal pattern
<div className={cn(
  'fixed inset-0 z-50 flex items-center justify-center p-4',
  isOpen ? 'visible' : 'invisible'
)}>
  {/* Backdrop */}
  <div
    className={cn(
      'absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-200',
      isOpen ? 'opacity-100' : 'opacity-0'
    )}
    onClick={onClose}
  />
  {/* Modal container */}
  <div className={cn(
    'relative w-full max-w-[480px] max-h-[85vh] overflow-y-auto',
    'bg-bg-card border border-border rounded-xl p-7 shadow-md',
    'transition-all duration-200',
    isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
  )}>
    {children}
  </div>
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.ts` theme | `@theme` in CSS (Tailwind v4) | 2024 | Colors, radii, shadows defined in `globals.css` not in JS config |
| `useRouter().pathname` (Pages Router) | `usePathname()` (App Router) | Next.js 13+ | Client hook, must be in Client Component |
| Layout re-renders on navigation | Layouts are cached, don't re-render | Next.js 13+ | Interactive state must be in Client Components |
| `params` as sync prop | `params` as `Promise` (must `await`) | Next.js 15+ | Not relevant for this phase (no dynamic routes) |
| `require('lucide-react')` CJS | ESM-only named imports | lucide-react 0.300+ | Must use `import { Icon } from 'lucide-react'` |

**Deprecated/outdated:**
- `useRouter` from `next/router` (Pages Router) -- use `next/navigation` hooks instead
- `getLayout` pattern from Pages Router -- App Router uses nested `layout.tsx` files
- Tailwind v3 `tailwind.config.js` color definitions -- Tailwind v4 uses CSS-first `@theme`

## Open Questions

1. **Period Selector: URL-based vs State-based Navigation**
   - What we know: Period selector shows `< Abril 2026 >` with arrow navigation. Pages need to know which period is selected.
   - What's unclear: Should the selected period be a URL query param (e.g., `?month=4&year=2026`) or React state propagated via context?
   - Recommendation: Use URL search params (`?month=4&year=2026`). This is more Next.js-idiomatic -- pages can read searchParams in Server Components, URLs are bookmarkable, and it avoids a client-side context provider. The PeriodSelector component uses `useSearchParams` + `useRouter` to update the URL. If no params are present, default to current month/year.

2. **Closed Period Banner: Data Source**
   - What we know: When viewing a closed period, a banner should say "Periodo cerrado -- solo lectura" and the FAB should be disabled.
   - What's unclear: Where does the `isClosed` state come from at the layout level?
   - Recommendation: Each page fetches the period based on URL params and passes `isClosed` to the PageHeader. The FAB checks URL params and queries the period status independently OR receives it via a lightweight period context. For MVP, simplest is to have each period-aware page fetch its period and pass the closed state to PageHeader/PeriodSelector as props.

3. **Configuracion Route**
   - What we know: The "Mas" menu includes a "Configuracion" item, but there is no Configuracion phase in the roadmap.
   - What's unclear: Should a placeholder route be created?
   - Recommendation: Yes, create a minimal placeholder page at `/configuracion` with an empty state message ("Proximamente"). This prevents a 404 when users tap it in the "Mas" menu.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x + @vitejs/plugin-react |
| Config file | `vitest.config.mts` |
| Quick run command | `npm run test:run` |
| Full suite command | `npm run quality` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LAYOUT-01 | Root layout renders with dark theme classes | unit | `npx vitest run src/app/layout.test.tsx -t "root layout"` | No -- Wave 0 |
| LAYOUT-02 | Sidebar renders nav items, highlights active route | unit | `npx vitest run src/components/layout/Sidebar.test.tsx` | No -- Wave 0 |
| LAYOUT-03 | MobileNav renders 5 tab items, Mas opens sheet | unit | `npx vitest run src/components/layout/MobileNav.test.tsx` | No -- Wave 0 |
| LAYOUT-04 | FAB renders, click opens modal/sheet | unit | `npx vitest run src/components/layout/FAB.test.tsx` | No -- Wave 0 |
| LAYOUT-05 | PageHeader renders title, optional period, optional action | unit | `npx vitest run src/components/layout/PageHeader.test.tsx` | No -- Wave 0 |
| LAYOUT-06 | PeriodSelector displays month/year, arrows navigate | unit | `npx vitest run src/components/layout/PeriodSelector.test.tsx` | No -- Wave 0 |
| LAYOUT-07 | DynamicIcon resolves all 8 default icons + fallback | unit | `npx vitest run src/components/ui/DynamicIcon.test.tsx` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test:run`
- **Per wave merge:** `npm run quality`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

Note: CLAUDE.md states "No tests needed (pure UI)" for the Layout phase. However, the DynamicIcon component and nav constants have testable logic. The CONTEXT.md does not override this. Testing strategy should focus on:

- [x] `vitest.config.mts` -- already exists with jsdom environment and react plugin
- [ ] `src/components/ui/DynamicIcon.test.tsx` -- covers LAYOUT-07: icon resolution, fallback behavior
- [ ] `src/lib/constants.test.ts` -- covers nav item structure validation (all hrefs valid, all icons exist in map)
- [ ] Component render tests are optional per CLAUDE.md ("No tests needed for pure UI") but DynamicIcon logic deserves unit tests

Per CLAUDE.md: "UI component rendering -- Unit test with Vitest + Testing Library (only for complex interactive components, not for simple display components)." The sidebar, mobile nav, and FAB are interactive components but their interactivity is primarily routing (handled by Next.js Link) rather than complex state. DynamicIcon has pure logic that should be tested. The recommendation is to test DynamicIcon and nav constants, and optionally test that Sidebar/MobileNav render without errors.

## Sources

### Primary (HIGH confidence)
- Next.js 16.2.2 bundled docs (`node_modules/next/dist/docs/`) -- layout.md, loading.md, use-pathname.md, use-selected-layout-segment.md, link.md
- lucide-react 1.7.0 ESM module inspection -- verified all icon exports, `icons` barrel export, naming conventions
- Existing codebase -- `src/app/layout.tsx`, `globals.css`, `constants.ts`, `utils.ts`, `package.json`

### Secondary (MEDIUM confidence)
- Tailwind v4 CSS-first `@theme` pattern -- verified from existing `globals.css` which is already working
- Responsive breakpoints (md: 768px, lg: 1024px) -- Tailwind v4 defaults, match UX_RULES.md specifications

### Tertiary (LOW confidence)
- None -- all findings verified from installed code or official bundled docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed and verified
- Architecture: HIGH - patterns derived from Next.js 16 bundled docs and verified against installed versions
- Pitfalls: HIGH - derived from official docs caveats sections and known SSR/hydration patterns
- DynamicIcon: HIGH - icon exports verified programmatically against lucide-react 1.7.0

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable -- no version changes expected during development)
