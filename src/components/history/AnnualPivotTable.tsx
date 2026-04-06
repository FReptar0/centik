'use client'

import { Lock } from 'lucide-react'
import { MONTH_NAMES_ES } from '@/lib/constants'
import { formatMoney, formatRate, cn } from '@/lib/utils'
import type { MonthSummarySlot } from '@/lib/history'

interface PeriodInfo {
  id: string
  month: number
  year: number
  isClosed: boolean
}

interface AnnualPivotTableProps {
  data: MonthSummarySlot[]
  currentPeriodId: string | null
  onCloseClick: (periodId: string, month: number, year: number) => void
  onReopenClick: (periodId: string) => void
  periods: PeriodInfo[]
}

/** Short month names for column headers */
const SHORT_MONTHS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
] as const

/** Row labels for the pivot table */
const ROW_LABELS = [
  'Ingresos',
  'Gastos',
  'Ahorro',
  '% Ahorro',
  'Deuda (cierre)',
  'Pagos a deudas',
] as const

/** Annual pivot table showing 12 months of financial data with row metrics */
export default function AnnualPivotTable({
  data,
  currentPeriodId,
  onCloseClick,
  onReopenClick,
  periods,
}: AnnualPivotTableProps) {
  // Build lookup maps for quick access
  const periodByMonth = new Map<number, PeriodInfo>()
  for (const p of periods) {
    periodByMonth.set(p.month, p)
  }

  // Compute annual totals from non-null months
  const annualTotals = computeAnnualTotals(data)

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-bg-card">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b border-border bg-bg-primary">
            {/* Sticky first column header */}
            <th scope="col" className="sticky left-0 z-10 bg-bg-primary px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-secondary">
              Metrica
            </th>
            {SHORT_MONTHS.map((monthName, idx) => {
              const monthNum = idx + 1
              const period = periodByMonth.get(monthNum)
              const isClosed = period?.isClosed ?? false
              const isCurrentPeriod = period?.id === currentPeriodId

              return (
                <th
                  key={monthName}
                  scope="col"
                  className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wide text-text-secondary"
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="flex items-center gap-1">
                      {monthName}
                      {isClosed && (
                        <Lock
                          size={12}
                          className="text-info"
                          aria-label={`${MONTH_NAMES_ES[idx]} cerrado`}
                        />
                      )}
                    </span>
                    {isClosed && period && (
                      <button
                        type="button"
                        onClick={() => onReopenClick(period.id)}
                        className="text-[10px] text-info hover:text-info/80 underline underline-offset-2 transition-colors duration-200"
                      >
                        Reabrir
                      </button>
                    )}
                    {isCurrentPeriod && period && !isClosed && (
                      <button
                        type="button"
                        onClick={() =>
                          onCloseClick(period.id, period.month, period.year)
                        }
                        className={cn(
                          'text-[10px] font-semibold text-negative',
                          'hover:text-negative/80 underline underline-offset-2',
                          'transition-colors duration-200',
                        )}
                      >
                        Cerrar
                      </button>
                    )}
                  </div>
                </th>
              )
            })}
            <th scope="col" className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wide text-accent">
              Total Anual
            </th>
          </tr>
        </thead>
        <tbody>
          {ROW_LABELS.map((label) => (
            <tr key={label} className="border-b border-border last:border-b-0">
              {/* Sticky first column */}
              <th scope="row" className="sticky left-0 z-10 bg-bg-card px-4 py-3 text-left text-sm font-medium text-text-primary whitespace-nowrap">
                {label}
              </th>
              {data.map((slot, idx) => (
                <td
                  key={idx}
                  className="px-3 py-3 text-center tabular-nums text-sm"
                >
                  {renderCellValue(label, slot)}
                </td>
              ))}
              {/* Annual total column */}
              <td className="px-3 py-3 text-center tabular-nums text-sm font-semibold">
                {renderAnnualTotal(label, annualTotals)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Extract cell value from a MonthSummarySlot for a given row label */
function renderCellValue(
  label: string,
  slot: MonthSummarySlot,
): React.ReactNode {
  if (!slot.data) {
    return <span className="text-text-muted">--</span>
  }

  const summary = slot.data

  switch (label) {
    case 'Ingresos':
      return (
        <span className="text-positive">{formatMoney(summary.totalIncome)}</span>
      )
    case 'Gastos':
      return (
        <span className="text-negative">{formatMoney(summary.totalExpenses)}</span>
      )
    case 'Ahorro': {
      const isPositive = Number(summary.totalSavings) >= 0
      return (
        <span className={isPositive ? 'text-positive' : 'text-negative'}>
          {formatMoney(summary.totalSavings)}
        </span>
      )
    }
    case '% Ahorro':
      return (
        <span className="text-text-primary">
          {formatRate(summary.savingsRate)}
        </span>
      )
    case 'Deuda (cierre)': {
      const hasDebt = Number(summary.debtAtClose) > 0
      return (
        <span className={hasDebt ? 'text-negative' : 'text-text-primary'}>
          {formatMoney(summary.debtAtClose)}
        </span>
      )
    }
    case 'Pagos a deudas':
      return (
        <span className="text-text-primary">
          {formatMoney(summary.debtPayments)}
        </span>
      )
    default:
      return <span className="text-text-muted">--</span>
  }
}

interface AnnualTotals {
  totalIncome: number
  totalExpenses: number
  totalSavings: number
  savingsRate: number
  debtAtClose: number
  debtPayments: number
  hasData: boolean
}

/** Sum all non-null months for annual totals */
function computeAnnualTotals(data: MonthSummarySlot[]): AnnualTotals {
  let totalIncome = 0
  let totalExpenses = 0
  let totalSavings = 0
  let debtAtClose = 0
  let debtPayments = 0
  let hasData = false
  let lastDebtAtClose = 0

  for (const slot of data) {
    if (slot.data) {
      hasData = true
      totalIncome += Number(slot.data.totalIncome)
      totalExpenses += Number(slot.data.totalExpenses)
      totalSavings += Number(slot.data.totalSavings)
      debtPayments += Number(slot.data.debtPayments)
      // For debt at close, use the latest non-null month's value
      lastDebtAtClose = Number(slot.data.debtAtClose)
    }
  }

  debtAtClose = lastDebtAtClose

  const savingsRate =
    totalIncome > 0 ? Math.round((totalSavings / totalIncome) * 10000) : 0

  return {
    totalIncome,
    totalExpenses,
    totalSavings,
    savingsRate,
    debtAtClose,
    debtPayments,
    hasData,
  }
}

/** Render annual total cell for a given row */
function renderAnnualTotal(
  label: string,
  totals: AnnualTotals,
): React.ReactNode {
  if (!totals.hasData) {
    return <span className="text-text-muted">--</span>
  }

  switch (label) {
    case 'Ingresos':
      return (
        <span className="text-positive">
          {formatMoney(String(totals.totalIncome))}
        </span>
      )
    case 'Gastos':
      return (
        <span className="text-negative">
          {formatMoney(String(totals.totalExpenses))}
        </span>
      )
    case 'Ahorro': {
      const isPositive = totals.totalSavings >= 0
      return (
        <span className={isPositive ? 'text-positive' : 'text-negative'}>
          {formatMoney(String(totals.totalSavings))}
        </span>
      )
    }
    case '% Ahorro':
      return (
        <span className="text-text-primary">
          {formatRate(totals.savingsRate)}
        </span>
      )
    case 'Deuda (cierre)': {
      const hasDebt = totals.debtAtClose > 0
      return (
        <span className={hasDebt ? 'text-negative' : 'text-text-primary'}>
          {formatMoney(String(totals.debtAtClose))}
        </span>
      )
    }
    case 'Pagos a deudas':
      return (
        <span className="text-text-primary">
          {formatMoney(String(totals.debtPayments))}
        </span>
      )
    default:
      return <span className="text-text-muted">--</span>
  }
}
