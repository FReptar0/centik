'use client'

import { cn } from '@/lib/utils'
import MoneyAmount from '@/components/ui/MoneyAmount'
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
      <div className="rounded-lg bg-surface-elevated p-5">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-[2px] mb-1">Deuda Total</p>
        <MoneyAmount value={summary.totalDebt} variant="expense" size="2xl" className="text-2xl font-bold" />
      </div>

      {/* Monthly Payments */}
      <div className="rounded-lg bg-surface-elevated p-5">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-[2px] mb-1">Pagos Mensuales</p>
        <MoneyAmount value={summary.totalMonthlyPayments} variant="neutral" size="2xl" className="text-2xl font-bold" />
      </div>

      {/* Debt-to-Income Ratio */}
      <div className="rounded-lg bg-surface-elevated p-5">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-[2px] mb-1">Relacion Deuda/Ingreso</p>
        <p className={cn('text-2xl font-bold font-mono tabular-nums', SEMANTIC_TEXT[dtiColor])}>
          {summary.debtToIncomeRatio.toFixed(1)}%
        </p>
      </div>
    </div>
  )
}
