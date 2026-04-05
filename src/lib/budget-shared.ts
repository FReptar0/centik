/** Budget row with joined category info and spent amount for display */
export interface BudgetWithSpent {
  id: string
  categoryId: string
  categoryName: string
  categoryIcon: string
  categoryColor: string
  /** Quincenal budget amount in centavos (serialized BigInt) */
  quincenalAmount: string
  /** Actual spending in centavos for the period (serialized BigInt) */
  spent: string
}

/**
 * Returns traffic-light color for budget usage percentage.
 * <80 = positive (green), 80-99 = warning (orange), >=100 = negative (red).
 */
export function getBudgetColor(percentUsed: number): 'positive' | 'warning' | 'negative' {
  if (percentUsed < 80) return 'positive'
  if (percentUsed < 100) return 'warning'
  return 'negative'
}
