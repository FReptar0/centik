# Phase 3: Foundation Libraries - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Build all shared utility functions (`formatMoney`, `toCents`, `parseCents`, `formatRate`, `formatUnitAmount`, `serializeBigInts`), Zod validation schemas for all mutation endpoints, `cn()` utility for conditional class names, TypeScript types, and constants. Every function must have 100% test coverage. This is the foundation — everything downstream depends on it being bulletproof.

</domain>

<decisions>
## Implementation Decisions

### toCents() — string-split parsing
- **API change from CLAUDE.md:** `toCents(input: string): string` — takes string, NOT number
- Implementation: split on decimal point, concatenate integer + fractional parts, pad/trim to 2 decimals
- No float arithmetic anywhere in the conversion path — money never touches JavaScript floats
- Example: `toCents("150.75")` → `"15075"`, `toCents("1500")` → `"150000"`
- This overrides CLAUDE.md's `toCents(pesos: number)` signature — the research finding about float contamination takes precedence

### Zod error messages — i18n-ready Spanish
- Default language: Spanish (matches target user and UI)
- Custom messages on EVERY field — required, type, constraints all get descriptive messages
- Structure messages so they can be swapped for English later (e.g., message constants or a message map)
- Example: `{ message: "El monto es requerido" }`, `{ message: "La categoría no es válida" }`
- Non-obvious validations get especially descriptive messages: "El monto debe ser un número entero no negativo en centavos"

### Other utilities (from CLAUDE.md — no changes)
- `formatMoney(centsStr: string): string` — Intl.NumberFormat es-MX, MXN currency
- `parseCents(value: string): bigint` — BigInt(value)
- `formatRate(bps: number): string` — basis points to percentage display
- `formatUnitAmount(amountStr: string, precision: number): string` — variable precision display
- `serializeBigInts<T>(obj: T): T` — recursive BigInt → String conversion for JSON
- `cn(...inputs): string` — clsx + tailwind-merge

### Zod schemas (from CLAUDE.md — all specified)
- `createTransactionSchema`, `createDebtSchema`, `updateDebtBalanceSchema`
- `createBudgetSchema`, `createIncomeSourceSchema`
- `createAssetSchema`, `createValueUnitSchema`
- `createCategorySchema` (for custom categories)
- Each schema has a brief comment explaining what endpoint it validates

### Test coverage
- 100% coverage on all `src/lib/` files — non-negotiable
- Edge cases: zero, negative, large amounts, empty strings, malformed inputs
- Zod schemas: valid input passes, invalid input fails with correct Spanish error messages

### Claude's Discretion
- Exact i18n structure (message constants file vs inline vs Zod custom error map)
- Whether to split validators.ts into multiple files if it exceeds 300 lines
- Additional edge cases for test coverage beyond the specified ones
- TypeScript type definitions in `src/types/index.ts` — derive from Prisma where possible

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/prisma.ts`: PrismaClient singleton — already configured, don't touch
- `src/types/index.ts`: Empty placeholder — fill with shared types
- `generated/prisma/client`: Prisma-generated types available for re-export or extension
- `vitest.config.mts`: Unit test config with jsdom, v8 coverage — ready to use
- `clsx` and `tailwind-merge`: Already installed as dependencies (Phase 1)

### Established Patterns
- Prisma 7 generates typed client at `generated/prisma/client`
- ESLint + Prettier configured and passing
- Vitest with `passWithNoTests: true` — ready for first real tests

### Integration Points
- `src/lib/utils.ts`: New file — all formatting/conversion utilities
- `src/lib/serialize.ts`: New file — BigInt serialization
- `src/lib/validators.ts`: New file — Zod schemas (may split if >300 lines)
- `src/lib/constants.ts`: New file — colors, category defaults, shared constants
- `src/types/index.ts`: Fill with shared TypeScript types
- Each `.ts` file gets a co-located `.test.ts` file

</code_context>

<specifics>
## Specific Ideas

- The `toCents()` string-split approach is a deliberate deviation from CLAUDE.md to prevent float contamination — document this decision in a code comment
- Spanish Zod messages should feel natural, not machine-translated — "El monto es requerido" not "Cantidad es requerida"
- The i18n readiness is for future English support, not for building a full i18n system now

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-foundation-libraries*
*Context gathered: 2026-04-05*
