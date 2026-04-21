'use client'

import DynamicIcon from '@/components/ui/DynamicIcon'
import BatteryBar from '@/components/ui/BatteryBar'
import MoneyAmount from '@/components/ui/MoneyAmount'
import { cn } from '@/lib/utils'
import { getBudgetColor } from '@/lib/budget-shared'
import type { BudgetWithSpent } from '@/lib/budget-shared'

interface BudgetProgressListProps {
  budgets: BudgetWithSpent[]
}

const COLOR_TEXT = {
  positive: 'text-positive',
  warning: 'text-warning',
  negative: 'text-negative',
} as const

/** Calculates budget usage percentage. Monthly budget = quincenal x2. */
function calculatePercentUsed(quincenalAmount: string, spent: string): number {
  const monthly = BigInt(quincenalAmount) * BigInt(2)
  if (monthly <= BigInt(0)) return 0
  return (Number(BigInt(spent)) / Number(monthly)) * 100
}

export default function BudgetProgressList({ budgets }: BudgetProgressListProps) {
  if (budgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <DynamicIcon
          name="piggy-bank"
          size={32}
          className="mb-3 text-text-tertiary"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-text-secondary">Sin presupuesto configurado</p>
        <p className="mt-1 text-xs text-text-tertiary">
          Configura montos quincenales para ver el avance
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {budgets.map((budget) => {
        const monthlyBudget = (BigInt(budget.quincenalAmount) * BigInt(2)).toString()
        const percentUsed = calculatePercentUsed(budget.quincenalAmount, budget.spent)
        const color = getBudgetColor(percentUsed)

        return (
          <div key={budget.categoryId}>
            {/* Category row: icon + name + amounts */}
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${budget.categoryColor}1F` }}
                >
                  <DynamicIcon
                    name={budget.categoryIcon}
                    size={18}
                    style={{ color: budget.categoryColor }}
                    aria-hidden="true"
                  />
                </div>
                <span className="text-sm font-medium text-text-primary">{budget.categoryName}</span>
              </div>
              <span className="text-sm text-text-secondary">
                <MoneyAmount value={budget.spent} size="sm" variant="neutral" />{' '}
                <span className="text-text-tertiary">/</span>{' '}
                <MoneyAmount value={monthlyBudget} size="sm" variant="neutral" />
              </span>
            </div>

            {/* Progress bar */}
            <BatteryBar
              value={percentUsed}
              variant="compact"
              label={`Presupuesto ${budget.categoryName} ${percentUsed.toFixed(1)}%`}
            />

            {/* Percentage text */}
            <p className={cn('mt-1 text-xs tabular-nums', COLOR_TEXT[color])}>
              {percentUsed.toFixed(1)}%
            </p>
          </div>
        )
      })}
    </div>
  )
}
