# Centik

## What This Is

Centik is an open-source personal finance tracking web app designed for the Mexican quincenal (biweekly) pay cycle. It provides a complete financial dashboard with 6 KPIs and 3 charts, quick transaction registration (<30 seconds), debt tracking with health indicators, quincenal budgeting with traffic-light progress bars, income management, and annual history with atomic period close. Dark-themed, responsive (desktop sidebar + mobile bottom tabs), single-user, manual entry — no bank connections.

## Core Value

A single user can register a financial transaction in under 30 seconds and immediately see how it impacts their budget, debt ratio, and savings rate across all views.

## Requirements

### Validated

- ✓ Dashboard with 6 KPIs + 3 Recharts charts + recent transactions — v1.0
- ✓ Quick transaction registration (<30 seconds via FAB modal) — v1.0
- ✓ Transaction CRUD with filterable list, URL-persisted filters, "Cargar más" pagination — v1.0
- ✓ Credit card debt tracking (utilization bar, dates, estimated interest) — v1.0
- ✓ Personal loan tracking (progress bar, remaining months, total remaining) — v1.0
- ✓ Manual debt balance updates (inline edit) — v1.0
- ✓ Quincenal budget input with auto-calculated monthly/semester/annual views — v1.0
- ✓ Budget progress bars with traffic light system — v1.0
- ✓ Income source management with frequency-based monthly equivalents — v1.0
- ✓ Annual history pivot table with atomic period close ($transaction across 5 tables) — v1.0
- ✓ Read-only mode for closed periods with ghost reopen button — v1.0
- ✓ Auto-create current period on app load — v1.0
- ✓ Category management with preset icon/color pickers — v1.0
- ✓ Dark mode UI with cyan accent, responsive sidebar/bottom tabs — v1.0
- ✓ Toast notifications (sonner), blur validation, focus rings, semantic HTML, tabular-nums — v1.0
- ✓ Glyph Finance design system — STYLE_GUIDE.md rewritten with Nothing OS-inspired tokens (OLED black, chartreuse, IBM Plex Mono + Satoshi) — v1.1
- ✓ Glyph Finance UX rules — UX_RULES.md updated with icon-only nav, custom numpad, battery-bar progress, underline inputs — v1.1
- ✓ Glyph Finance reference sync — CLAUDE.md styling section synchronized, zero contradictions — v1.1

### Active

- [ ] Implement Glyph Finance design in code (tokens, components, animations)
- [ ] System of value units (UDI, UMA, USD) with configurable rate providers
- [ ] Asset/investment tracking (PPR, CETES, funds) with MXN conversion
- [ ] Authentication (NextAuth/Clerk) for multi-user support
- [ ] PWA with offline support

### Out of Scope

- Bank API connections — manual entry only, bank APIs in Mexico are unreliable
- AI/ML features — no predictions, recommendations, or automated categorization
- Statement scraping — no PDF/CSV import
- Complex investments (options, futures, rebalancing)
- Light mode — dark-only is the design decision
- Real-time notifications — not needed for single-user

## Context

- **Shipped:** v1.0 MVP with 13,696 lines of TypeScript across 102 source files
- **Tech stack (actual):** Next.js 16.2.2 + React 19.2.4 + Tailwind v4 + Prisma 7 + Recharts + Zod v4 + Vitest + npm
- **Tests:** 394 unit tests passing, 100% coverage on src/lib/
- **Database:** 10 Prisma models (7 MVP + 3 v2 stubs), idempotent seed with realistic demo data
- **Target market:** Mexican personal finance, quincenal pay cycle
- **Monetization:** None — open source, code quality and documentation are priorities
- **Documentation:** DFR.md, STYLE_GUIDE.md (Glyph Finance v1.1), UX_RULES.md (Glyph Finance v1.1), DATA_FLOW.md all remain as reference
- **Design system:** Glyph Finance — OLED black (#000000), chartreuse (#CCFF00) accent, IBM Plex Mono + Satoshi typography, docs-only (not yet implemented in code)

## Constraints

- **Tech stack:** Next.js 16 App Router, TypeScript strict, PostgreSQL/Docker, Prisma 7, Tailwind v4 CSS-first, Recharts, Zod v4, Vitest+Playwright, npm
- **Quality:** Zero `any`, zero skipped tests, every endpoint Zod-validated, Quality Loop before every commit
- **Monetary:** All money as BigInt centavos, never float. toCents() uses string-split parsing (no float contamination)
- **Iconography:** Lucide React exclusively, no emojis. DynamicIcon with static import map (~30 icons)
- **Serialization:** BigInt→String via serializeBigInts() at Server Component boundary
- **i18n:** Spanish by default (nav labels, Zod messages), i18n-ready structure (constants files)
- **Open source:** Files <300 lines, functions <50 lines (2 components slightly exceed — noted for refactor)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| BigInt centavos for all money | Eliminates floating point errors entirely | ✓ Good |
| Basis points for interest rates | 4500 = 45.00%, two decimal precision without floats | ✓ Good |
| No auth in MVP | Single user app, complexity not justified | ✓ Good |
| Dark mode only | Finance apps benefit from calm aesthetic; reduces scope | ✓ Good |
| npm over pnpm | User preference despite CLAUDE.md specifying pnpm | ✓ Good |
| toCents() string-split parsing | Prevents float contamination at the input boundary | ✓ Good |
| Tailwind v4 CSS @theme | No tailwind.config.ts needed, native dark palette | ✓ Good |
| Server Actions over API routes | Less boilerplate, better type safety for mutations | ✓ Good |
| Inline budget copy in $transaction | copyBudgetsFromPreviousPeriod uses external Prisma instance — inline for atomicity | ✓ Good |
| Zod v4 Spanish messages | { error: "..." } syntax, z.locales.es() fallback | ✓ Good |
| Period state via URL params | Compatible with Server Component data fetching, bookmarkable | ✓ Good |
| FAB separate from tab bar | Avoids confusion about [+] context — always means "new transaction" | ✓ Good |
| IBM Plex Mono for financial numbers | Industrial precision feel, replaces JetBrains Mono | ✓ Good |
| Satoshi for headings/body | Geometric sans replacing DM Sans, pairs well with monospace | ✓ Good |
| OLED black (#000000) background | Pure black for depth, Nothing OS-inspired | ✓ Good |
| Chartreuse (#CCFF00) accent | Electric, distinctive, high contrast on black | ✓ Good |
| Pill-shaped buttons (radius-full) | Strong visual identity, Nothing OS aesthetic | ✓ Good |
| Segmented battery-bar progress | Replaces smooth bars, quantized digital feel | ✓ Good |
| Underline-only inputs everywhere | Minimal, elegant, consistent across all forms | ✓ Good |
| Drop all shadows | Elevation via background-shift only, cleaner aesthetic | ✓ Good |
| Docs-only v1.1 milestone | Design system documented before implementation, Stitch validation first | — Pending |

---
*Last updated: 2026-04-06 after v1.1 milestone*
