# Centik — Retrospective

## Milestone: v1.0 — MVP

**Shipped:** 2026-04-06
**Phases:** 11 | **Plans:** 27 | **Duration:** 2 days

### What Was Built
- Complete personal finance tracking app for Mexican quincenal cycle
- Dashboard with 6 KPIs + 3 Recharts charts
- Transaction quick-add (<30s), filterable list, URL-persisted filters
- Debt tracking with credit card utilization + loan progress bars
- Quincenal budgeting with traffic-light progress
- Income management with frequency-based equivalents
- Annual history with atomic period close ($transaction across 5 tables)
- Responsive layout (sidebar desktop, bottom tabs mobile, floating FAB)
- Toast notifications, blur validation, focus rings, semantic HTML

### What Worked
- **Auto mode pipeline:** discuss → plan → verify → execute chained smoothly across all 11 phases
- **Established patterns early:** Phase 5 (Income Sources) set the Server Action + TDD + inline delete pattern that Phase 6-10 replicated without discussion
- **Plan checker caught real issues:** Atomicity contradiction in Phase 10 key_links would have broken the $transaction
- **Skipping discussion for well-documented features:** Phases 7-11 where DFR.md/UX_RULES.md had complete specs ran faster without discussion overhead
- **Parallel Wave 1 execution:** Phase 6 (categories + transactions) ran two plans in parallel (Wave 1) saving time

### What Was Inefficient
- **Research timeouts:** Phase 6 researcher timed out — established patterns made research redundant for later phases anyway
- **Verification iterations:** Phases 4, 5, 6, 10 each needed 2 verification iterations to resolve Nyquist/key_link issues
- **CLAUDE.md vs reality:** CLAUDE.md references pnpm but user chose npm; references Next.js 14+ but 16 was installed — reconciliation was necessary in Phase 1

### Patterns Established
- Server Component → Prisma fetch → serializeBigInts → Client Component wrapper pattern
- Server Actions: Zod validate → Prisma mutate → revalidatePath (never API routes)
- Inline delete: useState + useEffect + setTimeout (3s auto-revert)
- TDD for all utilities and Server Actions
- Spanish Zod messages with i18n-ready structure
- Period-aware pages via URL search params (?month=X&year=Y)
- Budget copy inlined in $transaction for atomicity (don't call external functions)

### Key Lessons
- **Skip research for pattern-replication phases:** Once the pattern is established (Phase 5), later phases benefit more from planning time than research time
- **Plan checker pays for itself on critical mutations:** The $transaction atomicity catch in Phase 10 prevented a real data corruption path
- **Version reconciliation must happen first:** Phase 1 discovering Next.js 16 / Tailwind v4 / Prisma 7 differences was essential — every subsequent phase built on correct patterns

### Cost Observations
- Model mix: Opus for research + planning, Sonnet for verification, inherited for execution
- Profile: Quality (user choice)
- Notable: 27 plans executed with 0 failures — the discuss → plan → verify → execute pipeline maintained quality across all phases

---

## Cross-Milestone Trends

| Metric | v1.0 |
|--------|------|
| Phases | 11 |
| Plans | 27 |
| Tests | 394 |
| LOC | 13,696 |
| Duration | 2 days |
| Failures | 0 |
| Verification iterations | 6 (across phases 4, 5, 6, 10) |
