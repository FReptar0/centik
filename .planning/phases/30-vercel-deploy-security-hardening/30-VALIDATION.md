---
phase: 30
slug: vercel-deploy-security-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-21
---

# Phase 30 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source-of-truth signals enumerated in `30-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (unit + integration) + `curl -I` smoke (headers) |
| **Config file** | `vitest.config.ts` (unit) + `vitest.integration.config.mts` (integration) |
| **Quick run command** | `npm run test:run -- src/lib/env.test.ts src/proxy.test.ts` |
| **Full suite command** | `npm run quality && npm run test:integration` |
| **Estimated runtime** | ~15 s quick, ~140 s full |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:run` scoped to the file(s) just modified.
- **After every plan wave:** Run `npm run test:run` + `npm run test:integration`.
- **Before `/gsd-verify-work`:** Full suite must be green; `npm run quality` exits 0; `curl -I http://localhost:3000/login` shows all 6 security headers.
- **Max feedback latency:** 30 s unit, 150 s full.

---

## Per-Task Verification Map

> Pre-allocated against the 6-plan decomposition in RESEARCH. Planner may renumber; replace Task IDs accordingly.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 30-01-01 | 01 | 0 | DEPLOY-01 | T-30-DEPLOY-001 | `prisma.config.ts` uses `DATABASE_URL` for runtime + `DIRECT_URL` for migrations | unit | `grep -q "DATABASE_URL" prisma.config.ts && grep -q "DIRECT_URL" prisma.config.ts` | ❌ W0 | ⬜ pending |
| 30-01-02 | 01 | 0 | DEPLOY-01 | — | `.env.example` documents DATABASE_URL + DIRECT_URL contract | unit | `grep -q "DATABASE_URL=" .env.example && grep -q "DIRECT_URL=" .env.example` | ❌ W0 | ⬜ pending |
| 30-02-01 | 02 | 1 | — | T-30-ENV-001 | `src/lib/env.ts` throws on missing/malformed production vars | unit | `npx vitest run src/lib/env.test.ts` | ❌ W0 | ⬜ pending |
| 30-02-02 | 02 | 1 | — | T-30-ENV-002 | Production-only guard: `RATE_LIMIT_DISABLED=true` + `NODE_ENV=production` → throw | unit | `npx vitest run src/lib/env.test.ts -t 'production.*RATE_LIMIT_DISABLED'` | ❌ W0 | ⬜ pending |
| 30-02-03 | 02 | 1 | — | — | `src/lib/totp-crypto.ts`, `src/lib/rate-limit.ts`, `src/auth.ts` consume `validatedEnv` (sweep) | unit | `! grep -rn "process\.env\.AUTH_SECRET\|process\.env\.AUTH_TOTP_ENCRYPTION_KEY\|process\.env\.UPSTASH_" src/ --include="*.ts" \| grep -v "src/lib/env.ts"` | ❌ W0 | ⬜ pending |
| 30-03-01 | 03 | 2 | DEPLOY-02 | T-30-CSP-001 | `next.config.ts` `async headers()` returns HSTS + X-Frame-Options + X-Content-Type-Options + Referrer-Policy + Permissions-Policy on `/(.*)` | unit | `grep -q "Strict-Transport-Security" next.config.ts && grep -q "X-Frame-Options" next.config.ts && grep -q "Referrer-Policy" next.config.ts` | ❌ W0 | ⬜ pending |
| 30-03-02 | 03 | 2 | DEPLOY-02 | T-30-CSP-002 | HSTS emitted only in production (NODE_ENV gate) | unit | `grep -B2 -A2 "Strict-Transport-Security" next.config.ts \| grep -q "production"` | ❌ W0 | ⬜ pending |
| 30-03-03 | 03 | 2 | DEPLOY-02 | T-30-CSP-003 | `src/proxy.ts` generates per-request nonce + injects `x-nonce` request header + sets `Content-Security-Policy` response header | unit | `grep -q "randomBytes" src/proxy.ts && grep -q "Content-Security-Policy" src/proxy.ts && grep -q "x-nonce" src/proxy.ts` | ❌ W0 | ⬜ pending |
| 30-03-04 | 03 | 2 | DEPLOY-02 | — | CSP policy contains `'self'`, `'nonce-${nonce}'`, `'strict-dynamic'`, `data:`, `blob:`, `https://*.upstash.io`, `frame-ancestors 'none'` | unit | `grep -q "nonce-" src/proxy.ts && grep -q "strict-dynamic" src/proxy.ts && grep -q "upstash.io" src/proxy.ts && grep -q "frame-ancestors" src/proxy.ts` | ❌ W0 | ⬜ pending |
| 30-03-05 | 03 | 2 | DEPLOY-02 | — | Existing `src/proxy.ts` auth-redirect behavior preserved | unit | `npx vitest run src/proxy.test.ts` | ❌ W0 | ⬜ pending |
| 30-04-01 | 04 | 2 | DEPLOY-03 | T-30-SEED-001 | `prisma/seed.prod.ts` exists; creates admin-only; idempotent; no password rotation | unit | `ls prisma/seed.prod.ts && grep -q "ADMIN_EMAIL" prisma/seed.prod.ts && grep -q "upsert" prisma/seed.prod.ts && ! grep -q "hashedPassword:" prisma/seed.prod.ts \|\| grep -A10 "update:" prisma/seed.prod.ts \| grep -qv "hashedPassword"` | ❌ W0 | ⬜ pending |
| 30-04-02 | 04 | 2 | DEPLOY-03 | T-30-SEED-002 | Seed script fails fast on missing ADMIN_EMAIL or ADMIN_PASSWORD | unit | `grep -q "throw.*ADMIN_" prisma/seed.prod.ts \|\| grep -q "required" prisma/seed.prod.ts` | ❌ W0 | ⬜ pending |
| 30-04-03 | 04 | 2 | DEPLOY-03 | — | `package.json` scripts has `db:seed:prod` entry | unit | `node -e "require('./package.json').scripts['db:seed:prod']" \|\| exit 1` | ❌ W0 | ⬜ pending |
| 30-04-04 | 04 | 2 | DEPLOY-03 | — | Seed creates no demo data (no Category, no Debt, no Transaction, no IncomeSource writes) | unit | `! grep -E "category\.create\|debt\.create\|transaction\.create\|incomeSource\.create" prisma/seed.prod.ts` | ❌ W0 | ⬜ pending |
| 30-05-01 | 05 | 2 | ISOL-05, TEST-03 | T-30-IDOR-001 | `tests/integration/isolation.test.ts` extended with MonthlySummary + Asset + ValueUnit + UnitRate + BackupCode tests | integration | `npm run test:integration -- --run tests/integration/isolation.test.ts -t "MonthlySummary\|Asset\|BackupCode"` | ❌ W0 | ⬜ pending |
| 30-05-02 | 05 | 2 | ISOL-05, TEST-03 | T-30-IDOR-002 | NEW `tests/integration/isolation-actions.test.ts` exercises ≥10 mutation Server Actions with cross-user targeting | integration | `ls tests/integration/isolation-actions.test.ts && grep -c "^\s*it\(" tests/integration/isolation-actions.test.ts \| awk '$1>=10'` | ❌ W0 | ⬜ pending |
| 30-05-03 | 05 | 2 | ISOL-05, TEST-03 | T-30-IDOR-002 | Every mutation Server Action returns error OR silent no-op when current user attacks another user's row | integration | `npm run test:integration -- --run tests/integration/isolation-actions.test.ts` | ❌ W0 | ⬜ pending |
| 30-06-01 | 06 | 3 | DEPLOY-04 | — | `30-VERIFICATION.md` documents 11-item smoke checklist (real authenticator + real Upstash + headers + IDOR UI) | manual | `ls .planning/phases/30-vercel-deploy-security-hardening/30-VERIFICATION.md && grep -c "^\s*[0-9]\+\." .planning/phases/30-vercel-deploy-security-hardening/30-VERIFICATION.md \| awk '$1>=11'` | ❌ W0 | ⬜ pending |
| 30-06-02 | 06 | 3 | DEPLOY-04 | — | Deploy runbook covers env-var setup (UI), build-command override (`npx prisma migrate deploy && next build`), first-time seed (`npm run db:seed:prod`), HSTS preload submission | manual | `grep -q "migrate deploy" .planning/phases/30-vercel-deploy-security-hardening/30-VERIFICATION.md && grep -q "db:seed:prod" .planning/phases/30-vercel-deploy-security-hardening/30-VERIFICATION.md && grep -q "hstspreload.org" .planning/phases/30-vercel-deploy-security-hardening/30-VERIFICATION.md` | ❌ W0 | ⬜ pending |
| 30-06-03 | 06 | 3 | ISOL-05, DEPLOY-01..04, TEST-03 | — | Full quality gate green: `npm run build && npm run lint && npm run format:check && npm run test:run && npm run test:integration` | quality | `npm run quality && npm run test:integration` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/env.test.ts` — stub file for the new env validator (exists empty; Plan 30-02 fills in)
- [ ] `src/proxy.test.ts` — stub file for the proxy CSP test (exists empty; Plan 30-03 fills in)

(No new Prisma migration, no new package installs — Phase 30 is infra/config/tests only. Prisma 7.6 is already installed; `prisma.config.ts` already exists.)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Vercel deploy succeeds with all env vars configured | DEPLOY-04 | Requires real Vercel account + Marketplace provisioning of Prisma Postgres | 30-VERIFICATION.md step 1-4 |
| Production seed creates admin once (idempotent) | DEPLOY-03 | Requires real production DB | 30-VERIFICATION.md step 5: `vercel env pull && npm run db:seed:prod` twice; verify admin exists, password NOT rotated |
| HSTS emitted only in prod | DEPLOY-02 | Requires prod deploy | `curl -I https://<app>.vercel.app/login` → Strict-Transport-Security present; `curl -I http://localhost:3000/login` → absent |
| Real Upstash rate limit fires at 6th attempt | TOTP-05 (Phase 29), DEPLOY-04 | Real Upstash credentials only in prod | 30-VERIFICATION.md step 10 |
| Real authenticator app scans QR + issues valid code | TOTP-01 (Phase 29), DEPLOY-04 | Requires a phone | 30-VERIFICATION.md step 5-8 (phone-in-the-loop) |
| HSTS preload list submission | DEPLOY-02 | External process via hstspreload.org | 30-VERIFICATION.md step 11 (submit after 1 week of stable prod) |
| Tailwind v4 + CSP style-src compatibility in browser | DEPLOY-02 | Runtime browser verification | 30-VERIFICATION.md step 9: DevTools Console shows zero CSP violations on dashboard page |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (smoke/manual is OK for Plan 06 by design)
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30 s quick / 150 s full
- [ ] `nyquist_compliant: true` set in frontmatter after planner finalizes task IDs

**Approval:** pending — awaits gsd-planner and gsd-plan-checker
