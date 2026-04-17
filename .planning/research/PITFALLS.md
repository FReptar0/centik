# Pitfalls Research

**Domain:** Personal finance tracking web app (Mexican quincenal cycle)
**Researched:** 2026-04-06 (v2.0 Glyph Finance update appended to original 2026-04-04 research); 2026-04-15 (v3.0 Auth + Cloud Deploy update appended)
**Confidence:** HIGH (verified against official docs, npm registry, GitHub issues)

---

## Critical Pitfalls

Mistakes that cause rewrites, data corruption, or fundamental architecture failures.

### Pitfall 1: Next.js Version Mismatch -- CLAUDE.md Says 14+, Package.json Has 16.2.2

**What goes wrong:** The project documentation (CLAUDE.md, DFR.md) references "Next.js 14+" patterns, but `package.json` ships Next.js 16.2.2 with React 19.2.4 and Tailwind CSS v4. Next.js 16 has breaking changes in caching, middleware (now proxy.ts), async dynamic APIs (`params`, `searchParams`, `cookies`, `headers` must all be `await`ed), and a fundamentally different rendering model.

**Why it happens:** CLAUDE.md was written targeting Next.js 14+ but `create-next-app` installed the latest (v16). The AGENTS.md file warns about this ("This is NOT the Next.js you know") but the rest of the documentation has not been reconciled.

**Consequences:**
- `params` and `searchParams` accessed synchronously will throw at runtime (they are now `Promise` types that must be `await`ed)
- `cookies()` and `headers()` must be `await`ed (were synchronous in Next.js 14)
- `middleware.ts` is now `proxy.ts` running on Node.js runtime (not Edge). `middleware.ts` is deprecated.
- `next lint` command is removed. Must use `eslint` directly.
- `revalidatePath()` behavior differs: in Server Actions it immediately refreshes the UI, in Route Handlers it only marks for next visit
- Caching model is completely different: `use cache` directive + `cacheLife` + `cacheTag` replace `unstable_cache`
- Without `cacheComponents: true`, fetch requests are NOT cached by default (opposite of Next.js 14 behavior)

**Prevention:**
1. Before Phase 1 scaffolding, audit every API pattern in CLAUDE.md/DATA_FLOW.md against the bundled docs at `node_modules/next/dist/docs/`
2. Do NOT create `middleware.ts` -- use `proxy.ts` if request interception is needed, or handle period auto-creation in root layout
3. Do NOT enable `cacheComponents: true` in MVP -- all data is personal and should be fresh
4. All page/layout components that receive `params` or `searchParams` must destructure them with `await`
5. All `cookies()` and `headers()` calls must be `await`ed
6. Replace `"lint": "next lint"` with `"lint": "eslint ."` in package.json scripts

**Detection:** Build errors mentioning "Promise" types; runtime "cannot read properties of undefined" on params; stale data after mutations

**Phase to address:** Phase 1 (scaffolding) -- every subsequent phase inherits this

---

### Pitfall 2: Tailwind CSS v4 Configuration -- No tailwind.config.ts

**What goes wrong:** CLAUDE.md specifies custom colors in `tailwind.config.ts` under `extend.colors`. Tailwind CSS v4 eliminates `tailwind.config.js/ts` entirely. Configuration is CSS-first using `@theme` directives. Building a `tailwind.config.ts` will be silently ignored.

**Why it happens:** Documentation was written for Tailwind v3 conventions. Scaffolded project installs v4.

**Consequences:**
- Custom color palette will not apply if defined in JS config file
- Utility class renames: `bg-gradient-to-*` is now `bg-linear-to-*`, `flex-shrink-0` is now `shrink-0`
- `@tailwind base/components/utilities` directives replaced by `@import 'tailwindcss'`
- Content path configuration is no longer needed (automatic detection)

**Prevention:**
1. Define design system in `app/globals.css` using `@theme` directive
2. Do NOT create `tailwind.config.ts`
3. Use `tailwind-merge` v3.5+ (not v2.x which is for Tailwind v3)
4. Audit all utility class names against Tailwind v4 docs before Phase 3

**Detection:** Styles not applying; default Tailwind colors instead of custom dark theme

**Phase to address:** Phase 1 (scaffolding), Phase 3 (layout), every UI phase

---

### Pitfall 3: Prisma 7 Configuration -- prisma.config.ts Replaces Previous Patterns

**What goes wrong:** CLAUDE.md describes Prisma seed configuration in `package.json` and database URL in `schema.prisma`. Prisma 7 moves both to a new `prisma.config.ts` file. The old patterns silently fail or cause errors.

**Why it happens:** CLAUDE.md was written for Prisma v5/v6. The ecosystem has moved to Prisma 7.

**Consequences:**
- `prisma db seed` fails if seed command is only in `package.json` (Prisma 7 reads from `prisma.config.ts`)
- `prisma migrate dev` fails if database URL is only in `schema.prisma` datasource block (Prisma 7 reads from `prisma.config.ts`)
- `prisma migrate dev` no longer auto-runs `prisma generate` -- must run explicitly
- `prisma migrate dev/reset` no longer auto-runs seed -- must run `prisma db seed` explicitly
- Environment variables are NOT loaded by default in Prisma 7 -- must import `dotenv/config` in `prisma.config.ts`

**Prevention:**
1. Create `prisma.config.ts` at project root with `defineConfig()` from `prisma/config`
2. Move datasource URL to `prisma.config.ts`: `datasource: { url: process.env.DATABASE_URL }`
3. Configure seed command in `prisma.config.ts`: `seed: 'tsx prisma/seed.ts'`
4. Import `'dotenv/config'` at top of `prisma.config.ts`
5. Install `tsx` and `dotenv` as dev dependencies
6. Update scripts to chain `prisma generate` after `prisma migrate dev`

**Detection:** "seed command not found" errors; "datasource url not configured" errors; missing generated client after migration

**Phase to address:** Phase 1 (scaffolding), Phase 2 (schema + seed)

---

### Pitfall 4: BigInt Serialization Boundary Leaks

**What goes wrong:** Prisma returns `BigInt` for all monetary fields. `JSON.stringify()` throws on BigInt. Every path from Prisma to the client must pass through `serializeBigInts()`. Missing even one path causes a runtime crash that is invisible during development if the field happens to be `0n` (which serializes as `0` number).

**Why it happens:** BigInt serialization failures are silent at zero values. Seed data creates budgets with `0n` amounts. Developers test with seed data, everything works, then crashes when real non-zero data flows through.

**Consequences:**
- Runtime crash: "Do not know how to serialize a BigInt"
- Crashes in production with real data, not during dev with zero-value seeds
- Server Components passing BigInt props to Client Components crash during RSC serialization

**Prevention:**
1. Create `serializeBigInts()` in Phase 2 and enforce its use via code review
2. Seed data MUST include non-zero monetary values (e.g., `150075n` for $1,500.75)
3. Write unit tests that verify serialization with actual BigInt values, not just zero
4. Consider a Prisma Client extension that auto-serializes BigInt fields

**Detection:** Test with non-zero seed data from day one

**Phase to address:** Phase 2 (serializer), Phase 4+ (every feature with monetary data)

---

### Pitfall 5: Period Close Transaction -- Partial Failure Corrupts Financial History

**What goes wrong:** Period close must atomically: (1) calculate totals, (2) create MonthlySummary, (3) close period, (4) create next period, (5) copy budgets. Partial failure without proper Prisma `$transaction` wrapping leaves the database inconsistent.

**Why it happens:** Prisma `$transaction` has a default 5-second timeout. Complex period close with aggregation queries can exceed this.

**Consequences:**
- MonthlySummary created but period still open (or vice versa)
- Next period created without budget copies
- History table shows incorrect data permanently

**Prevention:**
1. Use `$transaction` with explicit timeout: `{ timeout: 15000, maxWait: 10000 }`
2. Add unique constraint on `MonthlySummary.periodId` to prevent duplicates
3. Implement idempotency: check if summary exists before creating
4. Validate preconditions BEFORE starting the transaction
5. Write integration test exercising the full close flow + retry

**Detection:** Integration test in Phase 10; database constraint violations on duplicate summary

**Phase to address:** Phase 10 (history + period close) -- most critical test in the app

---

### Pitfall 6: toCents() Floating Point Contamination

**What goes wrong:** `toCents()` uses `Math.round(pesos * 100)` where `pesos` is a JavaScript `number`. Edge cases like `toCents(0.1 + 0.2)` introduce rounding errors before BigInt takes over.

**Why it happens:** `parseFloat("0.1") + parseFloat("0.2")` returns `0.30000000000000004`. `Math.round()` catches most cases but masks the problem.

**Consequences:**
- Off-by-one-centavo errors that accumulate over months
- Impossible to reproduce intermittently -- depends on specific decimal values

**Prevention:**
1. NEVER do arithmetic on peso amounts before converting to centavos
2. Parse user input string directly to centavos without float intermediate: split on decimal point
3. Validate max 2 decimal places in Zod schema before conversion
4. Write tests for known edge cases: "0.10", "0.20", "19.99", "999999.99"

**Detection:** Unit tests with exhaustive edge cases; roundtrip integrity assertions

**Phase to address:** Phase 2 (utilities foundation)

---

## Glyph Finance v2.0 Implementation Pitfalls

The following pitfalls are specific to implementing the Glyph Finance design system on top of the existing v1.0 codebase. These are new for the current milestone.

---

### Pitfall 7: @theme Token Rename Breaks All Existing Utility Classes

**What goes wrong:** The current `globals.css` defines tokens as `--color-bg-primary`, `--color-bg-card`, `--color-text-muted`, `--color-border`, etc. Every component in the codebase uses Tailwind utility classes derived from these names: `bg-bg-primary`, `text-text-muted`, `border-border`. Renaming tokens to the Glyph Finance schema (`--color-bg`, `--color-surface`, `--color-surface-elevated`, `--color-border-divider`) will silently break all classes that reference the old names. The build will pass. The page will render with no styles.

**Why it happens:** Tailwind v4 `@theme` token names are not just CSS variables -- they generate utility class names directly. When `--color-bg-primary` becomes `--color-bg`, the `bg-bg-primary` utility disappears from the generated stylesheet. Components still emit `className="bg-bg-primary"` and Tailwind does not error; the class simply resolves to nothing.

**Consequences:**
- Every component loses its background color silently
- Build passes with zero errors -- the problem only appears visually
- The rename affects 36+ files across the entire component tree
- Tests that assert `className.includes('bg-accent')` will still pass (old token may still render visually if a default catches it)

**Prevention:**
1. Before renaming any token, run a codebase-wide search for every old token utility class variant (`bg-bg-primary`, `bg-bg-card`, `bg-bg-elevated`, `bg-bg-input`, `text-text-primary`, `text-text-secondary`, `text-text-muted`, `border-border`, `border-border-light`, `bg-accent`, `text-accent`, `bg-positive`, `bg-negative`, `bg-warning`, `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-glow`)
2. Do the rename and the component updates in a single atomic commit, not two separate commits
3. After rename, run the full build immediately and grep for any remaining old token strings before declaring it done
4. Keep a migration map: `bg-bg-primary → bg-bg`, `bg-bg-card → bg-surface-elevated`, `text-text-muted → text-text-tertiary`
5. Update `@theme inline` block for `--font-sans` to reference the new font variable from next/font

**Detection:** Visual regression on every page; `pnpm build` succeeds while app renders unstyled; spot-check 3 different pages in the browser before committing

**Phase to address:** Phase 1 of v2.0 milestone (token migration) -- must be fully resolved before any component work begins

---

### Pitfall 8: next/font for Satoshi Requires Local Files, Not Google Fonts

**What goes wrong:** Satoshi is not available on Google Fonts. Attempting `import { Satoshi } from 'next/font/google'` will fail at build time with a module not found error. IBM Plex Mono IS on Google Fonts but is not a variable font, meaning each weight must be imported individually (400, 500, 600, 700 = 4 separate network requests unless self-hosted).

**Why it happens:** Developers assume Google Fonts has all major typefaces. Satoshi is distributed through the Fontshare CDN or as local files. The current `layout.tsx` uses `DM_Sans` from `next/font/google` -- swapping to Satoshi requires switching to `next/font/local`.

**Consequences:**
- Build failure if Satoshi is requested from Google Fonts
- If Satoshi files are missing from the project, `next/font/local` will throw at startup
- IBM Plex Mono without variable font support requires multiple font file downloads per weight used, increasing page weight
- Browser font synthesis (fake bold/italic) occurs if weight variants are not explicitly loaded, causing visual inconsistency in financial numbers

**Prevention:**
1. Download Satoshi font files from Fontshare (https://www.fontshare.com/fonts/satoshi) -- include Regular (400), Medium (500), Bold (700), and their italics. Place in `public/fonts/satoshi/`
2. Use `next/font/local` for Satoshi:
   ```ts
   const satoshi = localFont({
     src: [
       { path: '../public/fonts/satoshi/Satoshi-Variable.woff2', weight: '300 900' },
     ],
     variable: '--font-satoshi',
     display: 'swap',
   })
   ```
   If a variable font is available, use it to avoid multiple requests. Fontshare provides Satoshi-Variable.woff2.
3. For IBM Plex Mono, use `next/font/google` but restrict to weights actually used (400, 600):
   ```ts
   const ibmPlexMono = IBM_Plex_Mono({
     weight: ['400', '600'],
     subsets: ['latin'],
     variable: '--font-ibm-plex-mono',
     display: 'swap',
   })
   ```
4. Apply both variable classes to the `<html>` element
5. Reference both in `@theme inline` (not `@theme`) so Tailwind resolves them from the CSS variable:
   ```css
   @theme inline {
     --font-sans: var(--font-satoshi);
     --font-mono: var(--font-ibm-plex-mono);
   }
   ```
6. **Critical**: Use `@theme inline` not `@theme` for font variables. Without `inline`, Tailwind embeds the CSS variable reference as a literal string, not the computed value. The `font-sans` utility class will emit `font-family: var(--font-satoshi)` which only works when the CSS variable is actually set on `<html>`.

**Detection:** Build error "Satoshi is not a Google Font"; visual fallback to system-ui instead of Satoshi in dev tools; font weight numbers rendering with browser synthesis instead of the actual weight variant

**Phase to address:** Phase 2 of v2.0 milestone (font swap)

---

### Pitfall 9: Recharts Ignores CSS Variables -- Colors Must Be JavaScript Values

**What goes wrong:** Recharts renders via SVG. SVG `stroke` and `fill` attributes do not inherit CSS custom properties defined in `@theme` unless the SVG element is explicitly styled in CSS. All three chart components (`TrendAreaChart`, `BudgetBarChart`, `ExpenseDonutChart`) define `CHART_COLORS` as hardcoded hex constants referencing the old v1.0 palette. Changing the CSS tokens in `globals.css` has zero effect on chart colors.

**Why it happens:** Recharts accepts `stroke` and `fill` as JSX props (JavaScript strings), not CSS properties. The SVG rendering pipeline does not traverse the CSS cascade for inline SVG attributes. The Recharts `style` prop on components like `<CartesianGrid>` also uses inline styles, which have the same limitation for inherited CSS variables.

**Consequences:**
- Charts will display the old cyan (`#34d399`, `#f87171`, `#1e293b`) colors after all other components are updated to the Glyph Finance palette
- The visual inconsistency is striking: OLED black backgrounds with mismatched chart colors
- Recharts `<Tooltip>` background also uses hardcoded hex in `contentStyle`
- Chart grid lines remain in old slate color regardless of token updates

**Prevention:**
1. Replace each `CHART_COLORS` constant with a call to `getComputedStyle` that reads CSS variables at render time, or define a shared chart theme object that maps to the new palette hex values directly:
   ```ts
   // Correct approach: match new palette exactly
   const CHART_COLORS = {
     positive: '#00E676',      // --color-positive
     negative: '#FF3333',      // --color-negative
     accent: '#CCFF00',        // --color-accent
     tooltipBg: '#141414',     // --color-surface-elevated
     tooltipBorder: '#222222', // --color-border-divider
     axis: '#666666',          // --color-text-tertiary
   }
   ```
2. For the new "no grid" spec in STYLE_GUIDE.md: remove `<CartesianGrid>` entirely from all charts -- do not just set `stroke` to transparent (the element still takes up rendering cycles)
3. The minimal chart spec (1.5px stroke, 4px solid endpoint dots) requires: `strokeWidth={1.5}` on `<Line>` / `<Area>` and custom `<Dot>` component with `r={4}` filled in accent color for start/end points only
4. Recharts `<Tooltip>` styling must use `contentStyle={{ backgroundColor: '#141414', border: '1px solid #222222' }}` directly -- no CSS variable interpolation will work here

**Detection:** Chart colors unchanged after token migration; diff the before/after screenshots of the dashboard

**Phase to address:** Phase 5 of v2.0 milestone (chart overhaul)

---

### Pitfall 10: Shadow Tokens Still Exist in @theme -- Deletion Must Be Explicit

**What goes wrong:** The Glyph Finance spec explicitly eliminates all shadows (`--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-glow` are listed as "Tokens Eliminados" in STYLE_GUIDE.md). The current `globals.css` still defines all four. The `FAB` component uses `shadow-lg shadow-glow`. The `Modal` component uses `shadow-md`. `TransactionFilters` uses `shadow-lg`. Leaving the tokens in place means they continue to work, silently contradicting the design spec.

**Why it happens:** Removing tokens from `@theme` while the component tree still references them causes no build error in Tailwind v4 -- unknown utility classes are silently dropped. So the incorrect shadow usage will disappear if tokens are removed, but the component still emits the class name, making a future developer wonder why `shadow-glow` appears in code but has no visual effect.

**Consequences:**
- FAB button retains a cyan glow on OLED black, breaking the "elevation via background-shift only" rule
- Modals have a visible drop shadow, inconsistent with the flat design spec
- Leaving the tokens to avoid breakage means the design system is never fully implemented

**Prevention:**
1. Remove all four shadow token definitions from `@theme` in `globals.css`
2. Simultaneously replace shadow utility classes in every component: FAB (`shadow-lg shadow-glow` → remove), Modal (`shadow-md` → remove), TransactionFilters dropdowns (`shadow-lg` → remove)
3. The `FAB` elevation should come solely from its `--color-accent` background against `--color-bg` (OLED black) -- the contrast is sufficient
4. Modal elevation already comes from `--color-surface-elevated` (#141414) background against `--color-bg` (#000000) -- the `shadow-md` class is redundant

**Detection:** Search for `shadow-` in all `.tsx` files after token removal -- any remaining hit is an error. `grep -rn "shadow-" src/ --include="*.tsx"`

**Phase to address:** Phase 1 of v2.0 milestone (token migration) -- block all component work until resolved

---

### Pitfall 11: Constants.ts Category Colors Are Hardcoded Old Palette -- Tests Assert Old Values

**What goes wrong:** `src/lib/constants.ts` hardcodes the v1.0 category colors (e.g., `Comida: '#fb923c'`, `Freelance: '#22d3ee'`). The STYLE_GUIDE.md specifies new desaturated colors for Glyph Finance (e.g., `Comida: '#C88A5A'`, `Freelance: needs new value`). `src/lib/constants.test.ts` asserts the exact hex values: `expect(CATEGORY_COLORS['Freelance']).toBe('#22d3ee')`. These tests WILL FAIL after the color migration, which is correct -- but only if the tests are also updated.

**Why it happens:** Hardcoded hex values in test assertions are a test maintenance trap. The test was correct for v1.0. For v2.0, the test represents old behavior that should change.

**Consequences:**
- If tests are updated first, then constants: `pnpm test` fails during migration (expected, but noisy)
- If constants are updated first, then tests: the test suite shows failures but the code is actually correct
- If someone silently `it.skip()`s the failing test to unblock themselves, the constant never gets updated and the old colors persist in charts

**Prevention:**
1. Update `DEFAULT_CATEGORIES` in `constants.ts` with the new desaturated hex values from STYLE_GUIDE.md in the same commit as the test updates
2. STYLE_GUIDE.md provides 6 expense category colors but does NOT explicitly list new income category colors (Empleo, Freelance) -- determine these before starting migration and document in the commit message
3. The seed script in `prisma/seed.ts` also hardcodes category colors matching the old constants -- update all three in one atomic change: `constants.ts`, `constants.test.ts`, `seed.ts`
4. Run `pnpm prisma migrate reset` after updating seed to verify the database reflects the new palette

**Detection:** `pnpm test` failures in `constants.test.ts` after color migration; charts and category icons rendering old colors from stale seed data

**Phase to address:** Phase 1 of v2.0 milestone (token migration) -- the constants and seed update is the same batch as the CSS token rename

---

### Pitfall 12: Battery-Bar Progress Replaces Smooth Bar -- ARIA Must Be Updated

**What goes wrong:** The existing `BudgetProgressList`, `DebtCard` (both utilization and loan progress), and any other progress components use smooth `<div>` bars with `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`. When these are replaced with 10 discrete rectangle segments (the battery-bar pattern), the outer container still needs `role="progressbar"` -- but developers implementing the visual change often forget to carry over the ARIA attributes to the new markup structure.

**Why it happens:** Visual refactors focus on the appearance. The ARIA attributes are on the old element that gets deleted. The new segment-based markup is a grid of `<div>` elements where no single element maps to "the progress bar."

**Consequences:**
- Screen readers announce nothing when focus reaches budget progress rows
- WCAG 2.1 Level AA failure (4.1.2 Name, Role, Value)
- Battery-bar without `aria-valuenow` also means no accessible percentage for visually impaired users

**Prevention:**
1. The ARIA must live on the outermost container of the battery-bar component, not on any individual segment:
   ```tsx
   <div
     role="progressbar"
     aria-valuenow={Math.round(percentUsed)}
     aria-valuemin={0}
     aria-valuemax={100}
     aria-label={`${categoryName}: ${Math.round(percentUsed)}% del presupuesto usado`}
     className="flex gap-0.5"
   >
     {segments.map((filled, i) => (
       <div key={i} aria-hidden="true" className={...} />
     ))}
   </div>
   ```
2. Each individual segment `<div>` must have `aria-hidden="true"` so screen readers do not count 10 elements
3. For debt utilization bars: same pattern applies
4. Write a test: render the BatteryBar, assert the container has `role="progressbar"` and `aria-valuenow`

**Detection:** Axe accessibility audit; screen reader smoke test on the presupuesto page

**Phase to address:** Phase 4 of v2.0 milestone (progress bar component) -- accessibility is a requirement, not a polish step

---

### Pitfall 13: Floating Label Inputs Lose Accessibility When Label Is Used as Placeholder

**What goes wrong:** The UX_RULES.md specifies underline-only inputs with floating labels that start in placeholder position and animate upward on focus or when the field has content. A common mistake is implementing this with `placeholder` instead of `<label>` (using `placeholder` as the visible hint and CSS to "move" it). A `placeholder` is not a label and disappears when the user types, breaking accessibility.

**Why it happens:** Floating labels appear to work fine visually with either approach. The difference only matters to screen readers and users relying on persistent label visibility.

**Consequences:**
- Screen reader announces the input without a label (or with just "text field")
- When user starts typing, the placeholder disappears and they lose context about what they are filling in
- WCAG 2.1 failure: 1.3.1 Info and Relationships, 3.3.2 Labels or Instructions

**Prevention:**
1. Always use a real `<label>` element associated via `htmlFor` / `id` pair
2. The floating animation is achieved by positioning the `<label>` absolutely over the input line and transforming it on `:focus-within` or when the input has a value:
   ```tsx
   <div className="relative">
     <input id="amount" ... className="peer w-full border-b ..." />
     <label
       htmlFor="amount"
       className="absolute left-0 bottom-2 text-text-tertiary transition-all
                  peer-focus:-translate-y-5 peer-focus:text-xs peer-focus:uppercase
                  peer-focus:tracking-widest peer-focus:text-text-secondary
                  peer-[:not(:placeholder-shown)]:-translate-y-5
                  peer-[:not(:placeholder-shown)]:text-xs"
     >
       Monto
     </label>
   </div>
   ```
3. The input must have `placeholder=" "` (a single space) as a trick for the `:placeholder-shown` pseudo-class to work when the field is empty -- this preserves the CSS state machine without showing visible placeholder text
4. Do NOT rely solely on `aria-label` as a substitute for a visible label -- WCAG 2.4.6 Headings and Labels requires visible labels for form controls

**Detection:** Inspect any input in the form -- if there is no `<label>` element, it is wrong. Tab through all form fields with a screen reader (VoiceOver on Mac) and verify each announces its label

**Phase to address:** Phase 3 of v2.0 milestone (form components) -- affects every form in the app

---

### Pitfall 14: Pixel-Dissolve and Dot-Matrix Animations Cause Layout Paint -- Use Compositor-Only Properties

**What goes wrong:** The dot-matrix texture (SVG background repeated across transaction sheet hero area) and the pixel-dissolve scanline animation (new transaction appears with scanline reveal) are implemented naively using `opacity` on each row or background-position changes. Both of these can trigger layout recalculation on low-end Android devices when many elements animate simultaneously.

**Why it happens:** `opacity` and `transform` on SVG elements are compositor-only if the element is a composited layer. Background-position changes on `::before` pseudo-elements always trigger paint. Animating multiple `opacity` values simultaneously on 8-16 scanline divs triggers batched paint calls.

**Consequences:**
- Transaction list jank when a new item is inserted and the pixel-dissolve runs
- Bottom sheet slide-up laggy on mid-tier Android devices
- OLED black makes paint artifacts highly visible (white flicker before compositor takes over)

**Prevention:**
1. The dot-matrix texture must be a static SVG `background-image` with `background-repeat: repeat` -- not an animated element. No animation on the texture itself. The texture is part of the hero area background, not a layer.
2. For pixel-dissolve, prefer a single `clip-path` or `opacity` animation on the containing element rather than per-scanline animations:
   ```css
   @keyframes pixel-dissolve {
     from { opacity: 0; clip-path: inset(0 0 100% 0); }
     to   { opacity: 1; clip-path: inset(0 0 0% 0); }
   }
   ```
   This animates only two compositor-safe properties on one element.
3. For the `status-pulse` animation on the active period dot and bottom nav indicator: use `transform: scale()` rather than `box-shadow` or `width` changes. Scale is GPU-composited. Box-shadow is not.
4. Always add `will-change: transform, opacity` only to elements that actually animate -- do NOT apply it globally (it forces layer creation and increases GPU memory pressure on mobile)
5. Wrap new list item insertion in `startTransition` to prevent the animation from blocking the React render cycle

**Detection:** Chrome DevTools Performance panel: record adding a transaction, look for "Paint" events in the compositor timeline. If paint events are large, the animation is not compositor-only

**Phase to address:** Phase 6 of v2.0 milestone (animations and signature elements)

---

### Pitfall 15: Existing Tests Assert Old Class Names -- Silent Pass After Token Rename

**What goes wrong:** Three test files (`Sidebar.test.tsx`, `TransactionForm.test.tsx`, `FAB.test.tsx`) assert specific Tailwind class names: `text-accent`, `bg-accent`, `shadow-lg shadow-glow`. After the Glyph Finance token migration, the `shadow-glow` token is removed and the FAB component will no longer emit it. The `bg-accent` token is renamed internally but the utility class name `bg-accent` remains valid (because `--color-accent` stays as the token key). However, assertions about specific color hex values in `constants.test.ts` (`'#22d3ee'`, `'#fb923c'`) will fail.

**Why it happens:** Test authors locked in implementation details (class names, hex values) rather than behavior. This is valid for a design system where class names ARE the contract, but creates churn when the design system changes.

**Consequences:**
- `constants.test.ts`: 2 assertions fail immediately after color migration (correct signal -- test must be updated)
- `TransactionForm.test.tsx`: The assertion `expect(gastoButtons[0].className).toContain('bg-accent')` passes even after migration if the token key name stays `--color-accent` -- but the color value is now `#CCFF00` not `#22d3ee`, so the visual result is correct but the old cyan color never appears
- `Sidebar.test.tsx`: Tests for active item containing `text-accent` or `bg-accent` -- these will still pass after migration, but will miss the new dot indicator pattern (active item in Glyph Finance uses a dot, not a bg-accent fill)

**Prevention:**
1. Update `constants.test.ts` hex value assertions to the new Glyph Finance color values in the same commit as `constants.ts` updates
2. For `Sidebar.test.tsx`: update the active item test to assert the presence of the dot indicator element (a `<span>` with `bg-accent` and `rounded-full` and specific dimensions) rather than asserting the link element itself has `bg-accent`
3. For `FAB.test.tsx`: the test for `shadow-lg shadow-glow` should be removed entirely -- the expected behavior after migration is NO shadow on the FAB
4. Run `pnpm test` immediately after every token change, not just at the end of the migration batch

**Detection:** `pnpm test` after each migration step; any test that asserts visual implementation details (hex colors, shadow class names) is a candidate for review

**Phase to address:** Phase 1 of v2.0 milestone (token migration) -- update tests in the same commit as the code they test

---

### Pitfall 16: Custom Numpad in Bottom Sheet Traps Keyboard Focus

**What goes wrong:** The custom numpad replaces the system keyboard for amount entry. On desktop, the system keyboard is not invoked, so the numpad IS the only way to enter numbers. If Tab navigation reaches the numpad keys but cannot escape the numpad to reach the "Guardar" button or the category grid above, the user is trapped.

**Why it happens:** Numpad implementations typically use `<div>` elements with `onClick` rather than semantic `<button>` elements. Divs are not in the tab order by default, which means either (a) the numpad is inaccessible to keyboard users entirely, or (b) `tabIndex` is added to divs creating an unordered focus sequence.

**Consequences:**
- Keyboard-only users cannot use the transaction registration flow at all
- Touch users are unaffected (the intended use case)
- WCAG 2.1 Level A failure: 2.1.1 Keyboard

**Prevention:**
1. Implement each numpad key as a `<button>` element, not a `<div>` or `<span>`
2. Set `type="button"` to prevent unintended form submission
3. Ensure the focus order is: amount display → category grid → numpad keys (1-9, 00, .) → backspace → "Mas detalles" toggle → "Guardar"
4. The numpad container should have `aria-label="Teclado numerico"` and each key should have an `aria-label` for non-obvious keys (`aria-label="Borrar ultimo digito"` for backspace, `aria-label="Doble cero"` for the `00` key)
5. On mobile, the system keyboard is suppressed by not using a native `<input>` or by setting `readOnly` with a custom display element -- this is fine for touch users but the desktop keyboard fallback must still work

**Detection:** Tab through the entire bottom sheet form without touching the mouse. Every interactive element must be reachable and activatable with Enter/Space

**Phase to address:** Phase 5 of v2.0 milestone (custom numpad) -- build accessibility in from the start, not as polish

---

## v3.0 Auth + Cloud Deploy Pitfalls

The following pitfalls are specific to adding authentication and deploying to Vercel with Prisma Postgres. This is financial data -- security mistakes here are categorically unacceptable.

---

### Pitfall 17: Middleware-Only Auth Is Not a Security Boundary (CVE-2025-29927)

**What goes wrong:** The most common auth pattern in Next.js tutorials is: put `auth()` check in `proxy.ts` (formerly `middleware.ts`), redirect unauthenticated users, done. This is categorically wrong. CVE-2025-29927 (CVSS 9.1) disclosed in early 2025 demonstrated that any attacker could bypass ALL middleware logic by sending a single crafted HTTP header (`x-middleware-subrequest`), gaining full access to every protected route. Beyond the CVE, even when patched, middleware in Next.js 16 runs on Node.js and is designed for routing decisions, not as an auth enforcement layer.

**Why it happens:** Tutorials show middleware as the single auth check because it provides clean per-route protection without touching page components. The architecture looks correct, passes all local tests, and the CVE only manifests in exposed deployments.

**Consequences:**
- Every page, Server Action, and API route is accessible without authentication
- Financial data for all users fully exposed
- No audit log of the breach -- attacker reads silently

**Prevention:**
1. Auth must be checked at THREE layers simultaneously -- proxy.ts (routing), Data Access Layer (every DB query function), individual Server Actions and Route Handlers
2. Create a `src/lib/auth.ts` Data Access Layer with a `requireAuth()` function that calls `auth()` and throws/redirects if no session:
   ```ts
   export async function requireAuth(): Promise<string> {
     const session = await auth()
     if (!session?.user?.id) redirect('/login')
     return session.user.id
   }
   ```
3. Every Server Action and every Prisma query function that touches user data must start with `const userId = await requireAuth()`
4. `proxy.ts` handles routing redirects (fast, edge-level) but is NOT the last line of defense
5. Upgrade to Next.js 16+ which has the CVE patched; verify `package.json` has a version that includes the fix
6. Strip the `x-middleware-subrequest` header at the edge/load balancer level as an additional defense (Vercel does this automatically; self-hosted requires nginx/Caddy config)

**Warning signs:** Any Server Action or Route Handler that does NOT start with an auth check before accessing the database. Any query function that accepts `userId` as a parameter from the caller instead of reading it from the session (callers can lie).

**Phase to address:** v3.0 Phase 1 (auth foundation) -- the Data Access Layer pattern must be established before any per-user feature work begins

---

### Pitfall 18: Adding userId FK to Existing Tables Will Destroy Data Without a Three-Step Migration

**What goes wrong:** The app currently has ~10 Prisma models with thousands of rows (transactions, budgets, debts, categories, periods, etc.) and NO userId column. Adding `userId String` as a required field to any of these models and running `prisma migrate dev` will either: (a) error with "column has no default value" if Prisma detects existing rows, or (b) prompt you to reset the entire database, destroying all data. This is the single biggest technical risk in the v3.0 migration.

**Why it happens:** Prisma schema additions with `NOT NULL` constraints require all existing rows to have a value. Prisma's generated migration SQL does not know what userId to assign to existing rows, so it either fails or wipes.

**Consequences:**
- Production database wiped if `prisma migrate reset` is run accidentally
- Migration fails in production if run as a simple `prisma migrate deploy`
- Even if migration succeeds with a temporary default, all existing data is now assigned to one user, not isolated

**Prevention:** Use the three-step expand-contract pattern:

**Step 1: Add nullable column (no data loss)**
```sql
-- Generated by: prisma migrate dev --create-only
ALTER TABLE "Transaction" ADD COLUMN "userId" TEXT;
-- Do NOT add NOT NULL yet
```
Backfill existing rows: assign them all to the first/only user ID.
```sql
UPDATE "Transaction" SET "userId" = 'existing-user-id-here';
```

**Step 2: Add NOT NULL constraint + FK (after backfill)**
```sql
ALTER TABLE "Transaction" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
```

**Step 3: Update Prisma schema to reflect final state**
```prisma
model Transaction {
  userId  String
  user    User   @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Critical order:** The User table and first user account must exist BEFORE step 1. If the app had real production users, this migration would be run with their IDs. Since Centik is single-user for now, the seed/setup script must create the first user record before migration step 2 runs.

**Warning signs:** Any migration plan that does `prisma migrate dev` or `prisma db push` on a live database with existing rows without custom SQL to backfill.

**Phase to address:** v3.0 Phase 2 (Prisma schema migration) -- write and test the three-step migration in a staging environment first

---

### Pitfall 19: userId Missing From Prisma Queries -- Silent Cross-User Data Leakage

**What goes wrong:** After adding `userId` to the schema and migrating, the queries themselves must be updated to filter by `userId`. Missing even one query means that endpoint returns data from ALL users. In a personal finance app with multiple invited users, this means User A can read User B's transactions, debts, and income. The query will succeed (no error), the UI renders correctly (it shows data), and automated tests pass (they don't know whose data is whose).

**Why it happens:** There are 50+ Prisma `findMany`, `findFirst`, `findUnique`, `aggregate`, and `groupBy` calls across 102 source files. Updating the schema does not automatically update any query. Each must be manually audited.

**Consequences:**
- Silent data leak: User B can read User A's financial data by navigating to the right URL
- No error thrown, no log entry, no indication anything is wrong
- For financial data: GDPR violation, trust destruction, potential legal liability

**Prevention:**
1. Create a typed `db` wrapper module that enforces `userId` at the query level rather than relying on call-site discipline:
   ```ts
   // src/lib/db/transactions.ts
   export async function getUserTransactions(userId: string, filters: TransactionFilters) {
     return prisma.transaction.findMany({
       where: { userId, ...filters },
       // ...
     })
   }
   ```
   Direct `prisma.transaction.findMany()` calls in Server Components are forbidden after this pattern is established.
2. Never accept `userId` as a parameter from the client -- always derive it from the session inside the query function
3. Write integration tests that create two users, create data for User A, then attempt to fetch via User B's session -- assert empty result
4. Audit checklist: every model with `userId` FK must have ZERO calls to `prisma.[model].findMany()` without `where: { userId }` in the query file

**Warning signs:** Any `prisma.[model].findMany({})` call without a `where` clause. Any query that receives `userId` as a route parameter rather than reading from `await requireAuth()`.

**Phase to address:** v3.0 Phase 3 (per-user data isolation) -- this is the phase that eliminates the leakage. Must include cross-user isolation integration tests as the success criterion.

---

### Pitfall 20: Auth.js Session Does Not Include userId By Default -- Every Server Action Gets null

**What goes wrong:** Auth.js v5 with the credentials provider creates a session, but `session.user.id` is `undefined` by default. The `jwt` and `session` callbacks must be explicitly configured to forward the user's database ID into the session token. Without this, every call to `const userId = await requireAuth()` returns null or undefined, causing either a redirect loop (if you redirect on null) or silent query failures (if you forget to check).

**Why it happens:** Auth.js's default session object contains only `name`, `email`, and `image`. The `id` field from the database user record is not included unless you explicitly add it in both the `jwt` callback (to put it in the token) and the `session` callback (to expose it on the session object). Many tutorials show the login working but do not show this step, so developers discover the problem only when the first Server Action tries to use `userId`.

**Consequences:**
- Every Server Action fails silently because `userId` is undefined
- Queries run without a `where: { userId }` filter (if the developer forgets to check for null), leaking all data
- If `requireAuth()` redirects on null session, the app appears to be in an infinite login loop

**Prevention:**
1. Configure both callbacks explicitly in `auth.ts`:
   ```ts
   callbacks: {
     jwt({ token, user }) {
       if (user) token.id = user.id  // populate on initial sign in
       return token
     },
     session({ session, token }) {
       session.user.id = token.id as string  // expose to all auth() calls
       return session
     },
   }
   ```
2. Extend the TypeScript types so `session.user.id` is typed as `string` (not `string | undefined`):
   ```ts
   // types/next-auth.d.ts
   declare module 'next-auth' {
     interface Session { user: { id: string } & DefaultSession['user'] }
   }
   ```
3. Write a test: sign in with test credentials, call `auth()`, assert `session.user.id` is the correct database ID
4. Verify the `requireAuth()` function is called at the START of every Server Action before any business logic

**Warning signs:** `session.user.id` is typed as `string | undefined`. Server Actions that assume `userId` is always a string without checking first.

**Phase to address:** v3.0 Phase 1 (auth foundation) -- test the session shape before building any per-user features

---

### Pitfall 21: TOTP Secret Stored in Plaintext in the Database

**What goes wrong:** When a user enables TOTP 2FA, the app generates a secret (e.g., via `otpauth` library) and stores it in the `User` table. If the secret is stored in plaintext, any database dump, SQL injection, or accidental log output exposes the secret permanently. Unlike passwords (which are hashed and can never be reversed), TOTP secrets ARE the credential -- knowing the secret allows anyone to generate valid TOTP codes indefinitely.

**Why it happens:** Tutorials focus on getting TOTP working and treat the secret as "not a password," so they skip encryption. The secret is a base32-encoded string that looks innocuous. Developers don't think of it as a plaintext password stored in the DB.

**Consequences:**
- Database breach = permanent TOTP compromise for every enabled user
- Attacker can generate valid TOTP codes for any user at any time
- The "something you have" factor (the authenticator app) is neutralized

**Prevention:**
1. Encrypt TOTP secrets at rest using AES-256-GCM before storing in the database:
   ```ts
   import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
   const TOTP_ENCRYPTION_KEY = Buffer.from(process.env.TOTP_ENCRYPTION_KEY!, 'hex') // 32 bytes
   
   export function encryptTotpSecret(plaintext: string): string {
     const iv = randomBytes(12)
     const cipher = createCipheriv('aes-256-gcm', TOTP_ENCRYPTION_KEY, iv)
     const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
     const tag = cipher.getAuthTag()
     return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
   }
   ```
2. `TOTP_ENCRYPTION_KEY` must be a separate 32-byte secret from `AUTH_SECRET`. Store in `.env`, never commit.
3. Never log TOTP secrets or include them in error messages
4. Use `otpauth` (actively maintained) over `speakeasy` (unmaintained since 2018)
5. After verifying a TOTP code, mark it as "used" to prevent replay attacks within the same 30-second window: store the last matched counter in Redis or a DB column

**Warning signs:** `totpSecret` column in the User table is a plain `String` type with no corresponding encryption/decryption layer. Any log statement that includes user security fields.

**Phase to address:** v3.0 Phase 1 (auth foundation) -- encryption must be in place before TOTP setup flow is built

---

### Pitfall 22: TOTP Verification Without Rate Limiting Enables Brute Force in 33 Minutes

**What goes wrong:** A TOTP code is 6 digits (1,000,000 possibilities). If there is no rate limiting on the TOTP verification endpoint, an attacker with a stolen password can brute-force the current 30-second window's TOTP code. With no rate limiting, this takes at most 1,000,000 / 30 seconds = 33,333 seconds = about 9 hours, but practically much less because only one code is valid per window (reducing the effective space to ~300 valid codes per hour). Standard implementations allow 3-5 attempts before locking.

**Why it happens:** Rate limiting is often added as an afterthought. The login endpoint gets rate limited but the TOTP step (which is a separate form submission) is overlooked.

**Consequences:**
- 2FA is effectively bypassed given time and network capacity
- This is particularly dangerous for financial data where a persistent attacker is motivated

**Prevention:**
1. Apply rate limiting to BOTH the password verification step AND the TOTP step independently
2. Use `@upstash/ratelimit` with Redis (or Vercel KV) for serverless-compatible rate limiting:
   ```ts
   const ratelimit = new Ratelimit({
     redis: Redis.fromEnv(),
     limiter: Ratelimit.slidingWindow(5, '15 m'),  // 5 attempts per 15 minutes
   })
   ```
3. Rate limit by user ID (not just IP) on the TOTP step -- the attacker already has the correct password
4. After 5 failed TOTP attempts, lock the account and require email verification to unlock
5. Log all failed TOTP attempts with user ID and IP for security monitoring

**Warning signs:** TOTP verification endpoint with no `ratelimit.limit()` call. Rate limiting only applied to the login page but not to the `verifyTotp` Server Action.

**Phase to address:** v3.0 Phase 2 (rate limiting) -- rate limiting on auth endpoints is not optional for financial data

---

### Pitfall 23: Invite Token Is Guessable or Never Expires

**What goes wrong:** The invite-only registration system generates a token and emails it to the invited user. If the token is too short, predictable (e.g., a 6-digit code), or never expires, attackers can either brute-force the token or use an old link from a breached email to create unauthorized accounts. Since this app holds financial data, unauthorized account creation is the entry point to all data.

**Why it happens:** Invite tokens are often implemented as short convenience codes. Developers don't anticipate that email inboxes can be breached or that short tokens are guessable.

**Consequences:**
- Unauthorized user creates an account and has access to the same app as legitimate users
- If per-user isolation is not perfect (see Pitfall 19), this is especially dangerous
- Even with perfect isolation, an unauthorized user can create data and consume resources

**Prevention:**
1. Generate invite tokens using `crypto.randomBytes(32).toString('hex')` -- 64 character hex string, 256 bits of entropy, not guessable
2. Store token as a hash (`sha256(token)`) in the database, not the plaintext token. Compare using constant-time comparison.
3. Tokens must expire: 72 hours is a reasonable window for email invites
4. Tokens are single-use: mark as `usedAt` immediately on registration; subsequent use returns "invalid or expired invite"
5. Store invite metadata: `invitedBy` (admin user ID), `invitedEmail` (the specific email the token was sent to), `expiresAt`. Verify that the email used for registration matches `invitedEmail`.
6. Rate limit invite creation: max 10 invites per admin per hour to prevent abuse

**Warning signs:** Invite token column is fewer than 32 bytes. No `expiresAt` column on the Invite model. Token used without checking if it matches the email used for registration.

**Phase to address:** v3.0 Phase 1 (auth foundation) -- the invite model must be correct from day one

---

### Pitfall 24: Next.js App Router Cache Leaks User-Specific Data Across Sessions

**What goes wrong:** Next.js App Router is cache-first by default. Any Server Component that fetches user data without explicitly opting out of caching can have its output cached and served to a different user on the next request. For example, the dashboard page fetching "monthly totals for current user" may be cached after User A's request and then served to User B without re-running the query.

**Why it happens:** The default Next.js caching behavior changed between versions. Without `cache: 'no-store'` on fetch calls, or `noStore()` from `next/cache`, responses are potentially cached. Financial data pages that appear to work correctly in single-user testing silently leak in multi-user production.

**Consequences:**
- User B sees User A's financial totals, transaction counts, and balance data
- No error is thrown; the page renders with incorrect but real-looking data
- Extremely difficult to reproduce or detect without intentional cross-user testing

**Prevention:**
1. All Server Components that read user-specific data must call `noStore()` from `next/cache` at the top of the component (or the data-fetching function):
   ```ts
   import { unstable_noStore as noStore } from 'next/cache'
   export default async function DashboardPage() {
     noStore()
     const userId = await requireAuth()
     // ... queries
   }
   ```
2. Alternatively, any `fetch()` call must include `{ cache: 'no-store' }` option
3. Direct Prisma queries in Server Components bypass `fetch` caching entirely (no `cache: 'no-store'` needed), but be aware of React's per-render caching which `noStore()` also disables
4. Review every `loading.tsx` and `layout.tsx` -- these can also accidentally cache if they contain data fetching
5. Write a cross-user integration test: authenticate as User A, cache a page, authenticate as User B, assert User B sees their own data not User A's

**Warning signs:** Server Components that call Prisma without `noStore()` at the top. Any page that uses `generateStaticParams` or is marked for static generation while also containing user-specific data.

**Phase to address:** v3.0 Phase 3 (per-user data isolation) -- every page must be audited for caching behavior

---

### Pitfall 25: Prisma Postgres on Vercel -- Direct vs. Pooled Connection Strings

**What goes wrong:** Prisma Postgres (Vercel's managed Postgres integration) provides two connection strings: a direct connection (`db.prisma.io`) and a pooled connection (`pooled.db.prisma.io`). Using the wrong one in the wrong context causes either connection exhaustion in production or migration failures in CI.

**Specific failure modes:**
- Using the **direct** string for `DATABASE_URL` in serverless functions: each Vercel function invocation opens a new connection. Under load (50+ concurrent users), the database runs out of connections. Fails silently -- queries just time out.
- Using the **pooled** string for `prisma migrate deploy`: migrations require session-level locks. PgBouncer (the pooler) uses transaction-level pooling by default, which drops session state between transactions. Migrations hang or fail with lock errors.

**Why it happens:** There is one `DATABASE_URL` in `.env`. Developers pick one string and use it everywhere. The problem doesn't manifest in development (single user, no concurrency) and only appears in production.

**Prevention:**
1. Configure two environment variables:
   - `DATABASE_URL` = pooled string (used by `PrismaClient` in the app at runtime)
   - `DATABASE_URL_UNPOOLED` = direct string (used by Prisma CLI for migrations)
2. In `prisma.config.ts`:
   ```ts
   export default defineConfig({
     datasource: {
       url: process.env.DATABASE_URL,           // pooled -- for app
       directUrl: process.env.DATABASE_URL_UNPOOLED,  // direct -- for CLI
     }
   })
   ```
3. Vercel injects both variables automatically when Prisma Postgres is added via the integration -- do not manually override them
4. Never use the direct URL in application code; never use the pooled URL in CI migration scripts

**Warning signs:** Single `DATABASE_URL` used for both `prisma migrate deploy` and runtime queries. Migration CI job timing out. Production queries timing out under load.

**Phase to address:** v3.0 Phase 4 (Vercel deployment) -- environment variable setup must be correct before the first production deploy

---

### Pitfall 26: CSP Breaks Next.js Inline Scripts -- Nonce Required

**What goes wrong:** Adding a Content Security Policy (CSP) header to block XSS is essential for a financial app. However, Next.js injects inline `<script>` tags (for hydration, RSC payloads, and `next/font`) that are blocked by a strict CSP. The result: the app silently fails to hydrate in production, appearing to load but not responding to any interactions. This only affects production builds (development mode has no minification and different script injection patterns).

**Why it happens:** Developers set `script-src: 'self'` and verify it works in development. The production build injects inline scripts that development does not. The mismatch is discovered after deploy when users report the app is broken.

**Consequences:**
- App completely non-interactive in production (all JavaScript blocked by CSP)
- No obvious error in the browser console for non-developer users
- Login form does not submit, buttons do not respond

**Prevention:**
1. Use a per-request nonce (not `unsafe-inline`) for the `script-src` directive. Generate in `proxy.ts` and inject via response headers:
   ```ts
   // proxy.ts
   export function proxy(request: NextRequest) {
     const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
     const cspHeader = `
       default-src 'self';
       script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
       style-src 'self' 'nonce-${nonce}';
       img-src 'self' blob: data:;
       font-src 'self';
       object-src 'none';
       base-uri 'self';
       form-action 'self';
       frame-ancestors 'none';
       upgrade-insecure-requests;
     `.replace(/\s{2,}/g, ' ').trim()
     const response = NextResponse.next({ request: { headers: new Headers({ 'x-nonce': nonce }) } })
     response.headers.set('Content-Security-Policy', cspHeader)
     return response
   }
   ```
2. Pass the nonce to your root layout via the `x-nonce` header and apply it to `<Script>` components
3. Start with `Content-Security-Policy-Report-Only` in staging to detect violations before switching to enforcement mode
4. Never use `unsafe-inline` or `unsafe-eval` in production CSP for a financial app

**Warning signs:** `script-src: 'unsafe-inline'` in production CSP. CSP set only in `next.config.ts` headers without nonce generation (static nonce = same as no nonce for XSS protection).

**Phase to address:** v3.0 Phase 4 (Vercel deployment + security headers) -- start with report-only mode, then enforce

---

### Pitfall 27: Password Hashing With Weak Algorithm or Incorrect Parameters

**What goes wrong:** The `bcrypt` package from npm has three distinct implementations in the Node.js ecosystem: `bcrypt` (native C binding), `bcryptjs` (pure JS), and `@node-rs/bcrypt` (Rust via napi-rs). Mixing them across dev and production or using the wrong one in a serverless environment causes either build failures (native binaries don't cross-compile) or silently degraded security (low cost factor).

**Why it happens:** Tutorials use `bcryptjs` for simplicity (no native deps). Production Vercel runs on Linux x64 with native module support. The cost factor (rounds) is often left at the tutorial default of 10 rather than being calibrated to the actual deployment hardware.

**Prevention:**
1. Use `bcryptjs` for Vercel serverless compatibility (no native compilation needed, works on all platforms without build-time issues)
2. Set cost factor to 12 for 2025 hardware (adds ~200ms per hash -- acceptable for auth flows, not for every request)
3. Alternatively use `argon2id` with `@node-rs/argon2` which provides better security properties and compiles for Vercel's Linux x64 target without issues
4. Test the hash + compare cycle in a Vercel preview deployment before merging to main -- native module failures only appear in the deployment environment
5. Never hash passwords in a serverless Edge Runtime -- bcrypt and argon2 require Node.js

**Warning signs:** Cost factor of 10 or less. Use of deprecated `speakeasy` library for TOTP alongside `bcrypt`. Hash generation in Edge middleware.

**Phase to address:** v3.0 Phase 1 (auth foundation) -- password hashing is the foundation of credential security

---

### Pitfall 28: Session Fixation After Login -- Session Token Not Rotated

**What goes wrong:** Auth.js v5 with the database session strategy does not automatically rotate the session token on login. An attacker who obtains a pre-login session cookie (e.g., via network sniffing before HTTPS, or XSS before login) can fix that session ID and then authenticate as the victim, inheriting the now-authenticated session.

**Why it happens:** Session fixation is a less-known attack compared to session hijacking. Most tutorials do not mention token rotation. Auth.js generates a session token on the first visit (unauthenticated) and reuses it after login unless explicitly rotated.

**Prevention:**
1. Use JWT session strategy in Auth.js v5 instead of database sessions -- JWTs are inherently stateless and a new JWT is issued on each login, preventing fixation
2. If using database sessions: call `signOut()` then `signIn()` in the auth flow to force session regeneration, or use Auth.js's built-in session rotation if available in v5
3. Enforce HTTPS everywhere (HSTS header) to prevent pre-login cookie theft via network
4. Set session cookies with `Secure`, `HttpOnly`, and `SameSite=Lax` -- Auth.js does this by default for production but verify in the actual cookie inspection

**Warning signs:** Session strategy is `database` and there is no explicit session rotation logic on login. Cookie inspector shows session cookie without `Secure` flag in production.

**Phase to address:** v3.0 Phase 1 (auth foundation) -- session strategy choice affects all subsequent auth work

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode hex colors in CHART_COLORS instead of reading from CSS variables | Works immediately, no CSS variable complexity | Every color update requires touching 3 chart files separately | Acceptable for v2.0 -- document clearly that chart colors mirror token values |
| Use `placeholder` instead of `<label>` for floating label appearance | Simpler markup | Accessibility failure, fails WCAG AA | Never |
| Keep old shadow tokens in @theme while removing them from components | No build breakage during migration | Old tokens accumulate, design system contract is unclear | Acceptable for 1 sprint maximum during migration |
| Apply `will-change: opacity, transform` to all animated elements | Slightly smoother animations | GPU memory pressure on mobile, battery drain | Never -- only on confirmed janky elements |
| Use `it.skip()` to silence failing color assertions during migration | Unblocks other work | Old colors may never get updated; test coverage gap | Never in main branch |
| Implement numpad with `<div tabIndex={0}>` instead of `<button>` | Less semantic, faster to write | Keyboard trap, WCAG failure | Never |
| Put all auth logic in proxy.ts only | Clean, centralized | Bypassed by CVE-2025-29927; bypassed by direct API calls | Never |
| Store TOTP secret as plaintext in DB | Simpler, no encryption code | DB breach = permanent TOTP compromise | Never |
| Use same DATABASE_URL for migrations and app runtime | Simpler .env config | Connection exhaustion in production; migration lock failures | Never for production |
| Skip cross-user isolation tests | Faster to write | Silent data leakage between users | Never for financial data |
| Invite tokens as short numeric codes | User-friendly | Brute-forceable; bypasses invite restriction | Never |
| bcrypt cost factor 10 | Faster in dev/testing | Insufficient protection on modern hardware | Development only; never production |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Recharts + CSS tokens | Passing `var(--color-positive)` as `stroke` prop | Pass `'#00E676'` (resolved hex) directly in CHART_COLORS constant |
| next/font + Tailwind @theme | Defining font in `@theme` instead of `@theme inline` | Use `@theme inline { --font-sans: var(--font-satoshi); }` |
| Satoshi + next/font/google | Importing from google when font is not in Google Fonts | Use `next/font/local` with files from Fontshare |
| Battery-bar + ARIA | Placing `role="progressbar"` on individual segments | Place on the container; add `aria-hidden="true"` to each segment |
| Floating label + accessibility | Using CSS `placeholder` as the visible label | Use real `<label>` with CSS positioning; input must have `placeholder=" "` |
| Sonner toasts + new tokens | Toast `className` override using old token utility classes | Update `toastOptions.className` and any custom toast components to new utilities |
| Loading skeleton + new tokens | `animate-pulse` backgrounds still reference `bg-bg-card` | Update all loading.tsx files: `bg-bg-card` → `bg-surface-elevated` |
| Auth.js + session userId | Relying on default session shape for `session.user.id` | Explicitly configure jwt + session callbacks; extend TypeScript types |
| Prisma Postgres + Vercel | Single DATABASE_URL for both migrations and runtime | Two vars: pooled for runtime, direct/unpooled for CLI |
| Next.js CSP + inline scripts | Setting `script-src: 'self'` without nonces | Per-request nonce in proxy.ts; pass nonce to layout |
| TOTP + otpauth | Using unmaintained `speakeasy` library | Use `otpauth` (actively maintained); verify against official RFC 6238 |
| Rate limiting + serverless | In-memory rate limit store resets per cold start | Use Vercel KV / Upstash Redis for persistent rate limit counters |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Animating `background-position` on dot-matrix texture | Jank on scroll in transaction list | Use static `background-image` with `background-repeat` | Any mobile device |
| Per-scanline `opacity` animation for pixel-dissolve | Multiple paint events per frame | Single `clip-path` or `opacity` on container | Devices with <4 CPU cores |
| `will-change` on all cards to pre-empt animation | GPU memory exhaustion, battery drain | Add `will-change` only to elements actively animating | Any device with limited VRAM |
| IBM Plex Mono loaded for all weights 100-900 | +200KB font download | Load only weights 400 and 600 via `next/font/google` | Initial page load on slow connections |
| SVG dot matrix rendered as inline SVG on every item | DOM bloat, slow reflow | Encode as `data:` URI in CSS `background-image` | Lists with 50+ transactions |
| Direct Prisma connection string in serverless functions | Queries time out under concurrent load | Use pooled connection string for app runtime | 20+ concurrent requests |
| In-memory rate limiter (Map/object) | Works in dev; silent failure in production | Use Redis-backed rate limiter (Upstash) | First cold start after deploy |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Middleware-only auth (Pitfall 17) | Full auth bypass via CVE-2025-29927; any direct API call | Defense in depth: requireAuth() in every Server Action and query function |
| Missing userId in Prisma queries (Pitfall 19) | Silent cross-user data leakage | Typed DB wrapper that enforces userId on every query |
| Plaintext TOTP secrets (Pitfall 21) | DB breach = permanent TOTP compromise | AES-256-GCM encrypt before storing; separate encryption key |
| No TOTP rate limiting (Pitfall 22) | Brute-forceable in hours with stolen password | 5 attempts per 15 min, lock on exceeded limit, per-user counter |
| Guessable invite tokens (Pitfall 23) | Unauthorized account creation | `crypto.randomBytes(32)`, 72h expiry, single-use, email-locked |
| Caching user-specific pages (Pitfall 24) | Cross-user data leakage via CDN cache | `noStore()` in every Server Component with user data |
| `unsafe-inline` in CSP | XSS enables financial data theft | Per-request nonce; never unsafe-inline in production |
| Weak bcrypt cost factor | Password crackable offline after DB breach | Cost factor 12+; test timing on target hardware |
| Session not rotated on login (Pitfall 28) | Session fixation attack | JWT strategy (stateless, new token per login) or explicit rotation |
| userId accepted from client request body | Attacker spoofs another user's ID | Always derive userId from `await auth()` session, never from request params |
| Error responses exposing Prisma stack traces | DB schema leakage to attacker | Generic error messages to client; full errors logged server-side only |
| BigInt in logs | Serialization errors or crashes in log pipeline | Never log raw Prisma results; always serialize before any external output |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Removing text labels from bottom nav (icon-only) without testing with real users | Users cannot identify tabs without learning icon meanings | Phase-in: test with 3-5 users; ensure active dot indicator is immediately visible |
| Custom numpad that lacks "00" shortcut for round amounts | Every round peso amount (e.g., $500) requires 3 taps instead of 2 | Include "00" key per STYLE_GUIDE.md spec; test with real transaction amounts |
| Battery-bar that does not animate fill on load | Progress state feels static, less engaging | Animate fill (500ms ease) when component mounts -- but skip animation for `prefers-reduced-motion` |
| Chartreuse (#CCFF00) accent on small text (11-12px) | At small sizes, the extreme saturation causes visual vibration on OLED displays | Reserve chartreuse for interactive elements and large display numbers; use `--color-text-secondary` (#999999) for small labels |
| OLED pure black (#000000) background with white text | High contrast causes halation for users with astigmatism | This is a design decision per spec; document it; provide no workaround in MVP |
| Underline inputs with no visible input boundary until focus | Users may not recognize fields as interactive | Ensure the underline (1px border-bottom) is visible even in the resting state using `--color-border-divider` (#222222) |
| Login page with no feedback on failed TOTP (rate limit message missing) | User doesn't know they are locked out; retries repeatedly | Show "Too many attempts. Try again in X minutes." with countdown; do not reveal whether email or password was wrong |
| Invite flow with no expiry feedback | User clicks expired link; sees generic "invalid" error | Display "This invite link expired on [date]. Contact the admin for a new invite." |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Token migration:** All 36+ component files updated -- verify with `grep -rn "bg-bg-primary\|bg-bg-card\|bg-bg-elevated\|text-text-muted\|shadow-glow\|shadow-sm\|shadow-md" src/`
- [ ] **Font swap:** DM Sans removed from `layout.tsx` import AND from `<html className>` -- if the old variable is still applied, the old font may load as a fallback
- [ ] **Chart colors:** Recharts `CHART_COLORS` constants updated in all 3 chart files (`TrendAreaChart`, `BudgetBarChart`, `ExpenseDonutChart`) -- `grep -rn "34d399\|f87171\|22d3ee\|1e293b" src/components/charts/`
- [ ] **Seed colors:** `prisma/seed.ts` category colors match `constants.ts` -- stale seed data will show old category colors in charts even after token migration
- [ ] **Battery-bar ARIA:** Container has `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`; all segment divs have `aria-hidden="true"`
- [ ] **Floating label inputs:** Every input in every form has a real `<label>` with `htmlFor` -- zero inputs using only `placeholder` as label substitute
- [ ] **Focus rings:** `--color-accent` focus ring updated from cyan to chartreuse in globals.css (already `var(--color-accent)` so it auto-updates, but verify visually)
- [ ] **Loading skeletons:** All `loading.tsx` files updated to use new surface tokens -- these are often forgotten in visual QA
- [ ] **Sonner toaster:** `Toaster` `theme="dark"` and `toastOptions` still work with OLED black background -- verify toast bg is `--color-surface-elevated` (#141414) not transparent
- [ ] **Numpad keyboard navigation:** Tab through entire bottom sheet form without mouse; every key reachable and activatable
- [ ] **prefers-reduced-motion:** All keyframe animations (pixel-dissolve, status-pulse, battery-bar fill) have `@media (prefers-reduced-motion: reduce)` override
- [ ] **Auth session shape:** `session.user.id` is a non-null string in TypeScript types; jwt and session callbacks both configured
- [ ] **Cross-user isolation:** Integration test asserts User B cannot read User A's data on every major model (Transaction, Budget, Debt, IncomeSource)
- [ ] **Every Server Action:** Starts with `const userId = await requireAuth()` before any Prisma call
- [ ] **Every Route Handler:** Calls `requireAuth()` even if proxy.ts redirects unauthenticated users
- [ ] **TOTP secret encrypted:** `User.totpSecret` column stores ciphertext, not plaintext; encryption/decryption functions tested
- [ ] **Invite token model:** Has `expiresAt`, `usedAt`, `invitedEmail`, `invitedBy`; token is hashed in DB
- [ ] **Rate limiting wired up:** Login, TOTP verification, and invite creation endpoints all have rate limit middleware
- [ ] **CSP in production:** `Content-Security-Policy` header present in Vercel deployment; verified no `unsafe-inline`; nonce properly forwarded to layout
- [ ] **Two DATABASE_URL vars:** `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct) both set in Vercel environment variables
- [ ] **userId backfill migration:** Three-step migration completed; zero rows in any model have null userId

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Token rename breaks all components | HIGH | Revert to last commit; create migration map first; do token rename + all component updates atomically |
| Satoshi font missing at build | LOW | Add Satoshi files to `public/fonts/`; update `next/font/local` src path; rebuild |
| Chart colors wrong after token migration | LOW | Update `CHART_COLORS` constants in 3 files; no DB changes needed |
| Battery-bar missing ARIA | MEDIUM | Refactor outer container; add ARIA props; update tests to assert ARIA presence |
| Floating label inputs without `<label>` | MEDIUM | Refactor each form component; test every form with VoiceOver |
| Numpad keyboard trap | MEDIUM | Replace `<div>` keys with `<button type="button">`; add tab order verification test |
| Pixel-dissolve causing jank | LOW | Replace per-element animation with single container `clip-path` keyframe |
| Data leakage discovered in production | CRITICAL | Immediately remove all affected data from DB; audit all query functions; add userId filters; notify affected users |
| TOTP secrets found plaintext in DB | CRITICAL | Rotate all TOTP secrets (require re-enrollment); add encryption layer; treat as credential breach |
| userId migration corrupted production data | CRITICAL | Restore from backup; plan three-step migration properly on staging first |
| CSP breaks app in production | MEDIUM | Switch to `Content-Security-Policy-Report-Only`; identify blocking rules; add nonce; re-enforce |
| Middleware auth bypass discovered | HIGH | Deploy patched Next.js version immediately; add requireAuth() to all Server Actions as emergency fix; audit logs for unauthorized access |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Token rename breaks components (Pitfall 7) | Phase 1: Token migration | `grep` for all old token classes returns zero results; visual check 3 pages |
| Satoshi requires local font files (Pitfall 8) | Phase 2: Font swap | Build succeeds; DevTools Network tab shows Satoshi loading; no system-ui fallback visible |
| Recharts ignores CSS variables (Pitfall 9) | Phase 5: Chart overhaul | Dashboard charts show new palette colors (#00E676, #FF3333, #CCFF00) |
| Shadow tokens persist (Pitfall 10) | Phase 1: Token migration | `grep -rn "shadow-" src/ --include="*.tsx"` returns zero hits |
| Constants.ts old colors (Pitfall 11) | Phase 1: Token migration | `pnpm test` passes; category icon colors match STYLE_GUIDE.md desaturated palette |
| Battery-bar ARIA (Pitfall 12) | Phase 4: Progress bars | Axe audit on presupuesto page shows zero violations; role=progressbar present |
| Floating label accessibility (Pitfall 13) | Phase 3: Form components | Every input has `<label>` with `htmlFor`; VoiceOver announces label on focus |
| Animation performance (Pitfall 14) | Phase 6: Animations | Chrome DevTools Performance: no large Paint events during transaction insert |
| Tests assert old class names (Pitfall 15) | Phase 1: Token migration | `pnpm test` passes; no `it.skip()` added |
| Numpad keyboard trap (Pitfall 16) | Phase 5: Custom numpad | Tab through entire bottom sheet; all keys reachable; no focus trap |
| Middleware-only auth (Pitfall 17) | v3.0 Phase 1: Auth foundation | requireAuth() present in every Server Action; confirmed via code audit |
| userId FK migration destroys data (Pitfall 18) | v3.0 Phase 2: Schema migration | Three-step migration tested on staging; no row count change after migration |
| Missing userId in queries (Pitfall 19) | v3.0 Phase 3: Data isolation | Cross-user integration tests pass; zero unfilitered findMany calls in query layer |
| Session userId undefined (Pitfall 20) | v3.0 Phase 1: Auth foundation | `session.user.id` asserted non-null in auth integration test |
| TOTP secret plaintext (Pitfall 21) | v3.0 Phase 1: Auth foundation | `User.totpSecret` column contains encrypted ciphertext; decrypt function tested |
| TOTP no rate limiting (Pitfall 22) | v3.0 Phase 2: Rate limiting | 6th attempt within 15min returns 429; account locked after limit |
| Guessable invite token (Pitfall 23) | v3.0 Phase 1: Auth foundation | Token is 64 hex chars; expires in 72h; single-use; email-locked |
| Cache leaks user data (Pitfall 24) | v3.0 Phase 3: Data isolation | Cross-user cache test: User B sees their own empty data, not User A's |
| Wrong Prisma connection string (Pitfall 25) | v3.0 Phase 4: Vercel deploy | Two env vars set in Vercel dashboard; migrations run without lock errors |
| CSP blocks inline scripts (Pitfall 26) | v3.0 Phase 4: Vercel deploy | CSP header present; no console errors on hydration; nonce-based policy |
| Weak password hashing (Pitfall 27) | v3.0 Phase 1: Auth foundation | bcryptjs cost factor 12 confirmed in auth.ts; hash timing >100ms |
| Session fixation (Pitfall 28) | v3.0 Phase 1: Auth foundation | JWT strategy confirmed; new token issued on each sign-in |

---

## Phase-Specific Warnings (v1.0 Foundation)

| Phase | Likely Pitfall | Severity | Mitigation |
|-------|---------------|----------|------------|
| Phase 1: Scaffolding | Version mismatch (Pitfall 1) | CRITICAL | Audit all patterns against actual installed versions |
| Phase 1: Scaffolding | Prisma 7 config (Pitfall 3) | CRITICAL | Create prisma.config.ts, not package.json seed |
| Phase 1: Scaffolding | ESLint flat config (Pitfall 8) | HIGH | eslint.config.mjs, not .eslintrc.json |
| Phase 1: Scaffolding | Tailwind v4 config (Pitfall 2) | CRITICAL | @theme in CSS, no tailwind.config.ts |
| Phase 2: Schema + Seed | Seed non-idempotency | MODERATE | Use upsert; include non-zero amounts |
| Phase 2: Schema + Seed | Period race condition | MODERATE | Use upsert for period creation |
| Phase 3: Utilities | toCents() float contamination (Pitfall 6) | HIGH | Parse string without float; edge case tests |
| Phase 3: Utilities | BigInt serialization (Pitfall 4) | CRITICAL | Test with non-zero values |
| Phase 7: Dashboard | Sequential queries | MODERATE | Promise.all(); loading.tsx |
| Phase 10: Period Close | Partial failure (Pitfall 5) | CRITICAL | $transaction with timeout; idempotency |

## Phase-Specific Warnings (v3.0 Auth + Cloud)

| Phase | Likely Pitfall | Severity | Mitigation |
|-------|---------------|----------|------------|
| v3.0 Phase 1: Auth foundation | Middleware-only auth (Pitfall 17) | CRITICAL | requireAuth() in DAL; never middleware-only |
| v3.0 Phase 1: Auth foundation | Session userId missing (Pitfall 20) | CRITICAL | Configure jwt + session callbacks; TypeScript types |
| v3.0 Phase 1: Auth foundation | TOTP secret plaintext (Pitfall 21) | CRITICAL | AES-256-GCM encrypt; separate key from AUTH_SECRET |
| v3.0 Phase 1: Auth foundation | Invite token guessable (Pitfall 23) | HIGH | 256-bit entropy; expiry; single-use; email-locked |
| v3.0 Phase 1: Auth foundation | Weak password hashing (Pitfall 27) | HIGH | bcryptjs cost 12; confirm timing in preview deploy |
| v3.0 Phase 1: Auth foundation | Session fixation (Pitfall 28) | HIGH | JWT strategy; new token per login |
| v3.0 Phase 2: Schema migration | userId FK destroys data (Pitfall 18) | CRITICAL | Three-step expand-contract; staging test first |
| v3.0 Phase 2: Rate limiting | TOTP brute force (Pitfall 22) | CRITICAL | Redis-backed limiter; per-user counter; account lock |
| v3.0 Phase 3: Data isolation | Missing userId in queries (Pitfall 19) | CRITICAL | Typed DB wrapper; cross-user integration tests |
| v3.0 Phase 3: Data isolation | Cache leaks user data (Pitfall 24) | HIGH | noStore() in every user-data Server Component |
| v3.0 Phase 4: Vercel deploy | Wrong connection string (Pitfall 25) | HIGH | Two DATABASE_URL vars in Vercel dashboard |
| v3.0 Phase 4: Vercel deploy | CSP breaks hydration (Pitfall 26) | HIGH | Per-request nonce; report-only first |

---

## Sources

### v1.0 Foundation Sources
- [Next.js 16 Release Blog](https://nextjs.org/blog/next-16) -- HIGH confidence
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16) -- HIGH confidence
- [Prisma 7 Upgrade Guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7) -- HIGH confidence
- [Tailwind CSS v4 Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide) -- HIGH confidence

### v2.0 Glyph Finance Sources
- [Tailwind v4 @theme variables docs](https://tailwindcss.com/docs/theme) -- HIGH confidence
- [Tailwind v4 next/font integration discussion](https://github.com/tailwindlabs/tailwindcss/discussions/15267) -- HIGH confidence (community-verified pattern)
- [How to use custom fonts in Next.js 15 + Tailwind 4](https://www.owolf.com/blog/how-to-use-custom-fonts-in-a-nextjs-15-tailwind-4-app) -- MEDIUM confidence
- [Google Fonts: IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) -- HIGH confidence (confirmed non-variable, static weights only)
- [Fontshare: Satoshi](https://www.fontshare.com/fonts/satoshi) -- HIGH confidence (confirmed local file source)
- [Recharts GitHub issue #2169: CSS classes vs inline styles](https://github.com/recharts/recharts/issues/2169) -- HIGH confidence (CSS variable limitation confirmed)
- [Recharts latest version 3.2.0](https://www.npmjs.com/package/recharts) -- HIGH confidence
- [MDN: aria-label](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-label) -- HIGH confidence
- [WCAG 2.1 Technique ARIA6: aria-label for objects](https://www.w3.org/TR/WCAG20-TECHS/ARIA6.html) -- HIGH confidence
- [Tailwind v4 token rename breaking changes](https://github.com/tailwindlabs/tailwindcss/discussions/16517) -- MEDIUM confidence (community discussion)
- [MDN: Using CSS transitions](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_transitions/Using_CSS_transitions) -- HIGH confidence
- [Next.js font loading pitfalls 2026](https://thelinuxcode.com/fonts-in-nextjs-2026-nextfont-patterns-performance-and-production-pitfalls/) -- LOW confidence (single source)
- Direct codebase analysis: `src/app/globals.css`, `src/app/layout.tsx`, `src/lib/constants.ts`, chart components, test files -- HIGH confidence

### v3.0 Auth + Cloud Deploy Sources
- [CVE-2025-29927: Next.js Middleware Authorization Bypass (ProjectDiscovery)](https://projectdiscovery.io/blog/nextjs-middleware-authorization-bypass) -- HIGH confidence
- [CVE-2025-29927 Detail (NVD NIST)](https://nvd.nist.gov/vuln/detail/CVE-2025-29927) -- HIGH confidence
- [Next.js Security: Data Security Guide](https://nextjs.org/docs/app/guides/data-security) -- HIGH confidence
- [How to Think About Security in Next.js (Vercel official)](https://nextjs.org/blog/security-nextjs-server-components-actions) -- HIGH confidence
- [Next.js 16: proxy.ts rename (official docs)](https://nextjs.org/docs/messages/middleware-to-proxy) -- HIGH confidence
- [Auth.js: Extending the Session](https://authjs.dev/guides/extending-the-session) -- HIGH confidence
- [Auth.js: Migrating to v5](https://authjs.dev/getting-started/migrating-to-v5) -- HIGH confidence
- [Prisma: Deploy to Vercel](https://www.prisma.io/docs/orm/prisma-client/deployment/serverless/deploy-to-vercel) -- HIGH confidence
- [Prisma: Connection pooling in Prisma Postgres](https://www.prisma.io/docs/postgres/database/connection-pooling) -- HIGH confidence
- [Prisma: Customizing migrations](https://www.prisma.io/docs/orm/prisma-migrate/workflows/customizing-migrations) -- HIGH confidence
- [Prisma GitHub discussion: adding required column without default](https://github.com/prisma/prisma/discussions/20607) -- HIGH confidence
- [Next.js: Content Security Policy Guide](https://nextjs.org/docs/app/guides/content-security-policy) -- HIGH confidence
- [Next.js GitHub: CSP not applied in production without nonce](https://github.com/vercel/next.js/discussions/80997) -- MEDIUM confidence
- [NextAuth brute force discussion](https://github.com/nextauthjs/next-auth/discussions/3479) -- MEDIUM confidence
- [Auth.js: Session callback not populating userId (issue)](https://github.com/nextauthjs/next-auth/issues/8451) -- HIGH confidence (confirmed pattern)
- [Password Hashing Guide 2025: Argon2 vs Bcrypt](https://guptadeepak.com/the-complete-guide-to-password-hashing-argon2-vs-bcrypt-vs-scrypt-vs-pbkdf2-2026/) -- MEDIUM confidence
- [Next.js Defaults Can Leak Data (Medium)](https://medium.com/@mzajbe/next-js-defaults-can-leak-your-data-25499fc0249b) -- MEDIUM confidence
- [Vercel KV / Upstash Ratelimit docs](https://vercel.com/kb/guide/connection-pooling-with-functions) -- HIGH confidence
- [OWASP: Session Fixation](https://owasp.org/www-community/attacks/Session_fixation) -- HIGH confidence

---
*Pitfalls research for: Centik personal finance app — v3.0 Auth + Cloud Deploy*
*Original research: 2026-04-04 | v2.0 update: 2026-04-06 | v3.0 update: 2026-04-15*
