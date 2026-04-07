'use client'

import { cn, formatMoney } from '@/lib/utils'
import type { BudgetWithSpent } from '@/lib/budget-shared'

interface BudgetSummaryRowProps {
  budgets: BudgetWithSpent[]
  quincenalIncome: string
}

export default function BudgetSummaryRow({ budgets, quincenalIncome }: BudgetSummaryRowProps) {
  let totalQuincenalBudget = BigInt(0)
  for (const b of budgets) {
    totalQuincenalBudget += BigInt(b.quincenalAmount)
  }

  const income = BigInt(quincenalIncome)
  const difference = income - totalQuincenalBudget
  const isPositive = difference >= BigInt(0)

  const absStr = (isPositive ? difference : -difference).toString()
  const monthlyDiff = ((isPositive ? difference : -difference) * BigInt(2)).toString()

  return (
    <div className="rounded-xl border border-border-divider bg-surface-elevated p-5">
      {/* Income vs Budget */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-text-secondary">Ingreso quincenal</p>
          <p className="text-lg font-bold tabular-nums text-text-primary">
            {formatMoney(quincenalIncome)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-secondary">Presupuesto quincenal</p>
          <p className="text-lg font-bold tabular-nums text-text-primary">
            {formatMoney(totalQuincenalBudget.toString())}
          </p>
        </div>
      </div>

      {/* Surplus / Deficit */}
      <div className="mt-3 border-t border-border-divider pt-3">
        <div className="flex items-center justify-between">
          <span className={cn('text-sm font-semibold', isPositive ? 'text-positive' : 'text-negative')}>
            {isPositive ? 'Sobrante' : 'Faltante'}
          </span>
          <span className={cn('text-lg font-bold tabular-nums', isPositive ? 'text-positive' : 'text-negative')}>
            {formatMoney(absStr)}
          </span>
        </div>
        <p className="mt-1 text-xs tabular-nums text-text-tertiary">
          Mensual: {formatMoney(monthlyDiff)} {isPositive ? 'sobrante' : 'faltante'}
        </p>
      </div>
    </div>
  )
}
