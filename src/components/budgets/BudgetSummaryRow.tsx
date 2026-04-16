'use client'

import { cn } from '@/lib/utils'
import MoneyAmount from '@/components/ui/MoneyAmount'
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
    <div className="rounded-lg bg-surface-elevated p-5">
      {/* Income vs Budget */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-text-secondary uppercase tracking-[2px]">Ingreso quincenal</p>
          <MoneyAmount value={quincenalIncome} variant="neutral" size="lg" className="text-lg font-bold" />
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-[2px]">Presupuesto quincenal</p>
          <MoneyAmount value={totalQuincenalBudget.toString()} variant="neutral" size="lg" className="text-lg font-bold" />
        </div>
      </div>

      {/* Surplus / Deficit */}
      <div className="mt-3 border-t border-border-divider pt-3">
        <div className="flex items-center justify-between">
          <span className={cn('text-sm font-semibold', isPositive ? 'text-positive' : 'text-negative')}>
            {isPositive ? 'Sobrante' : 'Faltante'}
          </span>
          <MoneyAmount value={absStr} variant={isPositive ? 'income' : 'expense'} size="lg" className="text-lg font-bold" />
        </div>
        <p className="mt-1 text-xs text-text-tertiary">
          Mensual: <MoneyAmount value={monthlyDiff} size="sm" variant={isPositive ? 'income' : 'expense'} /> {isPositive ? 'sobrante' : 'faltante'}
        </p>
      </div>
    </div>
  )
}
