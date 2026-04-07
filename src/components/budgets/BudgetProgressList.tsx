'use client'

import DynamicIcon from '@/components/ui/DynamicIcon'
import { cn, formatMoney } from '@/lib/utils'
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

const COLOR_BG = {
  positive: 'bg-positive',
  warning: 'bg-warning',
  negative: 'bg-negative',
} as const

const COLOR_TRACK = {
  positive: 'bg-positive/12',
  warning: 'bg-warning/12',
  negative: 'bg-negative/12',
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
                  className="flex h-7 w-7 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${budget.categoryColor}26` }}
                >
                  <DynamicIcon
                    name={budget.categoryIcon}
                    size={16}
                    style={{ color: budget.categoryColor }}
                    aria-hidden="true"
                  />
                </div>
                <span className="text-sm font-medium text-text-primary">
                  {budget.categoryName}
                </span>
              </div>
              <span className="text-sm tabular-nums text-text-secondary">
                {formatMoney(budget.spent)}{' '}
                <span className="text-text-tertiary">/</span>{' '}
                {formatMoney(monthlyBudget)}
              </span>
            </div>

            {/* Progress bar */}
            <div
              className={cn('h-1.5 overflow-hidden rounded-full', COLOR_TRACK[color])}
            >
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500 ease-out',
                  COLOR_BG[color],
                )}
                style={{ width: `${Math.min(percentUsed, 100)}%` }}
                role="progressbar"
                aria-valuenow={Math.round(percentUsed)}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>

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
