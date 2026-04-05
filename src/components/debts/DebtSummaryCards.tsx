'use client'

import { cn, formatMoney } from '@/lib/utils'
import { calculateDebtSummary, getDebtToIncomeColor } from '@/lib/debt'
import type { SerializedDebt } from '@/types'

interface DebtSummaryCardsProps {
  debts: SerializedDebt[]
  monthlyIncome: string
}

const SEMANTIC_TEXT = {
  positive: 'text-positive',
  warning: 'text-warning',
  negative: 'text-negative',
} as const

export default function DebtSummaryCards({ debts, monthlyIncome }: DebtSummaryCardsProps) {
  const summary = calculateDebtSummary(debts, monthlyIncome)
  const dtiColor = getDebtToIncomeColor(summary.debtToIncomeRatio)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      {/* Total Debt */}
      <div className="rounded-xl border border-border bg-bg-card p-5">
        <p className="text-sm text-text-secondary mb-1">Deuda Total</p>
        <p className="text-2xl font-bold tabular-nums text-negative">
          {formatMoney(summary.totalDebt)}
        </p>
      </div>

      {/* Monthly Payments */}
      <div className="rounded-xl border border-border bg-bg-card p-5">
        <p className="text-sm text-text-secondary mb-1">Pagos Mensuales</p>
        <p className="text-2xl font-bold tabular-nums text-text-primary">
          {formatMoney(summary.totalMonthlyPayments)}
        </p>
      </div>

      {/* Debt-to-Income Ratio */}
      <div className="rounded-xl border border-border bg-bg-card p-5">
        <p className="text-sm text-text-secondary mb-1">Relacion Deuda/Ingreso</p>
        <p className={cn('text-2xl font-bold tabular-nums', SEMANTIC_TEXT[dtiColor])}>
          {summary.debtToIncomeRatio.toFixed(1)}%
        </p>
      </div>
    </div>
  )
}
