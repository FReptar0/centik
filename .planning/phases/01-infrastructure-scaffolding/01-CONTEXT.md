# Phase 1: Infrastructure + Scaffolding - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Reconcile the actual installed versions (Next.js 16.2.2, React 19.2.4, Tailwind CSS v4, ESLint 9 flat config) with CLAUDE.md documentation patterns. Set up the full development toolchain: Docker Compose for PostgreSQL (dev + test), Vitest, Playwright, environment files, and validate that `build`, `lint`, and `test` all pass with zero errors. Also validate Recharts + React 19 compatibility with a minimal test chart.

</domain>

<decisions>
## Implementation Decisions

### Directory restructure
- Move from `app/` (root-level) to `src/app/` as specified in CLAUDE.md
- Update tsconfig `paths` to map `@/*` to `./src/*` (imports: `@/lib/utils`, `@/components/ui`)
- Move `app/globals.css`, `app/layout.tsx`, `app/page.tsx` into `src/app/`
- Create directory skeleton: `src/components/`, `src/lib/`, `src/types/`

### Package manager
- **Keep npm** (user preference) — do NOT migrate to pnpm despite CLAUDE.md specifying pnpm
- All documentation commands should use `npm run` instead of `pnpm`
- Delete `package-lock.json` only if migrating; since keeping npm, keep it as-is
- Note: CLAUDE.md references (`pnpm build`, `pnpm test`, etc.) need adaptation in phase plans — use `npm run` equivalents

### Tailwind v4 configuration
- Migrate all STYLE_GUIDE.md design tokens to CSS `@theme` block in `globals.css` — no `tailwind.config.ts`
- Use flat CSS variable naming: `--color-bg-primary`, `--color-text-secondary`, `--color-accent`, etc.
- Generated Tailwind classes will be: `bg-bg-primary`, `text-text-secondary`, `text-accent`, etc.
- Dark mode: static dark values hard-coded in `@theme` — no `prefers-color-scheme` media query, no dark: variants
- Remove the default light/dark `:root` variables from scaffolded `globals.css`

### Font loading
- Use `next/font/google` to load DM Sans (weights 400, 500, 600, 700)
- Zero-layout-shift, self-hosted by Next.js — no external Google Fonts CDN request
- Apply via CSS variable referenced in `@theme` block

### Recharts validation
- Install Recharts in Phase 1 and create a minimal bar chart test page (e.g., `/test-chart`)
- If Recharts renders correctly with React 19.2.4: keep it, remove test page
- If Recharts fails (blank render, issue #6857): switch to **nivo** as fallback charting library
- Install `react-is@^19.2.4` as explicit dependency (known workaround for Recharts + React 19)
- This validation MUST complete before Phase 7 (Dashboard) begins

### Environment files
- Create `.env`, `.env.example`, `.env.test` in Phase 1
- `.env.example` has DATABASE_URL placeholder only
- `.env` and `.env.test` have actual connection strings for dev and test DBs
- Both `.env` and `.env.test` are gitignored

### Claude's Discretion
- ESLint flat config rule additions beyond the default `eslint-config-next`
- Vitest and Playwright configuration details
- Docker Compose exact setup (ports, volumes, tmpfs)
- Prettier configuration specifics
- Which default scaffolded files to keep vs remove

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `next.config.ts`: Empty config ready for customization
- `tsconfig.json`: Strict mode already enabled, path alias configured (needs update to `./src/*`)
- `eslint.config.mjs`: ESLint 9 flat config with next/core-web-vitals and typescript presets
- `postcss.config.mjs`: Already configured for `@tailwindcss/postcss`

### Established Patterns
- Tailwind v4 CSS-first approach already scaffolded (`@import "tailwindcss"`, `@theme inline`)
- ESLint 9 flat config with `defineConfig` and `globalIgnores` pattern
- PostCSS pipeline via `@tailwindcss/postcss` (not the old `tailwindcss` CLI)

### Integration Points
- `globals.css`: Replace default light/dark variables with full STYLE_GUIDE.md dark palette via `@theme`
- `layout.tsx`: Replace Geist font with DM Sans via `next/font/google`
- `page.tsx`: Replace default Next.js landing with placeholder or Recharts validation chart
- `package.json`: Add all project dependencies (Prisma, Zod, Recharts, lucide-react, etc.)

### Version Mismatches to Reconcile
- Next.js 16.2.2 installed (CLAUDE.md says "14+") — keep 16, adapt patterns
- Tailwind v4 installed (STYLE_GUIDE.md assumes v3 config) — use CSS `@theme`
- ESLint 9 with flat config (CLAUDE.md doesn't specify version) — already correct
- No Prisma installed yet — will be Prisma 7.x (breaking changes from v5/v6)

</code_context>

<specifics>
## Specific Ideas

- npm instead of pnpm is a firm preference — adapt all documentation references
- Recharts validation should be a quick pass/fail gate, not a complex test — just render a bar chart with 3 data points
- The nivo fallback was chosen specifically for its dark theme support and SSR compatibility

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-infrastructure-scaffolding*
*Context gathered: 2026-04-04*
