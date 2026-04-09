'use client'

import type { DashboardKPIs } from '@/types'
import { formatMoney, formatRate } from '@/lib/utils'
import KPICard from '@/components/dashboard/KPICard'
import type { KPICardProps } from '@/components/dashboard/KPICard'

export interface KPIGridProps {
  kpis: DashboardKPIs
}

/** Determines color for the "available" KPI based on sign */
function getAvailableColor(available: string): KPICardProps['color'] {
  const value = Number(available)
  if (value > 0) return 'positive'
  if (value < 0) return 'negative'
  return 'accent'
}

/** Determines color for savings rate based on value */
function getSavingsRateColor(rate: number): KPICardProps['color'] {
  if (rate > 0) return 'positive'
  if (rate < 0) return 'negative'
  return 'warning'
}

/** Determines color for debt-to-income ratio based on thresholds (percentage) */
function getDebtToIncomeColor(ratio: number): KPICardProps['color'] {
  if (ratio < 35) return 'positive'
  if (ratio <= 50) return 'warning'
  return 'negative'
}

export default function KPIGrid({ kpis }: KPIGridProps) {
  const cards: KPICardProps[] = [
    {
      label: 'Ingreso Mensual',
      value: formatMoney(kpis.monthlyEstimatedIncome),
      icon: 'trending-up',
      color: 'positive',
    },
    {
      label: 'Gastos del Mes',
      value: formatMoney(kpis.monthExpenses),
      icon: 'trending-down',
      color: 'negative',
    },
    {
      label: 'Disponible',
      value: formatMoney(kpis.available),
      icon: 'wallet',
      color: getAvailableColor(kpis.available),
    },
    {
      label: 'Deuda Total',
      value: formatMoney(kpis.totalDebt),
      icon: 'credit-card',
      color: 'negative',
    },
    {
      label: 'Tasa de Ahorro',
      value: formatRate(kpis.savingsRate),
      icon: 'piggy-bank',
      color: getSavingsRateColor(kpis.savingsRate),
    },
    {
      label: 'Deuda/Ingreso',
      value: `${kpis.debtToIncomeRatio.toFixed(1)}%`,
      icon: 'percent',
      color: getDebtToIncomeColor(kpis.debtToIncomeRatio),
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {cards.map((card, index) => (
        <KPICard key={card.label} {...card} hero={index < 2} />
      ))}
    </div>
  )
}
