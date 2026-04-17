# Stack Research

**Domain:** Authentication + Cloud Deploy (v3.0 milestone)
**Researched:** 2026-04-15
**Confidence:** MEDIUM-HIGH (Auth.js v5 is still beta; all other choices HIGH)

---

## Context

This research covers ONLY the new capabilities required for the v3.0 Auth + Cloud Deploy milestone. The existing stack (Next.js 16.2.2, React 19.2.4, Tailwind v4, Prisma 7, Recharts, Zod v4, Vitest, npm) is validated and working in v2.1.

**Critical constraint:** Next.js 16 renamed `middleware.ts` to `proxy.ts`. Any tool that wraps middleware (NextAuth, Upstash rate limiting) must be configured through `proxy.ts`, not `middleware.ts`. The edge runtime is NOT supported in proxy.ts — it runs Node.js only.

**Critical constraint:** Prisma 7 breaks the Prisma client singleton pattern from v6. The new import path is `@/generated/prisma/client` (not `@prisma/client`), and a driver adapter must be passed to the constructor. This affects how the NextAuth Prisma adapter is wired up.

---

## Recommended Stack

### New Dependencies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| next-auth | `@beta` (~5.0.0-beta.28+) | Session management, credentials provider, route protection | The only auth library with first-class Next.js App Router support, nonce-based CSRF, and a Prisma adapter. v4 has no App Router support. v5 beta is production-stable per community consensus. |
| @auth/prisma-adapter | `^2.11.1` | Bridges NextAuth sessions to Prisma DB (User, Session, Account, VerificationToken models) | Official adapter maintained by the Auth.js team. Works with Prisma 7 with correct import path. |
| bcryptjs | `^2.4.3` | Hashing passwords before storage, comparing at login | Pure JavaScript — no native compilation step. bcrypt (native) breaks on Vercel serverless and Vercel's build pipeline. bcryptjs is ~30% slower but the speed difference is irrelevant at typical auth volumes. |
| @types/bcryptjs | `^2.4.6` | TypeScript types for bcryptjs | Dev dependency, required for strict mode. |
| otpauth | `^9.x` | TOTP secret generation, QR code URI generation, code verification | Actively maintained (last updated Feb 2026). Full RFC 6238 compliance. Works in Node.js, Bun, Deno, and browser. TypeScript-first. No native bindings. Speakeasy is unmaintained (last commit 2017). |
| @upstash/ratelimit | `^2.x` | Sliding window rate limiting on auth endpoints | Connectionless HTTP-based Redis client, designed for Vercel Edge/serverless. Works in proxy.ts (Node.js runtime). Free tier (10k requests/day) covers single-user app. |
| @upstash/redis | `^1.x` | Redis client required by @upstash/ratelimit | Peer dependency of @upstash/ratelimit. Also HTTP-based, no persistent connection needed. |
| @prisma/adapter-ppg | `^7.x` | Prisma Postgres (Vercel managed DB) driver adapter | Required by Prisma 7 when connecting to Prisma Postgres. Replaces direct TCP connection with HTTP/WebSocket-based connection optimized for serverless. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| qrcode | `^1.5.x` | Generate QR code as data URI for TOTP setup screen | Only needed on the TOTP enrollment page. Renders the QR code the user scans with their authenticator app. |
| @types/qrcode | `^1.5.x` | TypeScript types for qrcode | Dev dependency, only if qrcode is added. |

### What Is NOT Changing

| Area | Decision | Rationale |
|------|----------|-----------|
| Prisma ORM | Stay on Prisma 7 | Already installed. Prisma Postgres uses `@prisma/adapter-ppg` on top of existing Prisma 7 install. |
| Zod | Stay on Zod v4 | Already validating all inputs. Auth forms get Zod schemas like everything else. |
| Vitest | Stay | Auth logic (token validation, password hashing) is pure functions — unit testable with existing setup. |
| Tailwind v4 / design system | No changes | Auth pages (login, 2FA) follow Glyph Finance tokens already in globals.css. |

---

## Prisma 7 + Prisma Postgres Integration

Prisma 7 requires a driver adapter — the old singleton pattern from CLAUDE.md will not work for Prisma Postgres. The new pattern:

```typescript
// src/lib/prisma.ts — updated for Prisma 7 + Prisma Postgres
import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPostgresAdapter } from '@prisma/adapter-ppg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  const adapter = new PrismaPostgresAdapter(process.env.DATABASE_URL!)
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

For local development against Docker PostgreSQL, use `@prisma/adapter-pg` (standard pg driver) instead of `@prisma/adapter-ppg`. This means local dev and production use different adapters — manage via `NODE_ENV` branch or separate `.env` configs.

---

## Auth.js v5 Setup Pattern for Next.js 16

### Key structural change from v4

Everything exports from a single `NextAuth()` call. No separate `authOptions` object.

```typescript
// src/lib/auth.ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      authorize: async (credentials) => {
        // Zod validate, bcryptjs compare, TOTP verify
        // Return user object or null
      },
    }),
  ],
  session: { strategy: 'database' },
  // ...callbacks
})
```

### Route handler (App Router)

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/lib/auth'
export const { GET, POST } = handlers
```

### proxy.ts (NOT middleware.ts — Next.js 16 breaking change)

```typescript
// proxy.ts (root of project)
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAuthPage = req.nextUrl.pathname.startsWith('/login')

  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  // Rate limiting check runs here too (see below)
})

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
}
```

---

## Rate Limiting

Rate limiting lives in `proxy.ts` (Node.js runtime). Upstash is the only practical choice on Vercel — in-memory rate limiting dies on every cold start because serverless functions don't share memory.

Apply rate limiting only to auth endpoints (`/api/auth/signin`, `/api/auth/callback`, any custom `/api/auth/*` routes). Global rate limiting on all routes is unnecessary overhead for a single-user app.

Upstash free tier: 10,000 requests/day. For a single-user personal finance app, this is effectively unlimited.

Required environment variables:
```
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

---

## Security Headers

Use `next.config.ts` headers array directly — no additional library needed. The `@nosecone/next` library (Arcjet) is a convenience wrapper around the same underlying pattern; for a project already comfortable with configuration files, it adds a dependency without meaningful benefit.

Configure in `next.config.ts`:

```typescript
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: buildCSP(), // function that assembles nonce-based CSP
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
]
```

CSP for this app needs to allow: `'self'`, Next.js inline scripts (requires nonce or hash), Vercel analytics (if added), font sources (Google Fonts for IBM Plex Mono). The OLED black design with no third-party widgets makes CSP simpler than most apps.

---

## Vercel Deployment

No additional npm packages needed for Vercel deployment itself. Required changes:

1. `package.json` `postinstall` script: `prisma generate` — regenerates Prisma client at build time.
2. Vercel environment variables: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, Upstash credentials.
3. `NEXTAUTH_SECRET`: generate with `openssl rand -base64 32`.
4. Prisma Postgres: provision via Vercel Marketplace → Storage tab → Create Database → Prisma Postgres. Vercel sets `DATABASE_URL` automatically.

---

## Installation

```bash
# Auth
npm install next-auth@beta @auth/prisma-adapter

# Password hashing
npm install bcryptjs
npm install -D @types/bcryptjs

# TOTP
npm install otpauth

# QR code for TOTP setup page
npm install qrcode
npm install -D @types/qrcode

# Rate limiting (requires Upstash Redis account)
npm install @upstash/ratelimit @upstash/redis

# Prisma Postgres adapter (replaces @prisma/adapter-pg for production)
npm install @prisma/adapter-ppg
```

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| next-auth@beta (v5) | next-auth@4.x (stable) | v4 has no App Router support. Requires the old `pages/` directory pattern. Would require a parallel route setup hack. |
| next-auth@beta (v5) | better-auth | better-auth is newer (2024), better TypeScript DX, but has less community documentation for TOTP 2FA and is unproven at the same scale. next-auth has more examples, more Stack Overflow answers, more guides for exactly this use case (Credentials + TOTP). |
| next-auth@beta (v5) | Lucia Auth | Lucia v3 is in maintenance mode — the author announced it in late 2024. Not appropriate for a new project. |
| next-auth@beta (v5) | Clerk / Auth0 | Third-party SaaS. Adds external dependency, data leaves your server, adds monthly cost at scale. Centik is open source and handles personal financial data — keep it self-contained. |
| bcryptjs | bcrypt (native) | bcrypt requires node-gyp compilation. Breaks on Vercel's build pipeline unless native modules are explicitly supported. bcryptjs is pure JS, zero compilation, works everywhere. |
| bcryptjs | argon2 | argon2 is the stronger algorithm but requires native binaries. Same Vercel incompatibility as bcrypt. When argon2-cloudflare (pure WASM) matures, it may be worth revisiting. |
| otpauth | speakeasy | speakeasy is unmaintained (last commit 2017, README says "NOT MAINTAINED"). |
| otpauth | otplib | otplib is also actively maintained and TypeScript-first, but otpauth has slightly simpler API for TOTP-only use case and documents QR code URI generation explicitly. Either would work. |
| @upstash/ratelimit | in-memory rate limiting (lru-cache) | Serverless functions don't share memory — in-memory rate limiting resets on every cold start, providing zero protection. |
| @upstash/ratelimit | @arcjet/next | Arcjet is a full security platform (bot detection, email validation, rate limiting). Heavyweight for a single-user app that only needs auth endpoint protection. |
| next.config.ts headers | @nosecone/next | nosecone is a thin wrapper around next.config headers. Adds a dependency without meaningful abstraction benefit given this project already manages configuration files carefully. |
| Prisma Postgres (Vercel) | Supabase | Supabase requires migration from Prisma's migration system to their workflow, or careful coexistence. Prisma Postgres is designed specifically for Prisma ORM and has native Vercel Marketplace integration. No migration friction. |
| Prisma Postgres (Vercel) | Neon | Neon is a strong alternative (also serverless Postgres, Vercel integration). Prisma Postgres was chosen because it is managed directly through the Vercel Dashboard with automatic `DATABASE_URL` injection, and because it uses the same `@prisma/adapter-ppg` that Prisma documents as the v7 canonical path. |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `speakeasy` | Unmaintained since 2017 | `otpauth` |
| `bcrypt` (native) | Breaks Vercel build pipeline due to native compilation | `bcryptjs` |
| `jsonwebtoken` | Not needed — NextAuth handles JWT/session internally | Let NextAuth manage sessions |
| `passport` | Express middleware pattern, incompatible with Next.js App Router server actions | `next-auth` credentials provider |
| `@arcjet/next` | Overkill full security platform for auth-only rate limiting | `@upstash/ratelimit` |
| `middleware.ts` | Deprecated in Next.js 16, runs on edge runtime (not Node.js) | `proxy.ts` (Node.js runtime) |
| `jose` directly | Next-auth already depends on it internally | Let NextAuth manage its own JWT signing |
| Any OAuth provider (Google, GitHub) | Not in spec for this milestone; invite-only means no third-party OAuth flows | Credentials only for v3.0 |

---

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| next-auth@beta | ~5.0.0-beta.28+ | Next.js 16.2.2 | Minimum Next.js 14.0 per Auth.js docs. proxy.ts replaces middleware.ts for route protection. |
| @auth/prisma-adapter | ^2.11.1 | Prisma 7 | Works with Prisma 7, but import path must be `@/generated/prisma/client` not `@prisma/client`. |
| @prisma/adapter-ppg | ^7.x | Prisma 7 | Designed for Prisma 7. Requires `DATABASE_URL` pointing to Prisma Postgres endpoint. |
| @prisma/adapter-pg | ^7.x | Prisma 7 | For local development against Docker PostgreSQL. |
| bcryptjs | ^2.4.3 | Node.js 18+ | Pure JS, no compatibility concerns. |
| otpauth | ^9.x | Node.js 18+, TypeScript 5 | ESM-first package. May need `"moduleResolution": "bundler"` in tsconfig if not already set (Next.js 16 sets this by default). |
| @upstash/ratelimit | ^2.x | proxy.ts Node.js runtime | Does NOT run in edge runtime. Compatible with proxy.ts (Node.js only in Next.js 16). |

---

## Prisma Schema Additions Required

The NextAuth Prisma adapter requires these models in `schema.prisma`. They do not exist in the current schema (which has no auth):

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified DateTime?
  passwordHash  String?
  totpSecret    String?
  totpEnabled   Boolean   @default(false)
  invitedBy     String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  accounts      Account[]
  sessions      Session[]
  // Relations to existing financial data:
  transactions  Transaction[]
  periods       Period[]
  // ... other relations for per-user isolation
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  // ... standard NextAuth Account fields
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}

model Invite {
  id        String   @id @default(cuid())
  email     String   @unique
  token     String   @unique @default(cuid())
  used      Boolean  @default(false)
  createdAt DateTime @default(now())
  expiresAt DateTime
}
```

All existing models (Transaction, Period, Category, etc.) need a `userId` field added and a relation to `User` for per-user data isolation.

---

## Sources

- [Auth.js Installation Docs](https://authjs.dev/getting-started/installation) — Installation steps, route handler pattern, proxy.ts integration. MEDIUM confidence (official docs, but v5 is still beta).
- [Auth.js Prisma Adapter](https://authjs.dev/getting-started/adapters/prisma) — Schema requirements, adapter setup. HIGH confidence (official).
- [Next.js 16 proxy.ts announcement](https://nextjs.org/blog/next-16) — middleware.ts renamed to proxy.ts, edge runtime removed from proxy. HIGH confidence (official Next.js release notes).
- [Prisma v7 Upgrade Guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7) — adapter-ppg requirement, import path changes, env loading changes. HIGH confidence (official Prisma docs).
- [Prisma Postgres Vercel Integration](https://www.prisma.io/docs/postgres/integrations/vercel) — Vercel Marketplace setup, DATABASE_URL injection. HIGH confidence (official Prisma docs).
- [Upstash Ratelimit Overview](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview) — Fixed/sliding window algorithms, free tier. HIGH confidence (official Upstash docs).
- [speakeasy GitHub](https://github.com/speakeasyjs/speakeasy) — Confirmed "NOT MAINTAINED" label on repo. HIGH confidence.
- [otpauth GitHub](https://github.com/hectorm/otpauth) — Active maintenance, Feb 2026 update, RFC 6238 compliant. HIGH confidence.
- WebSearch: bcryptjs vs bcrypt serverless compatibility — multiple consistent sources confirm bcrypt breaks on Vercel. MEDIUM confidence (no single official source, but widely documented).
- WebSearch: next-auth@beta production readiness — community consensus is stable-enough-for-production as of early 2026. LOW-MEDIUM confidence (beta is beta).

---

*Stack research for: Auth + Cloud Deploy (v3.0 milestone)*
*Researched: 2026-04-15*
