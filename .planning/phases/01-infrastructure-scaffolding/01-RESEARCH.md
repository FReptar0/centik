# Phase 1: Infrastructure + Scaffolding - Research

**Researched:** 2026-04-04
**Domain:** Next.js 16 + Tailwind v4 + Prisma 7 + Vitest + ESLint 9 project scaffolding
**Confidence:** MEDIUM (multiple version-specific integration risks discovered)

## Summary

Phase 1 must reconcile CLAUDE.md documentation patterns with the actually installed versions: Next.js 16.2.2, React 19.2.4, Tailwind CSS v4, and ESLint 9 flat config. These are all major version jumps from what CLAUDE.md documents (Next 14+, Tailwind v3 config, pnpm). The most critical findings are: (1) Next.js 16 removes `next lint` entirely and uses Turbopack by default, (2) Tailwind v4 replaces `tailwind.config.ts` with CSS `@theme` blocks, (3) Prisma 7 requires driver adapters, a new `prisma.config.ts` file, and has a known Turbopack compatibility issue with the new `prisma-client` generator provider, and (4) Recharts has a known React 19 blank chart issue requiring an explicit `react-is` dependency override.

The project uses **npm** (not pnpm), so all commands and overrides must use npm syntax. The directory structure needs restructuring from `app/` to `src/app/` with `@/*` mapped to `./src/*`.

**Primary recommendation:** Use `prisma-client-js` (not the new `prisma-client`) as the generator provider with a custom output directory to avoid Turbopack resolution failures, and validate the Recharts + React 19 combination early with a test chart page.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Move from `app/` (root-level) to `src/app/` as specified in CLAUDE.md
- Update tsconfig `paths` to map `@/*` to `./src/*` (imports: `@/lib/utils`, `@/components/ui`)
- Move `app/globals.css`, `app/layout.tsx`, `app/page.tsx` into `src/app/`
- Create directory skeleton: `src/components/`, `src/lib/`, `src/types/`
- **Keep npm** (user preference) -- do NOT migrate to pnpm despite CLAUDE.md specifying pnpm
- All documentation commands should use `npm run` instead of `pnpm`
- Migrate all STYLE_GUIDE.md design tokens to CSS `@theme` block in `globals.css` -- no `tailwind.config.ts`
- Use flat CSS variable naming: `--color-bg-primary`, `--color-text-secondary`, `--color-accent`, etc.
- Dark mode: static dark values hard-coded in `@theme` -- no `prefers-color-scheme` media query, no dark: variants
- Remove the default light/dark `:root` variables from scaffolded `globals.css`
- Use `next/font/google` to load DM Sans (weights 400, 500, 600, 700)
- Apply via CSS variable referenced in `@theme` block
- Install Recharts in Phase 1 and create a minimal bar chart test page (e.g., `/test-chart`)
- If Recharts fails: switch to **nivo** as fallback charting library
- Install `react-is@^19.2.4` as explicit dependency (known workaround for Recharts + React 19)
- Create `.env`, `.env.example`, `.env.test` in Phase 1

### Claude's Discretion
- ESLint flat config rule additions beyond the default `eslint-config-next`
- Vitest and Playwright configuration details
- Docker Compose exact setup (ports, volumes, tmpfs)
- Prettier configuration specifics
- Which default scaffolded files to keep vs remove

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | Project scaffolded with Next.js 16, TypeScript strict, Tailwind v4, Prisma 7, npm | Standard Stack section covers all package versions and setup patterns; Prisma 7 Turbopack workaround documented |
| INFRA-02 | Docker Compose for dev PostgreSQL (port 5432) and test PostgreSQL (port 5433, tmpfs) | Docker Compose patterns from CLAUDE.md are version-independent; documented in Architecture Patterns |
| INFRA-03 | ESLint flat config + Prettier configured with zero warnings | ESLint 9 flat config pattern documented with eslint-config-prettier/flat integration |
| INFRA-04 | Vitest configured for unit tests with coverage reporting | Official Next.js 16 Vitest guide documented with exact config file |
| INFRA-05 | Playwright configured for E2E tests | Playwright setup from Next.js docs documented |
| INFRA-06 | `npm run build` passes with zero errors and zero warnings | Breaking changes catalogued (async APIs, Turbopack default, next lint removed) |
| INFRA-07 | Environment files (.env, .env.example, .env.test) configured | Connection string patterns documented for dev and test DBs |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.2 | Framework (App Router, Turbopack) | Already installed; Turbopack is default bundler |
| react | 19.2.4 | UI library | Already installed; includes View Transitions, useEffectEvent |
| react-dom | 19.2.4 | React DOM renderer | Already installed |
| typescript | ^5 | Type safety | Already installed; strict mode enabled |
| tailwindcss | ^4 | Utility-first CSS (CSS @theme config) | Already installed; v4 uses CSS-first configuration |
| @tailwindcss/postcss | ^4 | PostCSS plugin for Tailwind v4 | Already installed |
| prisma | ^7 (latest) | ORM CLI + migrations | NEW -- Prisma 7 requires driver adapters and prisma.config.ts |
| @prisma/client | ^7 (latest) | Generated database client | NEW -- import path changes with custom output |
| @prisma/adapter-pg | latest | PostgreSQL driver adapter | NEW -- required in Prisma 7 (replaces built-in engine) |
| pg | latest | PostgreSQL client for Node.js | NEW -- underlying driver for adapter-pg |
| zod | latest | Schema validation | NEW -- install now, used heavily starting Phase 3 |
| recharts | ^3.8 | Charts library | NEW -- validate with React 19 in this phase |
| react-is | ^19.2.4 | React type checking | NEW -- explicit dep to fix Recharts + React 19 blank chart |
| lucide-react | latest | Icon library | NEW -- install now, used in Layout phase |

### Supporting (Dev Dependencies)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | latest | Unit test runner | All unit tests |
| @vitejs/plugin-react | latest | React plugin for Vitest | JSX transform in tests |
| vite-tsconfig-paths | latest | Path alias resolution | Makes @/* imports work in Vitest |
| jsdom | latest | DOM environment for tests | Component tests |
| @testing-library/react | latest | React component testing utils | Component tests |
| @testing-library/dom | latest | DOM testing utils | Required peer of @testing-library/react |
| playwright | latest | E2E test runner | E2E tests |
| @playwright/test | latest | Playwright test framework | E2E tests |
| prettier | latest | Code formatter | Format checking |
| eslint-config-prettier | latest | Disables ESLint rules that conflict with Prettier | ESLint + Prettier integration |
| @types/pg | latest | TypeScript types for pg | Prisma adapter typing |
| tsx | latest | TypeScript execution | Running seed scripts |
| dotenv | latest | Environment variable loading | Prisma config loading |
| clsx | latest | Conditional class names | cn() utility |
| tailwind-merge | latest | Tailwind class deduplication | cn() utility |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| recharts | @nivo/bar, @nivo/line | Nivo has better SSR + dark theme; heavier bundle; only if Recharts fails React 19 validation |
| prisma-client (new) | prisma-client-js (legacy) | Legacy provider avoids Turbopack resolution bug; identical runtime behavior |
| prettier standalone | eslint-plugin-prettier | Plugin runs Prettier inside ESLint; slower but simpler; standalone is recommended by Prettier team |

**Installation:**
```bash
# Core dependencies
npm install @prisma/client @prisma/adapter-pg pg zod recharts react-is lucide-react clsx tailwind-merge dotenv

# Dev dependencies
npm install -D prisma @types/pg tsx vitest @vitejs/plugin-react vite-tsconfig-paths jsdom @testing-library/react @testing-library/dom @playwright/test prettier eslint-config-prettier
```

## Architecture Patterns

### Recommended Project Structure (Phase 1 output)
```
centik/
├── prisma/
│   ├── schema.prisma          # DB schema with prisma-client-js generator
│   └── seed.ts                # Seed script (Phase 2, but file created here)
├── prisma.config.ts           # NEW in Prisma 7 -- CLI configuration
├── src/
│   ├── app/
│   │   ├── globals.css        # Tailwind @theme with full STYLE_GUIDE palette
│   │   ├── layout.tsx         # Root layout with DM Sans font
│   │   ├── page.tsx           # Placeholder home page
│   │   └── test-chart/
│   │       └── page.tsx       # Recharts validation page (temporary)
│   ├── components/
│   │   └── ui/                # Empty, ready for Phase 4
│   ├── lib/
│   │   └── prisma.ts          # PrismaClient singleton with PrismaPg adapter
│   └── types/
│       └── index.ts           # Empty, ready for Phase 3
├── tests/
│   └── setup.ts               # Vitest global setup
├── e2e/                       # Playwright tests directory
├── generated/
│   └── prisma/                # Prisma generated client (gitignored)
├── docker-compose.yml         # Dev PostgreSQL
├── docker-compose.test.yml    # Test PostgreSQL (tmpfs)
├── vitest.config.mts          # Unit test config
├── playwright.config.ts       # E2E test config
├── eslint.config.mjs          # ESLint 9 flat config (already exists)
├── .prettierrc                # Prettier config
├── .prettierignore            # Prettier ignore patterns
├── .env                       # Dev DB connection (gitignored)
├── .env.example               # Placeholder keys
├── .env.test                  # Test DB connection (gitignored)
├── postcss.config.mjs         # Already exists, correct
├── next.config.ts             # Minimal config
├── tsconfig.json              # Updated paths: @/* -> ./src/*
└── package.json               # npm scripts, overrides for react-is
```

### Pattern 1: Tailwind v4 @theme Configuration
**What:** All design tokens defined in CSS using `@theme` directive instead of JavaScript config
**When to use:** All custom colors, fonts, radii, shadows
**Example:**
```css
/* src/app/globals.css */
/* Source: https://tailwindcss.com/docs/theme */
@import "tailwindcss";

@theme {
  /* Reset default color namespace to use only custom colors */
  --color-*: initial;

  /* Background colors */
  --color-bg-primary: #0a0f1a;
  --color-bg-card: #111827;
  --color-bg-card-hover: #1a2332;
  --color-bg-elevated: #1e293b;
  --color-bg-input: #0f172a;

  /* Border colors */
  --color-border: #1e293b;
  --color-border-light: #334155;
  --color-border-focus: #22d3ee;

  /* Text colors */
  --color-text-primary: #e2e8f0;
  --color-text-secondary: #94a3b8;
  --color-text-muted: #64748b;
  --color-text-disabled: #475569;

  /* Semantic colors */
  --color-accent: #22d3ee;
  --color-accent-hover: #06b6d4;
  --color-positive: #34d399;
  --color-negative: #f87171;
  --color-warning: #fb923c;
  --color-info: #60a5fa;

  /* Category colors */
  --color-cat-food: #fb923c;
  --color-cat-services: #60a5fa;
  --color-cat-entertainment: #a78bfa;
  --color-cat-subscriptions: #f472b6;
  --color-cat-transport: #fbbf24;
  --color-cat-other: #94a3b8;

  /* Font families */
  --font-sans: var(--font-dm-sans);
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* Border radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.5);
  --shadow-glow: 0 0 20px rgba(34, 211, 238, 0.15);
}

body {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
}
```

**Generated utility classes:** `bg-bg-primary`, `text-text-secondary`, `text-accent`, `border-border`, `rounded-lg`, `shadow-md`, etc.

**CRITICAL:** Use `@theme` (not `@theme inline`) for static hex values. Use `@theme inline` only for values referencing other CSS variables (like `--font-sans: var(--font-dm-sans)`). The `inline` modifier means Tailwind generates `font-family: var(--font-dm-sans)` directly rather than resolving the value at compile time.

### Pattern 2: DM Sans Font Setup with next/font/google
**What:** Self-hosted variable font via Next.js optimization
**When to use:** Root layout only
**Example:**
```tsx
/* Source: Next.js 16 bundled docs (node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md) */
import { DM_Sans } from 'next/font/google'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={dmSans.variable}>
      <body>{children}</body>
    </html>
  )
}
```

**Key detail:** DM Sans is a variable font, so no `weight` array needed -- all weights (100-900) are included automatically. The `variable` property creates a CSS custom property (`--font-dm-sans`) that the `@theme inline` block references.

### Pattern 3: Prisma 7 Client Singleton with PrismaPg Adapter
**What:** Hot-reload safe PrismaClient with PostgreSQL driver adapter
**When to use:** All server-side DB access
**Example:**
```typescript
/* src/lib/prisma.ts */
/* Source: https://www.prisma.io/docs/guides/nextjs */
import { PrismaClient } from '../../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

const prisma = globalForPrisma.prisma || new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
```

### Pattern 4: ESLint 9 Flat Config with Prettier
**What:** ESLint flat config extending Next.js presets plus Prettier conflict resolution
**When to use:** Project-wide linting
**Example:**
```javascript
/* eslint.config.mjs */
/* Source: existing scaffolded config + eslint-config-prettier docs */
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  eslintConfigPrettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "generated/**",
  ]),
]);

export default eslintConfig;
```

### Pattern 5: npm Overrides for react-is
**What:** Force all transitive react-is dependencies to match React 19 version
**When to use:** package.json -- needed for Recharts compatibility
**Example:**
```json
{
  "overrides": {
    "react-is": "$react-is"
  }
}
```
Note: In npm, `"$react-is"` refers to the version of react-is declared in the project's own dependencies. This ensures Recharts' transitive react-is dependency uses the same version as the explicitly installed one.

### Anti-Patterns to Avoid
- **Using `tailwind.config.ts` with Tailwind v4:** The JS config file is deprecated; use CSS `@theme` blocks exclusively
- **Using `next lint`:** Removed in Next.js 16; use `eslint` CLI directly
- **Using `prisma-client` generator with Turbopack:** Known module resolution failures; use `prisma-client-js` until Turbopack fix is confirmed
- **Using `pnpm` commands:** User chose npm; all scripts must use `npm run`
- **Using `--turbopack` flag:** Turbopack is default in Next.js 16; the flag is unnecessary
- **Specifying weight array for DM Sans:** It is a variable font; specifying weights downloads static files instead
- **Using `prefers-color-scheme` media queries:** Dark mode is static; no light mode exists

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSS class merging | String concatenation | clsx + tailwind-merge (cn()) | Handles conflicting Tailwind classes correctly |
| Font loading | Manual @font-face | next/font/google (DM_Sans) | Zero layout shift, auto self-hosting, CSS variable output |
| DB connection pooling | Custom pool manager | PrismaPg adapter | Handles connection lifecycle, SSL, pool sizing |
| Test path resolution | Manual path aliases in Vitest | vite-tsconfig-paths plugin | Reads tsconfig.json paths automatically |
| ESLint + Prettier conflicts | Manual rule disabling | eslint-config-prettier/flat | Maintained list of conflicting rules |
| Docker Compose test isolation | Shared DB with cleanup | Separate docker-compose.test.yml on port 5433 | tmpfs for speed, no data persistence needed |

**Key insight:** Every hand-rolled solution in infrastructure creates a maintenance burden that compounds across all future phases. Use the established tools.

## Common Pitfalls

### Pitfall 1: Prisma 7 Turbopack Module Resolution
**What goes wrong:** Using `prisma-client` generator provider causes "Cannot find module '.prisma/client/default'" error when Turbopack bundles server code.
**Why it happens:** Prisma 7's new `prisma-client` provider generates ESM-style imports that Turbopack's module resolver cannot follow during SSR.
**How to avoid:** Use `prisma-client-js` as the generator provider name with a custom `output` directory. This generates the traditional module structure that Turbopack resolves correctly. Both providers produce identical runtime behavior.
**Warning signs:** Build passes but runtime error on any page that imports PrismaClient.

### Pitfall 2: Tailwind v4 @theme vs @theme inline
**What goes wrong:** Using `@theme` for CSS variable references (`var(--something)`) causes Tailwind to resolve the variable at compile time, resulting in the literal string "var(--something)" instead of the resolved value.
**Why it happens:** `@theme` evaluates values at build time; `@theme inline` passes them through to CSS as-is.
**How to avoid:** Use `@theme` for static values (hex colors, pixel values). Use `@theme inline` only for values that reference CSS variables (like `--font-sans: var(--font-dm-sans)`).
**Warning signs:** Font not applying despite correct CSS variable name.

### Pitfall 3: Recharts Blank Chart with React 19
**What goes wrong:** Charts render as empty white space with no console errors.
**Why it happens:** Recharts' transitive `react-is` dependency resolves to an older version incompatible with React 19's internals.
**How to avoid:** Install `react-is@^19.2.4` as a direct dependency AND add npm overrides to force all transitive copies to use the same version.
**Warning signs:** SVG elements present in DOM but not visible; ResponsiveContainer renders but inner chart content is empty.

### Pitfall 4: Prisma 7 No Automatic Generate or Seed
**What goes wrong:** Running `prisma migrate dev` does NOT auto-generate the client or run seeds.
**Why it happens:** Prisma 7 removed automatic `generate` and `seed` after `migrate dev`.
**How to avoid:** Always run `npx prisma generate` explicitly after `migrate dev`. Add a `postinstall` script: `"postinstall": "prisma generate"`. For seeding, run `npx prisma db seed` separately.
**Warning signs:** Import errors for Prisma types after running migrations.

### Pitfall 5: Missing `"type": "module"` for Prisma 7
**What goes wrong:** Prisma CLI fails or generates CommonJS output in an ESM-expecting environment.
**Why it happens:** Prisma 7 ships as ESM. Without `"type": "module"` in package.json, Node.js treats .js files as CommonJS.
**How to avoid:** Do NOT add `"type": "module"` to package.json for a Next.js project -- Next.js handles ESM/CJS internally. The `prisma.config.ts` file is loaded by the Prisma CLI which handles its own module resolution via tsx. The generated client's module format is determined by the generator provider, not by package.json type field.
**Warning signs:** ERR_REQUIRE_ESM errors during prisma commands.

### Pitfall 6: @theme Color Namespace Reset
**What goes wrong:** Using `--color-*: initial` removes ALL default Tailwind colors including white, black, transparent, and current.
**Why it happens:** The `initial` reset clears the entire namespace.
**How to avoid:** After resetting, re-declare `--color-white`, `--color-black`, `--color-transparent`, and `--color-current` if needed. Or, do NOT reset the namespace and just add custom colors alongside defaults (simpler, less risk).
**Warning signs:** `bg-white`, `text-black`, `bg-transparent` stop working after adding @theme block.

### Pitfall 7: Next.js 16 Async Request APIs
**What goes wrong:** Build fails with type errors when accessing `cookies()`, `headers()`, `params`, or `searchParams` synchronously.
**Why it happens:** Next.js 16 removes synchronous access to request APIs that was deprecated in Next.js 15. All must be awaited.
**How to avoid:** Always `await` these APIs: `const { slug } = await params`, `const cookieStore = await cookies()`.
**Warning signs:** TypeScript errors about Promise types on params/searchParams.

## Code Examples

### Vitest Configuration (Official Next.js 16 pattern)
```typescript
/* vitest.config.mts */
/* Source: node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md */
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.{ts,tsx}'],
    },
  },
})
```

### Vitest Integration Config (separate DB)
```typescript
/* vitest.integration.config.mts */
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
  },
})
```

### Prisma 7 Schema Generator Block
```prisma
/* prisma/schema.prisma */
/* Source: community consensus for Next.js 16 Turbopack compat */
generator client {
  provider = "prisma-client-js"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Prisma 7 Config File
```typescript
/* prisma.config.ts (project root) */
/* Source: https://www.prisma.io/docs/orm/reference/prisma-config-reference */
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
```

### Docker Compose (Dev)
```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: misfinanzas
      POSTGRES_PASSWORD: misfinanzas_dev
      POSTGRES_DB: misfinanzas
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### Docker Compose (Test)
```yaml
# docker-compose.test.yml
services:
  db-test:
    image: postgres:16-alpine
    ports:
      - "5433:5432"
    environment:
      POSTGRES_USER: misfinanzas
      POSTGRES_PASSWORD: misfinanzas_test
      POSTGRES_DB: misfinanzas_test
    tmpfs:
      - /var/lib/postgresql/data
```

### package.json Scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format:check": "prettier --check .",
    "format": "prettier --write .",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:integration": "vitest run --config vitest.integration.config.mts",
    "test:e2e": "playwright test",
    "quality": "npm run build && npm run lint && npm run format:check && npm run test:run",
    "postinstall": "prisma generate"
  }
}
```

### Recharts Validation Page
```tsx
/* src/app/test-chart/page.tsx */
'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const data = [
  { name: 'Ene', gasto: 4000 },
  { name: 'Feb', gasto: 3000 },
  { name: 'Mar', gasto: 5000 },
]

export default function TestChartPage() {
  return (
    <div style={{ width: '100%', height: 400, padding: 20 }}>
      <h1>Recharts Validation</h1>
      <ResponsiveContainer width="100%" height="80%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="gasto" fill="#22d3ee" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

### tsconfig.json (Updated)
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.ts` (JS) | CSS `@theme` blocks | Tailwind v4 (2024) | No JS config file; all tokens in CSS |
| `next lint` command | `eslint` CLI directly | Next.js 16 (2025) | Remove next.config eslint option; lint via package.json script |
| Prisma built-in query engine | Driver adapters (PrismaPg) | Prisma 7 (2026) | Explicit adapter required; leaner client |
| `prisma-client-js` generator | `prisma-client` generator | Prisma 7 (2026) | New output structure; BUT use old name for Turbopack compat |
| Sync `cookies()`, `headers()` | Async `await cookies()` | Next.js 15/16 (2024-2025) | All request APIs are async; sync removed in 16 |
| `next build` runs linter | Lint is separate command | Next.js 16 (2025) | Must add explicit lint step to CI/scripts |
| Turbopack opt-in (`--turbopack`) | Turbopack default | Next.js 16 (2025) | Remove --turbopack flags; use --webpack to opt out |
| Prisma auto-generate after migrate | Manual `prisma generate` | Prisma 7 (2026) | Must run generate explicitly; add postinstall script |
| Prisma auto-seed after migrate | Manual `prisma db seed` | Prisma 7 (2026) | Must run seed explicitly |

**Deprecated/outdated:**
- `next lint` -- fully removed in Next.js 16; use ESLint CLI
- `tailwind.config.ts` -- replaced by CSS `@theme` in Tailwind v4
- Prisma `datasources` in `schema.prisma` -- connection URL moves to `prisma.config.ts`
- `--skip-generate` and `--skip-seed` Prisma CLI flags -- removed in v7
- Sync access to `cookies()`, `headers()`, `params`, `searchParams` -- async only in Next.js 16

## Open Questions

1. **Prisma 7 generator provider choice**
   - What we know: `prisma-client` is the official new provider; `prisma-client-js` is legacy but works with Turbopack. The Turbopack issue was reported on older Next.js 16.x versions.
   - What's unclear: Whether Next.js 16.2.2 has fixed the Turbopack module resolution for the new provider.
   - Recommendation: Start with `prisma-client-js` (safe path). If it causes issues, try `prisma-client` with custom output. Test early by running `npm run build` after Prisma setup.

2. **Recharts 3.8.x + React 19.2.4 compatibility**
   - What we know: Issue #6857 reports blank charts; `react-is` override is the commonly cited fix.
   - What's unclear: Whether the latest Recharts 3.8.1 has an internal fix, or if the override is still required.
   - Recommendation: Install react-is override first, validate with test chart. If still blank, switch to nivo.

3. **Tailwind v4 color namespace reset implications**
   - What we know: `--color-*: initial` removes ALL default colors.
   - What's unclear: Whether the project needs `bg-white`, `bg-black`, `bg-transparent`, or `text-current` from defaults.
   - Recommendation: Do NOT reset the color namespace. Add custom colors alongside defaults. This avoids breaking utility classes used by third-party components or Recharts tooltip/chart styling.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (latest) + Playwright (latest) |
| Config file | `vitest.config.mts` (unit), `vitest.integration.config.mts` (integration), `playwright.config.ts` (e2e) |
| Quick run command | `npx vitest run` |
| Full suite command | `npm run quality` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | Project builds with zero errors | smoke | `npm run build` | N/A (build command) |
| INFRA-02 | Docker containers start | manual | `docker compose up -d && docker compose -f docker-compose.test.yml up -d` | N/A (infra) |
| INFRA-03 | ESLint passes with zero warnings | smoke | `npm run lint` | N/A (lint command) |
| INFRA-04 | Vitest runs successfully | smoke | `npx vitest run` | No -- Wave 0 |
| INFRA-05 | Playwright configured | smoke | `npx playwright test --list` | No -- Wave 0 |
| INFRA-06 | Build zero errors/warnings | smoke | `npm run build` | N/A (build command) |
| INFRA-07 | Env files exist with correct keys | manual-only | Visual inspection | N/A |

### Sampling Rate
- **Per task commit:** `npm run build && npm run lint`
- **Per wave merge:** `npm run quality`
- **Phase gate:** Full quality command green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.mts` -- Vitest configuration file
- [ ] `vitest.integration.config.mts` -- Integration test configuration
- [ ] `playwright.config.ts` -- Playwright configuration
- [ ] `tests/setup.ts` -- Vitest global setup file
- [ ] Framework install: `npm install -D vitest @vitejs/plugin-react vite-tsconfig-paths jsdom @testing-library/react @testing-library/dom @playwright/test`
- [ ] Playwright browsers: `npx playwright install`

## Sources

### Primary (HIGH confidence)
- Next.js 16 bundled docs (`node_modules/next/dist/docs/`) -- installation, CSS, fonts, testing, upgrading
- [Tailwind CSS v4 Theme Variables](https://tailwindcss.com/docs/theme) -- @theme directive syntax, namespaces, inline modifier
- [Prisma 7 Upgrade Guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7) -- breaking changes, driver adapters, ESM
- [Prisma Next.js Guide](https://www.prisma.io/docs/guides/nextjs) -- official setup pattern
- [Prisma Config Reference](https://www.prisma.io/docs/orm/reference/prisma-config-reference) -- prisma.config.ts format

### Secondary (MEDIUM confidence)
- [Recharts Issue #6857](https://github.com/recharts/recharts/issues/6857) -- React 19 blank chart bug
- [Recharts React 19 Fix](https://www.bstefanski.com/blog/recharts-empty-chart-react-19) -- react-is override pattern
- [Prisma + Next.js 16 Turbopack Fix](https://www.buildwithmatija.com/blog/migrate-prisma-v7-nextjs-16-turbopack-fix) -- prisma-client-js workaround
- [eslint-config-prettier](https://github.com/prettier/eslint-config-prettier) -- flat config integration

### Tertiary (LOW confidence)
- [Prisma + Next.js 16 community guide](https://jb.desishub.com/blog/nextjs-with-prisma-7-and-postgres) -- uses prisma-client-js; claims migrate dev doesn't work (needs validation)
- Recharts 3.8.1 internal fix status -- unverified whether latest version resolves React 19 issue without overrides

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM -- versions confirmed installed but Prisma 7 + Turbopack integration has known issues with conflicting community solutions
- Architecture: HIGH -- patterns from official docs (Next.js bundled, Tailwind, Prisma)
- Pitfalls: HIGH -- all pitfalls verified via official docs or reproduction reports with issue numbers
- Recharts validation: LOW -- conflicting reports on whether react-is override fully resolves the issue

**Research date:** 2026-04-04
**Valid until:** 2026-04-18 (Prisma 7 and Recharts landscape is fast-moving; re-check if delayed)
