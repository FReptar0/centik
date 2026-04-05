import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Formats centavo string to MXN currency display.
 * Example: formatMoney("15075") -> "$150.75"
 */
export function formatMoney(centsStr: string): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(Number(centsStr) / 100)
}

/**
 * Converts a peso string to centavo string using pure string-split parsing.
 * NO float math -- prevents floating point contamination.
 *
 * WHY: CLAUDE.md's toCents(pesos: number) signature uses Math.round(float * 100)
 * which has float contamination (e.g., 0.1 + 0.2 !== 0.3). This string-split
 * approach was chosen per user decision to guarantee exact cent conversion.
 *
 * Example: toCents("150.75") -> "15075"
 */
export function toCents(input: string): string {
  const trimmed = input.trim()

  if (trimmed.length === 0) {
    throw new Error('Input must not be empty')
  }

  if (trimmed.startsWith('-')) {
    throw new Error('Negative amounts are not allowed')
  }

  const parts = trimmed.split('.')

  if (parts.length > 2) {
    throw new Error('Invalid format: multiple decimal points')
  }

  const integerPart = parts[0]
  const fractionalPart = parts[1] ?? ''

  // Validate integer part is digits only (allow empty for ".50" case)
  if (integerPart.length > 0 && !/^\d+$/.test(integerPart)) {
    throw new Error('Invalid format: non-numeric characters')
  }

  // Validate fractional part is digits only (if present)
  if (fractionalPart.length > 0 && !/^\d+$/.test(fractionalPart)) {
    throw new Error('Invalid format: non-numeric characters in decimal')
  }

  // Pad to exactly 2 decimal places or truncate beyond 2
  const centsPart = fractionalPart.padEnd(2, '0').slice(0, 2)

  // Combine: integer part + exactly 2 fractional digits
  const combined = (integerPart || '0') + centsPart

  // Strip leading zeros but keep at least "0"
  const stripped = combined.replace(/^0+/, '') || '0'

  return stripped
}

/**
 * Converts a centavo string to BigInt for database operations.
 * Example: parseCents("15075") -> 15075n
 */
export function parseCents(value: string): bigint {
  return BigInt(value)
}

/**
 * Converts basis points (integer) to percentage display string.
 * Example: formatRate(4500) -> "45.00%"
 */
export function formatRate(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`
}

/**
 * Formats an asset amount string respecting the unit's precision.
 * Example: formatUnitAmount("50000123456", 6) -> "50,000.123456" (es-MX locale)
 */
export function formatUnitAmount(amountStr: string, precision: number): string {
  return (Number(amountStr) / Math.pow(10, precision)).toLocaleString('es-MX', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  })
}

/**
 * Merges Tailwind CSS classes with conflict resolution.
 * Uses clsx for conditional classes + tailwind-merge for deduplication.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
