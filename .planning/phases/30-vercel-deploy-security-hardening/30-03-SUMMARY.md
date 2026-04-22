---
phase: 30-vercel-deploy-security-hardening
plan: 03
subsystem: infra
tags: [security-headers, csp, nonce, hsts, proxy, middleware, next-config]

requires:
  - phase: 26-auth-credentials
    provides: proxy.ts auth redirect chain + matcher config
  - phase: 30-vercel-deploy-security-hardening
    provides: Phase 30 plans 30-01 (dual-URL Prisma + env stubs) and 30-02 (Zod env validator at boot) already landed

provides:
  - next.config.ts async headers() with 4 always-on static security headers + prod-gated HSTS
  - src/proxy.ts per-request CSP nonce via crypto.randomUUID(), Content-Security-Policy response header on non-redirect responses, x-nonce injection into downstream request headers
  - 4 new proxy.test.ts tests covering CSP presence, nonce freshness, redirect short-circuit, and nonce shape
affects: [30-06 smoke checklist, any future Server Component that wants to render <Script nonce={...}>]

tech-stack:
  added: []
  patterns:
    - "Next.js 16 proxy.ts CSP-with-nonce — crypto.randomUUID() -> base64 -> requestHeaders.set('x-nonce', nonce) -> NextResponse.next({ request: { headers: requestHeaders } }) -> response.headers.set('Content-Security-Policy', csp)"
    - "HSTS prod-only gate — NODE_ENV==='production' ternary inside staticSecurityHeaders array; localhost never receives Strict-Transport-Security"
    - "CSP attach skipped on 3xx redirects (response.status >= 300 && < 400) — browsers discard redirect body, attaching CSP wastes bytes and caches stale nonce"
    - "Original response headers (Set-Cookie, etc.) copied onto the nonced response via response.headers.forEach((v, k) => responseWithNonce.headers.set(k, v))"

key-files:
  created: []
  modified:
    - next.config.ts
    - src/proxy.ts
    - src/proxy.test.ts

key-decisions:
  - "[30-03] next.config.ts async headers() uses source '/(.*)' matcher to apply static security headers to every route; CSP is NOT emitted here — proxy.ts owns it because each request needs a fresh nonce"
  - "[30-03] HSTS gated on NODE_ENV==='production' — the ternary inside staticSecurityHeaders is load-bearing defense against accidentally locking localhost:3000 into HTTPS-only for 2 years (browsers cache HSTS per-origin)"
  - "[30-03] proxy.ts preserves the Phase-26 auth redirect chain exactly — three original return branches hoisted into a single `response` variable so the post-branch CSP block runs after all routing decisions"
  - "[30-03] 3xx responses short-circuit BEFORE CSP attach — browsers discard the body of redirects, so CSP there is wasted bytes AND caches a stale nonce against the redirect target"
  - "[30-03] CSP uses `crypto.randomUUID()` (global in Node 20.9+) per Next.js 16 authoritative docs — base64-encoded for 128-bit entropy"
  - "[30-03] 'unsafe-eval' appears ONLY in dev (gated by `isDev = process.env.NODE_ENV !== 'production'`) — React Fast Refresh uses eval; production never gets it"
  - "[30-03] 'unsafe-inline' stays in style-src (NOT script-src) — documented Tailwind v4 + React 19 trade-off per D-06; script-src remains hardened with nonce + strict-dynamic"
  - "[30-03] Original response headers (Set-Cookie, Location absence for next() path) copied onto responseWithNonce via forEach — prevents dropping Auth.js session cookies from NextAuth's chained response mutations"
  - "[30-03] createMockRequest helper extended with `headers: new Headers()` — additive, because existing 6 auth tests do not read req.headers; Task 2's proxy.ts reads it inside new Headers(req.headers)"

patterns-established:
  - "CSP-nonce-in-middleware: all future Next.js apps in this org should follow this exact proxy.ts shape (nonce -> request header -> NextResponse.next({request:{headers}}) -> CSP on response)"
  - "Static security headers live in next.config.ts; per-request (nonce-bearing) headers live in proxy.ts — never duplicate CSP in both places"

requirements-completed: [DEPLOY-02]

duration: 5min
completed: 2026-04-22
---

# Phase 30 Plan 03: Security Headers Summary

**Full security-header stack shipped: 4 static headers + prod-only HSTS in next.config.ts, per-request CSP with 128-bit nonce + strict-dynamic in proxy.ts, 4 new proxy tests, and zero regression to the 6 Phase-26 auth-redirect tests.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-21T23:59:50Z
- **Completed:** 2026-04-22T00:04:57Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- `next.config.ts` gains `async headers()` returning 4 always-on security headers (X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy camera/mic/geo/browsing-topics empty) + HSTS (`max-age=63072000; includeSubDomains; preload`) gated on NODE_ENV==='production'.
- `src/proxy.ts` extended with per-request CSP. Preserves all Phase-26 auth redirect behavior (publicPaths, callbackUrl), short-circuits 3xx redirects BEFORE CSP attach, generates a fresh nonce via `crypto.randomUUID()` + base64, injects `x-nonce` into downstream request headers so Server Components can render `<Script nonce={...}>`, and sets a canonical 11-directive CSP on the response (`default-src 'self'`; `script-src 'self' 'nonce-*' 'strict-dynamic'` +dev `'unsafe-eval'`; `style-src 'unsafe-inline'` [Tailwind v4 D-06]; `img-src data: blob:`; `font-src data:`; `connect-src https://*.upstash.io`; `frame-ancestors 'none'`; `base-uri 'self'`; `form-action 'self'`; `object-src 'none'`; `upgrade-insecure-requests`).
- `src/proxy.test.ts` extended with 4 new tests (CSP directives, nonce freshness across two requests, 3xx redirect excluded, nonce base64 shape). All 6 existing Phase-26 auth-redirect tests still pass. Total: 10/10 passing.

## Task Commits

1. **Task 1: next.config.ts static security headers** — `3d1dee4` (feat)
2. **Task 2: proxy.ts CSP nonce injection** — `61b039b` (feat)
3. **Task 3: proxy CSP + header coverage tests** — `41ec1dc` (test)

**Plan metadata:** (appended below as final commit)

## Files Created/Modified

- `next.config.ts` (35 lines → 40 lines) — Added staticSecurityHeaders array with isProduction HSTS gate + async headers() returning the array on `source: '/(.*)'`.
- `src/proxy.ts` (33 lines → 76 lines) — Hoisted three original `return` branches into single `response` variable, added 3xx short-circuit, generated per-request nonce via `crypto.randomUUID()`, injected x-nonce via `NextResponse.next({ request: { headers: requestHeaders } })`, set Content-Security-Policy on the nonced response, copied original response headers onto the new response to preserve Set-Cookie.
- `src/proxy.test.ts` (103 lines → 167 lines) — Added `headers: new Headers()` field to createMockRequest helper (additive), appended `describe('proxy CSP + security headers', ...)` block with 4 new tests.

## Structure Recap

**proxy.ts flow:**
1. Resolve `isPublic` from pathname.
2. Route into branches → assign `response`:
   - public + auth → redirect to `/`
   - public + no auth → `next()`
   - protected + no auth → redirect to `/login?callbackUrl=...`
   - protected + auth → `next()`
3. Short-circuit if `response.status >= 300 && < 400` — return redirect unmolested.
4. Generate nonce: `Buffer.from(crypto.randomUUID()).toString('base64')`.
5. Build CSP string via `.join('; ')` on 11 directives (dev adds `'unsafe-eval'` only in script-src).
6. Build `requestHeaders = new Headers(req.headers); requestHeaders.set('x-nonce', nonce)`.
7. `responseWithNonce = NextResponse.next({ request: { headers: requestHeaders } })`.
8. Copy original `response.headers` onto `responseWithNonce.headers` (preserves Set-Cookie).
9. `responseWithNonce.headers.set('Content-Security-Policy', csp)`.
10. Return `responseWithNonce`.

## Grep Gate Results

| Gate | Result |
|------|--------|
| `grep "X-Frame-Options" next.config.ts` | PASS |
| `grep "X-Content-Type-Options" next.config.ts` | PASS |
| `grep "Referrer-Policy" next.config.ts` | PASS |
| `grep "Permissions-Policy" next.config.ts` | PASS |
| `grep "Strict-Transport-Security" next.config.ts` | PASS |
| `grep "max-age=63072000" next.config.ts` | PASS |
| `grep "isProduction" next.config.ts` | PASS |
| `grep "async headers" next.config.ts` | PASS |
| `grep "crypto.randomUUID" src/proxy.ts` | PASS |
| `grep "Content-Security-Policy" src/proxy.ts` | PASS |
| `grep "x-nonce" src/proxy.ts` | PASS |
| `grep "strict-dynamic" src/proxy.ts` | PASS |
| `grep "upstash.io" src/proxy.ts` | PASS |
| `grep "frame-ancestors" src/proxy.ts` | PASS |
| `grep "upgrade-insecure-requests" src/proxy.ts` | PASS |
| `grep "response.status >= 300" src/proxy.ts` | PASS |

## Quality Gate Results

| Gate | Result |
|------|--------|
| `npm run build` | PASS (compiled 9.7s, TypeScript 8.0s, 12 static pages, 0 errors) |
| `npm run lint` | PASS (0 errors; 3 pre-existing warnings in movimientos/actions.ts — out of scope per SCOPE BOUNDARY) |
| `npm run test:run` | PASS (48 files / 710 tests) |
| `npm run test:run -- src/proxy.test.ts` | PASS (10/10 — 6 existing + 4 new) |
| `npm run test:integration` | PASS (6 files / 53 tests in 120s) |

## Decisions Made

- **HSTS prod-gate via ternary in staticSecurityHeaders array** — cleaner than an `if` block wrapping the whole return value; HSTS simply drops out of the array when not in production.
- **Short-circuit 3xx BEFORE generating the nonce** — avoids burning crypto.randomUUID() cycles on requests that won't use it. Minor but adds up at scale.
- **Copy original response.headers onto responseWithNonce via forEach** — NOT overwriting (use `.set`, not `.append`) because `NextResponse.next()` on the new path produces a fresh headers object and any Auth.js `Set-Cookie` attached to `response` would otherwise be lost. This is the load-bearing fix that keeps session continuity.
- **`crypto.randomUUID()` (global) instead of `randomBytes(16)`** — Next.js 16 docs are explicit: use the global; it's available in Node 20.9+ without import, works in Edge runtime, and the Base64-wrapped UUID (36 chars → ~48 chars base64) is more than enough entropy.
- **`'unsafe-inline'` in style-src only** — Tailwind v4 arbitrary values + React 19 inline-style emission make nonce-only styles infeasible without major refactor; accepted D-06 trade-off. script-src remains nonce + strict-dynamic (no unsafe-inline).
- **Dev-only `'unsafe-eval'` in script-src** — React Fast Refresh + Next.js dev overlay use eval; removing it would break dev UX. Production strictly forbids it.

## Deviations from Plan

None — plan executed exactly as written. All 3 tasks committed atomically. Every verify gate listed in 30-03-PLAN.md <verification> section passed on first run. No auto-fixes needed.

## Issues Encountered

None. The plan's `<interfaces>` block gave the exact file contents to produce, and the Next.js 16 doc at `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md` confirmed the `crypto.randomUUID()` + `NextResponse.next({ request: { headers } })` pattern is the canonical one.

## Notable Pre-Existing Out-of-Scope Items

3 lint warnings in `src/app/(app)/movimientos/actions.ts` (unused `_error` catch params at L86, L141, L173). These pre-date this plan and are unrelated to security headers. Logged here for visibility but NOT fixed (SCOPE BOUNDARY — auto-fix rule only applies to issues caused by the current task).

## User Setup Required

None — no external service configuration required for this plan. (DEPLOY-02 verification of real-prod header emission happens in 30-06 smoke.)

## Next Phase Readiness

- DEPLOY-02 marked complete in REQUIREMENTS.md — security headers are in code.
- 30-04 (prisma/seed.prod.ts + package.json wiring) is cleared to proceed; it touches disjoint files from this plan.
- 30-06 smoke checklist should include: `curl -I <prod-url>` and confirm X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, Strict-Transport-Security, AND Content-Security-Policy (with fresh nonce) all present on 200 responses; CSP absent from 302 redirects; HSTS absent in dev.

## Self-Check: PASSED

- `next.config.ts` exists and contains `async headers` + `isProduction` ternary + all 5 header keys — verified via grep.
- `src/proxy.ts` exists and contains `crypto.randomUUID`, `Content-Security-Policy`, `x-nonce`, `strict-dynamic`, `upstash.io`, `frame-ancestors`, `upgrade-insecure-requests`, `response.status >= 300` — verified via grep.
- `src/proxy.test.ts` exists and runs 10 tests pass — verified via `npx vitest run src/proxy.test.ts`.
- Commits `3d1dee4`, `61b039b`, `41ec1dc` all present in `git log`.

---
*Phase: 30-vercel-deploy-security-hardening*
*Completed: 2026-04-22*
