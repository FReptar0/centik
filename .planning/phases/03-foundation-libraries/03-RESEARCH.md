# Phase 3: Foundation Libraries - Research

**Researched:** 2026-04-05
**Domain:** TypeScript utilities, Zod v4 validation, BigInt serialization, money handling
**Confidence:** HIGH

## Summary

Phase 3 builds the complete foundation library layer: utility functions for money formatting/conversion, BigInt serialization, Zod validation schemas for all mutation endpoints, TypeScript type definitions, constants, and the `cn()` class name utility. All code lives in `src/lib/` and `src/types/` with co-located test files achieving 100% coverage.

The critical technical finding is that **Zod v4.3.6 is installed**, not v3. Zod v4 has significant API changes: the error customization API uses `{ error: ... }` instead of `{ message: ... }`, `z.nativeEnum()` is deprecated in favor of overloaded `z.enum()` that accepts Prisma enum objects directly, and string format validators moved to top-level (`z.email()`, `z.uuid()`). The Spanish locale is built in (`z.locales.es()`) and can serve as a fallback while per-field custom messages override it. Additionally, `@vitest/coverage-v8` is NOT installed despite being configured -- this must be fixed in Wave 0 before any coverage measurement.

**Primary recommendation:** Use Zod v4 API patterns throughout (not v3 patterns from CLAUDE.md training data). Set Spanish locale globally with `z.config(z.locales.es())`, then override with per-field `error` strings/functions for natural Spanish messages. Use `z.enum(PrismaEnumObject)` for all enum fields. Implement `toCents()` with string-split parsing as decided in CONTEXT.md.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **toCents() -- string-split parsing**: `toCents(input: string): string` -- takes string, NOT number. Implementation: split on decimal point, concatenate integer + fractional parts, pad/trim to 2 decimals. No float arithmetic anywhere in the conversion path. This overrides CLAUDE.md's `toCents(pesos: number)` signature.
- **Zod error messages -- i18n-ready Spanish**: Default language: Spanish. Custom messages on EVERY field. Structure messages so they can be swapped for English later.
- **100% test coverage on src/lib/**: Non-negotiable. Edge cases: zero, negative, large amounts, empty strings, malformed inputs.
- **All Zod schemas specified**: createTransactionSchema, createDebtSchema, updateDebtBalanceSchema, createBudgetSchema, createIncomeSourceSchema, createAssetSchema, createValueUnitSchema, createCategorySchema.
- **Other utilities unchanged from CLAUDE.md**: formatMoney, parseCents, formatRate, formatUnitAmount, serializeBigInts, cn.

### Claude's Discretion
- Exact i18n structure (message constants file vs inline vs Zod custom error map)
- Whether to split validators.ts into multiple files if it exceeds 300 lines
- Additional edge cases for test coverage beyond the specified ones
- TypeScript type definitions in `src/types/index.ts` -- derive from Prisma where possible

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FOUND-01 | `serializeBigInts()` correctly converts BigInt fields to String in nested objects and arrays | Verified JSON.stringify replacer pattern works for nested objects, arrays, and mixed types. Implementation pattern confirmed. |
| FOUND-02 | `formatMoney()` converts cents string to MXN currency display ($1,234.56) | Verified `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })` produces correct output. Node.js and browser APIs consistent. |
| FOUND-03 | `toCents()` converts user decimal input to cents string without float contamination | String-split approach verified: split on `.`, pad/trim fractional to 2 digits, concatenate. No float arithmetic. Edge cases documented. |
| FOUND-04 | `parseCents()` converts string to BigInt for DB operations | Trivial: `BigInt(value)`. Throws on invalid input which is desirable. |
| FOUND-05 | `formatRate()` converts basis points to percentage display (4500 -> "45.00%") | Verified: `(bps / 100).toFixed(2) + '%'`. Integer division by 100 is safe for display. |
| FOUND-06 | Zod schemas defined for all mutation endpoints | Zod v4.3.6 API researched. `z.enum()` accepts Prisma enum objects. `{ error: ... }` replaces `{ message: ... }`. Spanish locale built in. Per-field overrides confirmed working. |
| FOUND-07 | 100% test coverage on all utility functions and Zod schemas | Vitest 4.1.2 configured. **Missing dependency: `@vitest/coverage-v8` must be installed.** Coverage config already in vitest.config.mts. |
| FOUND-08 | `cn()` utility (clsx + tailwind-merge) for conditional class names | clsx 2.1.1 + tailwind-merge 3.5.0 installed. Pattern verified: `twMerge(clsx(inputs))`. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | 4.3.6 | Schema validation for all API inputs | Already installed. v4 has unified error API, built-in locales, native enum support |
| clsx | 2.1.1 | Conditional class name construction | Already installed. Lightweight, standard pattern |
| tailwind-merge | 3.5.0 | Merge conflicting Tailwind classes | Already installed. Required for `cn()` utility |
| vitest | 4.1.2 | Unit test runner | Already installed and configured |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vitest/coverage-v8 | (install latest) | V8 coverage provider | **MUST install** -- configured in vitest.config.mts but missing from dependencies |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zod custom messages | zod-i18n-map + i18next | Adds 2 dependencies for a single-user Spanish app. Per-field `error` strings are simpler and sufficient. |
| Global z.locales.es() only | Per-field custom messages | Built-in locale messages are generic ("Demasiado pequeno"). Custom messages are more natural and context-specific. |

**Installation (Wave 0):**
```bash
npm install --save-dev @vitest/coverage-v8
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  lib/
    utils.ts              # formatMoney, toCents, parseCents, formatRate, formatUnitAmount, cn
    utils.test.ts         # 100% coverage tests
    serialize.ts          # serializeBigInts
    serialize.test.ts     # Tests for nested, array, null, mixed-type cases
    validators.ts         # All Zod schemas (may split if >300 lines)
    validators.test.ts    # Valid/invalid/edge-case tests per schema
    constants.ts          # Category defaults, colors, semantic constants
    constants.test.ts     # Smoke tests for constant integrity
  types/
    index.ts              # Re-exported Prisma types + custom serialized types
```

### Pattern 1: Zod v4 Schema with Spanish Error Messages
**What:** Define schemas using Zod v4's `{ error: ... }` parameter with natural Spanish messages per field.
**When to use:** Every Zod schema in this phase.
**Example:**
```typescript
// Source: Verified against Zod v4.3.6 installed in project
import { z } from 'zod'
import { TransactionType, PaymentMethod } from '../../generated/prisma/client'

// Initialize Spanish locale as fallback for any unspecified messages
z.config(z.locales.es())

/** Validates POST /api/transactions request body */
export const createTransactionSchema = z.object({
  type: z.enum(TransactionType, {
    error: 'El tipo debe ser INCOME o EXPENSE',
  }),
  amount: z
    .string({ error: (iss) => (iss.input === undefined ? 'El monto es requerido' : 'El monto debe ser texto') })
    .regex(/^\d+$/, { error: 'El monto debe ser un numero entero no negativo en centavos' }),
  categoryId: z.string({ error: 'La categoria es requerida' }),
  date: z.iso.date({ error: 'La fecha debe tener formato YYYY-MM-DD' }),
  description: z.string().optional(),
  paymentMethod: z.enum(PaymentMethod, { error: 'Metodo de pago no valido' }).optional(),
  notes: z.string().optional(),
  incomeSourceId: z.string().optional(),
})
```

### Pattern 2: toCents String-Split Implementation (No Float Math)
**What:** Convert user decimal input to cents string using pure string manipulation.
**When to use:** When converting user-facing peso amounts to centavo strings for API submission.
**Example:**
```typescript
// Source: Verified with Node.js testing
/**
 * Converts a decimal peso string to centavos string.
 * Uses string-split parsing to avoid float contamination.
 * Overrides CLAUDE.md toCents(number) signature per Phase 3 decision.
 */
export function toCents(input: string): string {
  const trimmed = input.trim()
  if (trimmed === '') {
    throw new Error('Input cannot be empty')
  }

  const parts = trimmed.split('.')
  if (parts.length > 2) {
    throw new Error('Invalid decimal format')
  }

  const intPart = parts[0] || '0'
  let fracPart = parts[1] || ''

  if (!/^\d+$/.test(intPart)) {
    throw new Error('Invalid integer part')
  }
  if (fracPart !== '' && !/^\d+$/.test(fracPart)) {
    throw new Error('Invalid fractional part')
  }

  // Pad to 2 decimal places or truncate beyond 2
  fracPart = fracPart.padEnd(2, '0').slice(0, 2)

  const cents = intPart + fracPart
  // Remove leading zeros but keep at least '0'
  return cents.replace(/^0+/, '') || '0'
}
```

### Pattern 3: serializeBigInts Generic Function
**What:** Recursively convert all BigInt values to strings in any object/array structure.
**When to use:** Before every `NextResponse.json()` call or returning props from Server Components.
**Example:**
```typescript
// Source: Verified with Node.js testing
export function serializeBigInts<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  )
}
```

### Pattern 4: TypeScript Types Derived from Prisma
**What:** Re-export Prisma-generated types and create serialized variants where BigInt becomes string.
**When to use:** For API response types and component props.
**Example:**
```typescript
// src/types/index.ts
export type {
  IncomeSource,
  Transaction,
  Category,
  Debt,
  Budget,
  Period,
  MonthlySummary,
  ValueUnit,
  UnitRate,
  Asset,
} from '../../generated/prisma/client'

export {
  TransactionType,
  Frequency,
  DebtType,
  PaymentMethod,
  CategoryType,
  AssetCategory,
} from '../../generated/prisma/client'

/** Serialized version where BigInt fields become string (for API responses) */
export type SerializedTransaction = Omit<Transaction, 'amount'> & {
  amount: string
}
// ... similar for other models with BigInt fields
```

### Anti-Patterns to Avoid
- **Using `{ message: ... }` in Zod schemas:** This is Zod v3 syntax. Zod v4 uses `{ error: ... }`. The old syntax will silently be ignored, producing default error messages.
- **Using `z.nativeEnum()` for Prisma enums:** Deprecated in Zod v4. Use `z.enum(PrismaEnumObject)` instead -- it accepts the same object shape Prisma exports.
- **Using `z.string().email()` or `.uuid()`:** In Zod v4, format validators moved to top-level: `z.email()`, `z.uuid()`. The method form may still work but is not the recommended API.
- **Using float math in toCents:** `Math.round(pesos * 100)` has float contamination. Always use string-split approach per locked decision.
- **Passing raw Prisma results to components:** Always serialize through `serializeBigInts()` first.
- **Using `JSON.stringify()` directly on BigInt-containing objects:** Throws `TypeError: Do not know how to serialize a BigInt`. Always use `serializeBigInts()`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Conditional CSS classes | Custom string concatenation | `cn()` = `twMerge(clsx(...))` | Handles Tailwind conflicts, falsy values, arrays |
| Zod locale fallback | Custom error mapping logic | `z.config(z.locales.es())` | Built-in Spanish locale covers all unspecified messages |
| Currency formatting | Custom string formatting | `Intl.NumberFormat('es-MX', ...)` | Handles grouping, decimal, currency symbol correctly for Mexican locale |
| Percentage formatting | Template literals | `(bps / 100).toFixed(2) + '%'` | Simple but must be consistent across the app |
| BigInt serialization | Per-field conversion | `serializeBigInts()` with JSON.stringify replacer | Handles arbitrary nesting depth automatically |

**Key insight:** The foundation library is entirely pure functions with no side effects and no I/O. This makes it trivially testable with 100% coverage. Every function takes simple inputs and returns simple outputs.

## Common Pitfalls

### Pitfall 1: Zod v4 Error API Confusion
**What goes wrong:** Using `{ message: "..." }` instead of `{ error: "..." }` produces default messages, not custom ones.
**Why it happens:** CLAUDE.md examples and most training data reference Zod v3 patterns.
**How to avoid:** Always use `{ error: "..." }` or `{ error: (iss) => "..." }`. Test that custom messages actually appear in error output.
**Warning signs:** Seeing "Expected string, received number" instead of Spanish custom messages in tests.

### Pitfall 2: z.nativeEnum() Deprecation
**What goes wrong:** Using `z.nativeEnum(TransactionType)` works but is deprecated and may emit warnings.
**Why it happens:** Zod v3 patterns in training data.
**How to avoid:** Use `z.enum(TransactionType)` -- Zod v4's overloaded `z.enum()` accepts enum-like objects directly.
**Warning signs:** Deprecation warnings in test output.

### Pitfall 3: toCents() Edge Cases
**What goes wrong:** Inputs like `".50"`, `"0"`, `"1500."`, `"99.999"`, empty string, or whitespace-only string.
**Why it happens:** Real user input is unpredictable.
**How to avoid:** Handle: leading dot (`.50` -> `"50"`), trailing dot (`1500.` -> `"150000"`), no decimal (`1500` -> `"150000"`), extra fractional digits truncated (`99.999` -> `"9999"`), empty/whitespace throws.
**Warning signs:** Tests passing with happy-path inputs but failing with edge cases.

### Pitfall 4: formatMoney() with Large Numbers
**What goes wrong:** `Number(centsStr)` loses precision for amounts above `Number.MAX_SAFE_INTEGER` (9007199254740991 centavos = ~$90 billion).
**Why it happens:** JavaScript Number has limited precision.
**How to avoid:** For this personal finance app, amounts will never exceed safe integer range. Document this assumption. If needed in the future, use BigInt division + manual formatting.
**Warning signs:** Tests with amounts above 10^15 showing incorrect formatting.

### Pitfall 5: Missing @vitest/coverage-v8
**What goes wrong:** `npm run test:coverage` fails with "MISSING DEPENDENCY" error.
**Why it happens:** vitest.config.mts configures v8 coverage provider but the package was never installed.
**How to avoid:** Install it as a dev dependency in Wave 0 before any coverage measurement.
**Warning signs:** Coverage reports not generating despite config being present.

### Pitfall 6: Import Path for Prisma Enums
**What goes wrong:** Importing from `@prisma/client` instead of the custom output path.
**Why it happens:** Default Prisma patterns in documentation.
**How to avoid:** This project uses custom output: `import { TransactionType } from '../../generated/prisma/client'`. Or better, re-export from `src/types/index.ts` and import as `import { TransactionType } from '@/types'`.
**Warning signs:** Module not found errors on `@prisma/client`.

### Pitfall 7: Zod Schema for Amount Fields
**What goes wrong:** Using `z.number()` or `z.bigint()` for API amount fields instead of `z.string().regex(...)`.
**Why it happens:** Natural instinct to validate numeric fields as numbers.
**How to avoid:** Per project convention, all monetary amounts travel as strings (BigInt serialized). API schemas validate them as `z.string().regex(/^\d+$/)` -- string representation of non-negative integers.
**Warning signs:** Zod type errors when the client sends `"15075"` but schema expects `15075`.

## Code Examples

### formatMoney (verified)
```typescript
// Source: Verified with Intl.NumberFormat in Node.js
export function formatMoney(centsStr: string): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(Number(centsStr) / 100)
}
// formatMoney("15075") -> "$150.75"
// formatMoney("0") -> "$0.00"
// formatMoney("1") -> "$0.01"
```

### parseCents (verified)
```typescript
// Source: Verified with BigInt in Node.js
export function parseCents(value: string): bigint {
  return BigInt(value)
}
// parseCents("15075") -> 15075n
// parseCents("invalid") -> throws SyntaxError
```

### formatRate (verified)
```typescript
// Source: Verified with Node.js
export function formatRate(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`
}
// formatRate(4500) -> "45.00%"
// formatRate(0) -> "0.00%"
```

### formatUnitAmount (verified)
```typescript
// Source: Verified with Number.toLocaleString in Node.js
export function formatUnitAmount(amountStr: string, precision: number): string {
  return (Number(amountStr) / Math.pow(10, precision)).toLocaleString('es-MX', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  })
}
// formatUnitAmount("50000123456", 6) -> "50,000.123456"
// formatUnitAmount("82900", 2) -> "829.00"
```

### cn (verified)
```typescript
// Source: Verified with clsx 2.1.1 + tailwind-merge 3.5.0
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
// cn('px-4 py-2', 'px-6', false && 'bg-red') -> "py-2 px-6"
```

### Zod v4 Debt Schema with Cross-Field Validation (verified)
```typescript
// Source: Verified with Zod 4.3.6 in Node.js
import { z } from 'zod'
import { DebtType } from '../../generated/prisma/client'

const amountRegex = /^\d+$/

/** Validates POST /api/debts request body */
export const createDebtSchema = z
  .object({
    name: z.string({ error: 'El nombre es requerido' }).min(1, { error: 'El nombre no puede estar vacio' }),
    type: z.enum(DebtType, { error: 'Tipo de deuda no valido' }),
    currentBalance: z
      .string({ error: 'El saldo actual es requerido' })
      .regex(amountRegex, { error: 'El saldo debe ser un numero entero no negativo en centavos' }),
    creditLimit: z.string().regex(amountRegex, { error: 'El limite de credito debe ser en centavos' }).optional(),
    annualRate: z.number({ error: 'La tasa anual es requerida' }).int().nonnegative({
      error: 'La tasa anual debe ser un entero no negativo en basis points',
    }),
    minimumPayment: z.string().regex(amountRegex).optional(),
    monthlyPayment: z.string().regex(amountRegex).optional(),
    originalAmount: z.string().regex(amountRegex).optional(),
    remainingMonths: z.number().int().nonnegative().optional(),
    cutOffDay: z.number().int().min(1).max(31).optional(),
    paymentDueDay: z.number().int().min(1).max(31).optional(),
  })
  .refine((data) => data.type !== 'CREDIT_CARD' || data.creditLimit !== undefined, {
    error: 'El limite de credito es requerido para tarjetas de credito',
    path: ['creditLimit'],
  })
```

### Spanish Locale Initialization (verified)
```typescript
// Source: Verified with Zod 4.3.6 z.locales.es() in Node.js
import { z } from 'zod'

// Set Spanish as fallback locale for any unspecified error messages.
// Per-field { error: "..." } overrides take precedence.
z.config(z.locales.es())
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `z.nativeEnum(E)` | `z.enum(E)` (accepts enum objects) | Zod v4 (Jul 2025) | Use z.enum for all Prisma enums |
| `{ message: "..." }` | `{ error: "..." }` | Zod v4 (Jul 2025) | All custom messages must use `error` key |
| `z.string().email()` | `z.email()` | Zod v4 (Jul 2025) | Format validators at top level |
| `toCents(pesos: number)` | `toCents(input: string): string` | Phase 3 decision | No float math in money conversion |
| `import from '@prisma/client'` | `import from '../../generated/prisma/client'` | Prisma 7 custom output | Custom output path per Phase 1 decision |

**Deprecated/outdated:**
- `z.nativeEnum()`: Use `z.enum()` overload instead
- `.strict()` / `.passthrough()` on objects: Use `z.strictObject()` / `z.looseObject()` instead
- `.merge()` on objects: Use `.extend()` instead
- `.deepPartial()`: Removed entirely in Zod v4
- `invalid_type_error` / `required_error` params: Use unified `{ error: ... }` param

## Open Questions

1. **i18n message organization**
   - What we know: Per-field `{ error: "..." }` overrides the Spanish locale. Works for all current schemas.
   - What's unclear: Whether to extract messages to a constants file or keep inline. File size is the deciding factor -- if validators.ts stays under 300 lines, inline is cleaner.
   - Recommendation: Start inline. If validators.ts exceeds 300 lines, extract to `src/lib/validation-messages.ts`.

2. **Serialized types granularity**
   - What we know: Need `Serialized*` types where BigInt fields become string. Prisma exports 10 model types.
   - What's unclear: Whether to create serialized variants for ALL models or only those returned by API routes in MVP.
   - Recommendation: Create serialized types for MVP models only (IncomeSource, Transaction, Category, Debt, Budget, Period, MonthlySummary). v2 models (ValueUnit, UnitRate, Asset) can have schemas for validation but skip serialized types until their API routes are built.

3. **validators.ts file size**
   - What we know: 8 schemas defined. Each schema with custom messages is roughly 15-25 lines. Total ~160-200 lines without imports/helpers.
   - What's unclear: Whether adding refinements and shared regex patterns pushes past 300 lines.
   - Recommendation: Start as single file. Monitor line count. Split into `validators/transaction.ts`, `validators/debt.ts`, etc. only if needed.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.mts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-01 | serializeBigInts handles nested objects, arrays, null, mixed types | unit | `npx vitest run src/lib/serialize.test.ts -t "serializeBigInts"` | No -- Wave 0 |
| FOUND-02 | formatMoney converts cents string to MXN display | unit | `npx vitest run src/lib/utils.test.ts -t "formatMoney"` | No -- Wave 0 |
| FOUND-03 | toCents string-split parsing without float contamination | unit | `npx vitest run src/lib/utils.test.ts -t "toCents"` | No -- Wave 0 |
| FOUND-04 | parseCents converts string to BigInt | unit | `npx vitest run src/lib/utils.test.ts -t "parseCents"` | No -- Wave 0 |
| FOUND-05 | formatRate converts basis points to percentage | unit | `npx vitest run src/lib/utils.test.ts -t "formatRate"` | No -- Wave 0 |
| FOUND-06 | Zod schemas validate/reject correctly with Spanish messages | unit | `npx vitest run src/lib/validators.test.ts` | No -- Wave 0 |
| FOUND-07 | 100% coverage achieved on src/lib/ | unit | `npx vitest run --coverage` | No -- Wave 0 |
| FOUND-08 | cn() merges Tailwind classes correctly | unit | `npx vitest run src/lib/utils.test.ts -t "cn"` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --coverage`
- **Phase gate:** Full suite green + 100% coverage on src/lib/ before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Install `@vitest/coverage-v8`: `npm install --save-dev @vitest/coverage-v8`
- [ ] `src/lib/utils.test.ts` -- covers FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-08
- [ ] `src/lib/serialize.test.ts` -- covers FOUND-01
- [ ] `src/lib/validators.test.ts` -- covers FOUND-06
- [ ] `src/lib/constants.test.ts` -- smoke tests for constant integrity

## Sources

### Primary (HIGH confidence)
- Zod 4.3.6 installed locally -- all API patterns verified by running schemas against actual library
- Prisma generated types at `generated/prisma/client` -- enum objects verified
- clsx 2.1.1 + tailwind-merge 3.5.0 installed locally -- cn() pattern verified
- Vitest 4.1.2 installed locally -- config verified in vitest.config.mts
- `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })` -- verified in Node.js
- `z.config(z.locales.es())` -- verified Spanish locale messages in Node.js

### Secondary (MEDIUM confidence)
- [Zod v4 Changelog](https://zod.dev/v4/changelog) -- breaking changes documentation
- [Zod Error Customization](https://zod.dev/error-customization) -- error parameter API
- [Zod API Reference](https://zod.dev/api) -- schema definition reference

### Tertiary (LOW confidence)
- None -- all findings verified against installed libraries.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries installed and verified locally
- Architecture: HIGH -- patterns tested with actual library versions
- Pitfalls: HIGH -- each pitfall verified by reproducing the issue locally
- Zod v4 API: HIGH -- every code example executed against Zod 4.3.6

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable libraries, 30 days)
