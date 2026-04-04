# Technology Stack

**Project:** Centik (MisFinanzas)
**Researched:** 2026-04-04
**Overall Confidence:** HIGH

---

## Critical Version Discrepancy

The CLAUDE.md specifies "Next.js 14+" but the scaffolded project already runs **Next.js 16.2.2** with **React 19.2.4** and **Tailwind CSS v4**. This research reflects the *actual installed versions*, not what CLAUDE.md describes. The CLAUDE.md must be updated to reflect the real stack before development begins.

Key breaking changes from the described stack:
- **Next.js 16:** `middleware.ts` is now `proxy.ts` (Node.js runtime, not Edge)
- **Next.js 16:** `next lint` command removed; use `eslint` directly
- **Next.js 16:** `"use cache"` directive replaces previous caching model
- **Tailwind v4:** CSS-first configuration via `@theme` directive; no `tailwind.config.ts`
- **Prisma 7:** `prisma.config.ts` replaces `package.json` seed config and `schema.prisma` datasource URL
- **Prisma 7:** Automatic seeding after `migrate dev` removed; run `prisma db seed` explicitly
- **Zod 4:** 14x faster parsing, 57% smaller bundle; new API surface with `@zod/mini`
- **ESLint 9+:** Flat config only; `eslint-config-next` uses flat config format

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | 16.2.2 (installed) | Full-stack React framework | Already scaffolded. App Router with stable Turbopack, cache components, proxy.ts. This is the version in package.json. | HIGH |
| React | 19.2.4 (installed) | UI library | Already installed. Concurrent rendering, Server Components, Server Actions are stable. | HIGH |
| React DOM | 19.2.4 (installed) | React DOM renderer | Matches React version. | HIGH |
| TypeScript | ^5 (installed) | Type safety | Already installed. Strict mode enabled in tsconfig.json. Use latest 5.x. | HIGH |

### Database & ORM

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| PostgreSQL | 16-alpine | Relational database | Mature, excellent BigInt support, JSON aggregation, Docker image is lightweight. 16 is current LTS. | HIGH |
| Prisma ORM | ^7.6 | Database ORM + migrations | v7 rewrote query engine in TypeScript (faster, no Rust binary). BigInt precision fix in v7.3+. `prisma.config.ts` for seed/migration config. | HIGH |
| @prisma/client | ^7.6 | Generated database client | Paired with prisma. 98% fewer types to evaluate, 70% faster type checking. | HIGH |

**Prisma 7 Breaking Changes (vs docs that assume v5/v6):**
1. Database URL moves from `schema.prisma` to `prisma.config.ts`
2. No automatic `prisma generate` after `migrate dev` -- run it explicitly
3. No automatic seeding after `migrate dev` -- run `prisma db seed` explicitly
4. Environment variables not loaded by default -- use `dotenv` import in `prisma.config.ts`
5. Seed script configured in `prisma.config.ts`, not `package.json`

### Styling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | ^4 (installed) | Utility-first CSS | Already installed. v4 is CSS-first: `@import "tailwindcss"` + `@theme` directive. 5x faster full builds, 100x faster incremental. | HIGH |
| @tailwindcss/postcss | ^4 (installed) | PostCSS plugin | Already installed. Required for v4 integration. | HIGH |

**Tailwind v4 Breaking Changes (vs v3-era docs):**
1. No `tailwind.config.ts` -- configure via CSS `@theme` directive
2. No `@tailwind base/components/utilities` -- use `@import "tailwindcss"`
3. Custom colors defined via `@theme { --color-*: ... }` in CSS
4. Dark mode via `@custom-variant dark` in CSS, not JS config
5. Automatic content detection -- no `content` array needed
6. `tailwind-merge` v3.x required (v2.x is for Tailwind v3)

### Charts

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Recharts | ^3.8 | Chart components | Declarative React charts. v3 removed external deps (react-smooth, recharts-scale). CLAUDE.md specifies Recharts and the app needs bar, area, donut charts -- all well-supported. | MEDIUM |
| react-is | ^19.2.4 | Recharts React 19 compat | **Required workaround.** Recharts internally depends on `react-is` and needs the version matching your React version. Without this, charts render as blank. | MEDIUM |

**Recharts + React 19 Risk:**
There is an open issue (#6857) where Recharts 3.x charts render blank on React 19.2.3+. The workaround is installing `react-is` at the same version as React. This needs validation during Phase 1 scaffolding with a simple test chart. If Recharts fails, fall back to **nivo** (SSR-friendly, React 19 compatible) or raw **Chart.js** via `react-chartjs-2`.

### Validation

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Zod | ^4.3 | Schema validation | v4 is 14x faster string parsing, 57% smaller bundle. New `@zod/mini` available but not needed here -- standard `zod` is fine for server-heavy app. Breaking API changes from v3 are minimal for our use case (schemas, parse, safeParse). | HIGH |

### Testing

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vitest | ^4.1 | Unit + integration tests | v4 stable. Browser Mode graduated from beta. Vite-native, 17M weekly downloads. Standard for modern React testing. | HIGH |
| @vitejs/plugin-react | ^4 | React support for Vitest | Required for JSX transform in test environment. | HIGH |
| vite-tsconfig-paths | ^5 | Path alias support | Resolves `@/` imports in Vitest matching tsconfig paths. | HIGH |
| @testing-library/react | ^16.3 | Component testing | v16.3+ has React 19 compatibility fixes. Recommended by React team. | HIGH |
| @testing-library/dom | ^10 | DOM testing utilities | Peer dependency of @testing-library/react since v16. | HIGH |
| @testing-library/user-event | ^14 | User interaction simulation | Simulates real user events (click, type, etc.) for component tests. | HIGH |
| Playwright | ^1.59 | E2E tests | Latest stable. Chrome for Testing, timeline HTML report. Industry standard for E2E. | HIGH |
| jsdom | latest | DOM environment for Vitest | Lightweight DOM simulation for unit tests. | HIGH |

### Icons

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| lucide-react | ^1.7 | Icon library | Latest release (1.7.0). 1500+ icons, tree-shakable, React 19 compatible. CLAUDE.md mandates Lucide exclusively. | HIGH |

### UI Utilities

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| clsx | ^2.1 | Conditional class names | Tiny (228B), fast, standard pattern for conditional classes. | HIGH |
| tailwind-merge | ^3.5 | Tailwind class deduplication | v3.x supports Tailwind v4. Resolves conflicting utility classes (e.g., `px-2 px-4` -> `px-4`). | HIGH |

### Notifications

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| sonner | ^2.0 | Toast notifications | 2.0.7 is latest. Zero-config, no context/hooks needed. `<Toaster />` + `toast()`. 30M+ weekly downloads. CLAUDE.md suggests "sonner or similar" -- sonner is the clear winner. | HIGH |

### Typography

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| next/font/google | (built-in) | Font optimization | Built into Next.js. Self-hosts DM Sans, eliminates external requests. No additional package needed. | HIGH |

### Code Quality

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| ESLint | ^9 (installed) | Linting | Already installed. Flat config format. Next.js 16 removed `next lint` -- use `eslint` directly. | HIGH |
| eslint-config-next | 16.2.2 (installed) | Next.js ESLint rules | Already installed. Provides `core-web-vitals` and `typescript` configs in flat format. | HIGH |
| eslint-config-prettier | ^10 | Disable conflicting rules | Disables ESLint rules that conflict with Prettier. Import as `eslint-config-prettier/flat`. | HIGH |
| Prettier | ^3.5 | Code formatting | Standard formatter. Configure via `.prettierrc`. | HIGH |

### Development Dependencies

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| tsx | ^4 | TypeScript runner | Runs `prisma/seed.ts` without compilation. Uses esbuild, fast, no ESM config needed. | HIGH |
| @next/env | (built-in) | Env var loading for tests | Load `.env.test` in Vitest setup via `loadEnvConfig()`. Built into Next.js package. | HIGH |
| dotenv | ^16 | Env vars in Prisma config | Prisma 7 requires explicit env loading in `prisma.config.ts`. | HIGH |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| ORM | Prisma 7 | Drizzle ORM | CLAUDE.md mandates Prisma. Drizzle is lighter but Prisma has better migration tooling and the project spec is built around Prisma patterns. |
| Charts | Recharts 3 | nivo | Recharts is simpler API for the 3 chart types needed (bar, area, donut). nivo is more verbose. However, nivo is the fallback if Recharts + React 19 issues persist. |
| Charts | Recharts 3 | Chart.js (react-chartjs-2) | Canvas-based, not SSR-friendly. Recharts is SVG-based, better for Server Component architecture. |
| Toast | sonner | react-hot-toast | sonner has simpler API (no provider), better default styling, larger community (30M+ weekly downloads vs 3M). |
| Validation | Zod 4 | Valibot | CLAUDE.md mandates Zod. Valibot is smaller but Zod 4 closed the size gap significantly with 57% reduction. |
| Icons | lucide-react | heroicons | CLAUDE.md mandates Lucide. Larger icon set (1500+ vs 300+), dynamic name-based rendering supported. |
| Testing | Vitest 4 | Jest 30 | Vitest is Vite-native (same transform pipeline as dev), faster, ESM-first. Jest 30 added browser-native testing but Vitest has been there longer and has better DX. |
| CSS | Tailwind v4 | CSS Modules | Already installed. Utility-first eliminates context switching. v4 is faster and simpler to configure. |
| State Mgmt | React state + Server Components | Zustand | CLAUDE.md explicitly prohibits client-side state libraries. Server Components + React state is sufficient for this data-heavy, single-user app. |

---

## Installation

```bash
# Core dependencies (add to existing package.json)
pnpm add prisma@^7.6 @prisma/client@^7.6 zod@^4.3 recharts@^3.8 react-is@^19.2 lucide-react@^1.7 clsx@^2.1 tailwind-merge@^3.5 sonner@^2.0

# Dev dependencies
pnpm add -D vitest@^4.1 @vitejs/plugin-react@^4 vite-tsconfig-paths@^5 jsdom @testing-library/react@^16.3 @testing-library/dom@^10 @testing-library/user-event@^14 @playwright/test@^1.59 prettier@^3.5 eslint-config-prettier@^10 tsx@^4 dotenv@^16
```

### Post-install Setup

```bash
# Initialize Prisma (creates prisma/schema.prisma and prisma.config.ts)
pnpm prisma init

# Install Playwright browsers
pnpm exec playwright install --with-deps chromium
```

### pnpm overrides (if Recharts has peer dep conflicts)

Add to `package.json` if needed:
```json
{
  "pnpm": {
    "overrides": {
      "react-is": "^19.2.4"
    }
  }
}
```

---

## Configuration Files

### prisma.config.ts (Prisma 7 -- NEW)

```typescript
import 'dotenv/config'
import path from 'node:path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  migrate: {
    path: path.join(__dirname, 'prisma', 'migrations'),
  },
  seed: 'tsx prisma/seed.ts',
  datasource: {
    url: process.env.DATABASE_URL!,
  },
})
```

### eslint.config.mjs (ESLint 9 Flat Config -- NEW)

```javascript
import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import prettier from 'eslint-config-prettier/flat'

export default defineConfig([
  ...nextVitals,
  prettier,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
])
```

### vitest.config.ts

```typescript
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['tests/integration/**'],
    setupFiles: ['tests/setup.ts'],
  },
})
```

### vitest.integration.config.ts

```typescript
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    env: {
      DATABASE_URL:
        'postgresql://misfinanzas:misfinanzas_test@localhost:5433/misfinanzas_test',
    },
  },
})
```

### Tailwind v4 CSS Configuration (replaces tailwind.config.ts)

In `src/app/globals.css`:
```css
@import "tailwindcss";

@theme {
  /* Custom color palette -- replaces tailwind.config.ts extend.colors */
  --color-bg-primary: #0a0f1a;
  --color-bg-card: #111827;
  --color-border: #1e293b;
  --color-accent: #22d3ee;
  --color-income: #34d399;
  --color-expense: #f87171;
  --color-warning: #fb923c;
  --color-info: #a78bfa;

  /* Category colors */
  --color-cat-comida: #fb923c;
  --color-cat-servicios: #60a5fa;
  --color-cat-entretenimiento: #a78bfa;
  --color-cat-suscripciones: #f472b6;
  --color-cat-transporte: #fbbf24;
  --color-cat-otros: #94a3b8;
  --color-cat-empleo: #34d399;
  --color-cat-freelance: #22d3ee;

  /* Font */
  --font-sans: 'DM Sans', sans-serif;

  /* Border radius */
  --radius-card: 12px;
  --radius-input: 8px;
}
```

### package.json scripts (updated for Next.js 16 + Prisma 7)

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format:check": "prettier --check .",
    "format": "prettier --write .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "quality": "pnpm build && pnpm lint && pnpm format:check && pnpm test && pnpm test:integration",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:seed": "prisma db seed",
    "db:reset": "prisma migrate reset",
    "db:studio": "prisma studio"
  }
}
```

---

## Version Compatibility Matrix

| Package | Version | React 19 | Next.js 16 | Tailwind v4 | Notes |
|---------|---------|----------|------------|-------------|-------|
| recharts | 3.8.x | Needs react-is workaround | Yes | N/A | Validate in Phase 1 |
| prisma | 7.6.x | N/A | Yes | N/A | New config format |
| zod | 4.3.x | N/A | Yes | N/A | API compatible with v3 patterns |
| vitest | 4.1.x | Yes | Yes (with setup) | N/A | Use @next/env for env loading |
| playwright | 1.59.x | N/A | Yes | N/A | Standard E2E |
| lucide-react | 1.7.x | Yes | Yes | N/A | Tree-shakable |
| tailwind-merge | 3.5.x | N/A | N/A | Yes (required v3+) | v2.x is Tailwind v3 only |
| sonner | 2.0.x | Yes | Yes | N/A | No known issues |
| @testing-library/react | 16.3.x | Yes (v19 fixes) | Yes | N/A | Needs @testing-library/dom peer |
| eslint-config-next | 16.2.2 | N/A | Yes (flat config) | N/A | No next lint command |

---

## What NOT to Install

| Package | Why Not |
|---------|---------|
| `tailwind.config.ts` (file) | Tailwind v4 uses CSS-first `@theme` config. No JS config file. |
| `@tailwindcss/forms`, `@tailwindcss/typography` | v4 plugins ecosystem has changed. Build custom form styles with utility classes. |
| `next-themes` | Single-theme app (dark only). No theme toggle needed. |
| `zustand`, `jotai`, `redux` | CLAUDE.md prohibits client state libs. Server Components + React state. |
| `@auth/core`, `next-auth`, `clerk` | No auth in MVP. |
| `decimal.js`, `big.js` | Money is BigInt centavos. No decimal libraries needed. |
| `axios` | Use native `fetch()`. Next.js extends fetch with caching. |
| `moment`, `dayjs` | Use native `Intl.DateTimeFormat` and `Date`. Simple date operations only. |
| `@types/react-is` | Types are included in `@types/react`. |
| `eslint-plugin-prettier` | Use `eslint-config-prettier` instead. Plugin approach is deprecated pattern. |
| `jest` | Vitest replaces Jest entirely. |
| `webpack` | Next.js 16 uses Turbopack by default. |

---

## Sources

- [Next.js 16 Release Blog](https://nextjs.org/blog/next-16) -- HIGH confidence
- [Next.js 16.1 Release](https://nextjs.org/blog/next-16-1) -- HIGH confidence
- [Next.js 16 middleware to proxy migration](https://nextjs.org/docs/messages/middleware-to-proxy) -- HIGH confidence
- [Next.js Vitest Testing Guide](https://nextjs.org/docs/app/guides/testing/vitest) -- HIGH confidence
- [Prisma 7 Release Announcement](https://www.prisma.io/blog/announcing-prisma-orm-7-0-0) -- HIGH confidence
- [Prisma 7 Upgrade Guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7) -- HIGH confidence
- [Prisma 7.3.0 BigInt JSON Fix](https://www.prisma.io/blog/prisma-orm-7-3-0) -- HIGH confidence
- [Prisma Config Reference](https://www.prisma.io/docs/orm/reference/prisma-config-reference) -- HIGH confidence
- [Prisma Seeding Docs](https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding) -- HIGH confidence
- [Tailwind CSS v4.0 Release](https://tailwindcss.com/blog/tailwindcss-v4) -- HIGH confidence
- [Tailwind CSS v4 Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide) -- HIGH confidence
- [Tailwind CSS v4 Dark Mode](https://tailwindcss.com/docs/dark-mode) -- HIGH confidence
- [Zod v4 Release Notes](https://zod.dev/v4) -- HIGH confidence
- [Recharts 3.0 Migration Guide](https://github.com/recharts/recharts/wiki/3.0-migration-guide) -- HIGH confidence
- [Recharts React 19 Issue #6857](https://github.com/recharts/recharts/issues/6857) -- MEDIUM confidence (open issue)
- [Vitest 4.0 Release](https://vitest.dev/blog/vitest-4) -- HIGH confidence
- [Playwright Release Notes](https://playwright.dev/docs/release-notes) -- HIGH confidence
- [ESLint Config Next.js 16](https://nextjs.org/docs/app/api-reference/config/eslint) -- HIGH confidence
- [Next.js "use cache" Directive](https://nextjs.org/docs/app/api-reference/directives/use-cache) -- HIGH confidence
- [Sonner npm](https://www.npmjs.com/package/sonner) -- HIGH confidence
- [tailwind-merge npm](https://www.npmjs.com/package/tailwind-merge) -- HIGH confidence
- [lucide-react npm](https://www.npmjs.com/package/lucide-react) -- HIGH confidence
