# Phase 30: Vercel Deploy + Security Hardening - Discussion Log

> **Audit trail only.** Decisions live in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 30-vercel-deploy-security-hardening
**Mode:** `--auto` (Claude auto-selected all gray areas + recommended option per area)
**Areas discussed:** Prisma Postgres provisioning, Security headers + CSP, Production seed strategy, Vercel project config, Cross-user isolation test expansion, Boot-time env validation, Migration runtime, Smoke tests, Logs/observability

---

## Prisma Postgres Provisioning

| Option | Description | Selected |
|--------|-------------|----------|
| Vercel Marketplace Prisma Postgres | Auto-injects DATABASE_URL/POSTGRES_PRISMA_URL/POSTGRES_URL_NON_POOLING; first-party | ✓ |
| Neon (manual) | Cheaper at scale, but requires manual env wiring | |
| Supabase | Adds auth/storage you don't need | |
| External AWS RDS / Cloud SQL | Heaviest ops burden; not justified for single-user | |

**Auto choice rationale:** Vercel-native integration removes a class of misconfiguration bugs and pre-wires pooled vs direct connections. Migration command + runtime command get the right URL automatically.

---

## Security Headers + CSP

| Option | Description | Selected |
|--------|-------------|----------|
| Static headers in `next.config.ts` + per-request CSP nonce in `src/proxy.ts` | Idiomatic Next 16; nonce mechanics work with App Router | ✓ |
| All headers in middleware (proxy.ts) | More dynamic, but loses static-header optimizations | |
| All headers in `next.config.ts` (no nonce) | Forces `'unsafe-inline'` script-src — weaker CSP | |
| Headers via Vercel's `vercel.json` | Static-only; can't generate per-request nonce | |

**Auto choice rationale:** Next 16's documented CSP-nonce pattern uses both files. Static headers (HSTS, X-Frame-Options, etc.) belong in next.config.ts; the per-request CSP nonce belongs in middleware. Splitting follows Next.js convention exactly.

---

## Production Seed Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Separate `prisma/seed.prod.ts` (admin only, idempotent) | Clean separation; never seeds demo data in prod | ✓ |
| Reuse `prisma/seed.ts` with `if (NODE_ENV === 'production')` branches | Risky — branching seed grows in complexity | |
| One-shot Vercel deploy hook | Tied to Vercel platform; harder to re-run | |
| Manual SQL via console | No idempotency guarantee | |

**Auto choice rationale:** Two seed files = two clear responsibilities. Production seed is one-shot manual run after first deploy; never auto-runs.

---

## Vercel Project Config

| Option | Description | Selected |
|--------|-------------|----------|
| Vercel Project Settings UI for env vars + minimal/no `vercel.json` + custom build command (`prisma migrate deploy && next build`) | Idiomatic Vercel; no extra config file | ✓ |
| Full `vercel.json` with all settings | Forces config drift between UI and file | |
| Build command in `package.json` `"build": "..."` | Couples build pipeline to npm script (less flexible per-env) | |
| GitHub Actions wrapper around Vercel CLI | Premature CI complexity for v3.0 | |

**Auto choice rationale:** Trust Vercel defaults. Override only the build command to add `migrate deploy`. Add `vercel.json` later only if defaults don't suffice.

---

## Cross-User Isolation Test Expansion

| Option | Description | Selected |
|--------|-------------|----------|
| Extend existing `isolation.test.ts` (queries) + create new `isolation-actions.test.ts` (mutations) | Catches IDOR risk where it concentrates (mutations) | ✓ |
| Extend only existing file | Misses Server Action attack surface | |
| New test file only | Loses query-level coverage continuity | |
| Page-level Playwright tests | Slow; query-layer tests are faster + tighter | |

**Auto choice rationale:** Phase 27 established query-level isolation; Phase 29 proved backup-code mutation isolation. Phase 30 generalizes the mutation defense to every Server Action — that's the highest-ROI addition.

---

## Boot-Time Env Validation

| Option | Description | Selected |
|--------|-------------|----------|
| `src/lib/env.ts` validator module — runs on first import, throws on missing/malformed | Single source of truth; catches misconfig before first request | ✓ |
| Per-module `process.env.X` lookups (current state) | Drift-prone; misses can ship to prod | |
| Zod env schema | Same idea but heavier dep surface for what's a 9-key map | |
| Runtime-only validation (per-request) | Performance cost on every request | |

**Auto choice rationale:** Cross-cutting safety net. The cost is one synchronous function call at cold start; the value is preventing the entire class of "AUTH_SECRET empty in prod" bugs. Manual `process.env` lookups stay only in `validatedEnv` itself.

---

## Migration Runtime

| Option | Description | Selected |
|--------|-------------|----------|
| `prisma migrate deploy` in Vercel build command | Idempotent; fail-fast on bad migration | ✓ |
| `prisma migrate deploy` at app boot | Risk of double-run across serverless instances | |
| Manual migration via `vercel env pull` + local CLI | Too easy to forget on hotfix deploys | |
| GitHub Action pre-deploy step | Adds CI plumbing; defer to v4.x | |

**Auto choice rationale:** Vercel's build environment has access to direct connection URL; `prisma migrate deploy` is idempotent (no-op when nothing pending); failure blocks the deploy — exactly the right safety property.

---

## Smoke Tests Post-Deploy

| Option | Description | Selected |
|--------|-------------|----------|
| Manual checklist in `30-VERIFICATION.md` covering 11 items end-to-end | Operator-friendly; catches what Playwright can't (real Upstash, real authenticator app) | ✓ |
| Fully automated Playwright in CI against prod URL | Real Upstash rate limit can't be triggered safely from CI | |
| Synthetic monitor (Vercel's, Pingdom, etc.) | Out of scope for v3.0 deploy; v4.x | |
| Skip — assume tests pre-deploy are sufficient | Phase 29 proved why integration ≠ production parity | |

**Auto choice rationale:** Real smoke can only happen with real production env (real Upstash, real Vercel-Postgres, real authenticator on a real phone). The 11-item checklist is the floor.

---

## Logs / Observability

| Option | Description | Selected |
|--------|-------------|----------|
| Vercel built-in logs only + `DEBUG` guardrail at boot | Sufficient for single-admin v3.0 | ✓ |
| Sentry for errors | v4.x — adds dep + signup + cost | |
| Datadog / New Relic | Heavy for single-user app | |
| Custom Pino logger to a log sink | Premature; Vercel already aggregates | |

**Auto choice rationale:** Centik is single-admin. Vercel's deployment + function logs are accessible from the dashboard. Adding observability infra before there's something to observe is premature.

---

## Claude's Discretion (left to downstream agents)

- Exact CSP header string formatting (line-wrap vs single line in middleware)
- Whether `vercel.json` ends up needed (start without; add only if Vercel defaults insufficient)
- Whether to add `prisma/migrations.test.ts` for migrations-replay assertion
- Plan-file split (suggested in CONTEXT: 1 schema/Prisma + 1 headers + 1 seed + 1 vercel-config + 1 isolation-tests; planner's call to bundle differently)
- Named-export vs default-export shape of `src/lib/env.ts`
- Exact text/ordering of the smoke checklist beyond the 11 floor items

## Deferred Ideas (out of phase scope)

- CI/CD beyond Vercel git-integration
- Sentry / Datadog / structured logger
- Custom domain + DNS automation
- Multi-region / edge runtime
- WAF / Cloudflare in front of Vercel
- Automated dependency scanning
- Uptime monitoring
- Prisma Postgres backup/restore runbook
- Admin action audit log
- Email delivery for invites
- Password reset flow
- Per-IP geo / device fingerprint heuristics
- COOP/COEP headers
- CSP report-uri / report-to

---

*Generated 2026-04-21 by `/gsd-discuss-phase 30 --auto`.*
