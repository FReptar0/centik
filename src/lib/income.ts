import type { SerializedIncomeSource } from '@/types'

/** Aggregated income totals across all time periods */
export interface IncomeSummary {
  quincenal: string
  monthly: string
  semester: string
  annual: string
}

/**
 * Converts an income source's default amount to its monthly equivalent.
 * All arithmetic uses BigInt to avoid floating-point errors on centavos.
 *
 * Multipliers: QUINCENAL x2, SEMANAL x4, MENSUAL x1, VARIABLE x1 (estimate).
 */
export function getMonthlyEquivalent(defaultAmount: string, frequency: string): string {
  const amount = BigInt(defaultAmount)

  switch (frequency) {
    case 'QUINCENAL':
      return (amount * 2n).toString()
    case 'SEMANAL':
      return (amount * 4n).toString()
    case 'MENSUAL':
      return amount.toString()
    case 'VARIABLE':
      return amount.toString()
    default:
      return amount.toString()
  }
}

/**
 * Calculates aggregated income summary from a list of serialized income sources.
 * Uses the quincena as the base unit (matching Mexican pay cycle), then derives
 * monthly (x2), semester (x12), and annual (x24) totals.
 *
 * Quincenal conversion: QUINCENAL=direct, SEMANAL=x2, MENSUAL=/2, VARIABLE=/2.
 */
export function calculateIncomeSummary(sources: SerializedIncomeSource[]): IncomeSummary {
  let quincenalTotal = 0n

  for (const source of sources) {
    const amount = BigInt(source.defaultAmount)

    switch (source.frequency) {
      case 'QUINCENAL':
        quincenalTotal += amount
        break
      case 'SEMANAL':
        quincenalTotal += amount * 2n
        break
      case 'MENSUAL':
        quincenalTotal += amount / 2n
        break
      case 'VARIABLE':
        quincenalTotal += amount / 2n
        break
    }
  }

  return {
    quincenal: quincenalTotal.toString(),
    monthly: (quincenalTotal * 2n).toString(),
    semester: (quincenalTotal * 12n).toString(),
    annual: (quincenalTotal * 24n).toString(),
  }
}
