'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { CreditCard, Landmark, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react'
import { cn, formatMoney, formatRate, toCents } from '@/lib/utils'
import { calculateDebtMetrics, getUtilizationColor } from '@/lib/debt'
import { updateDebtBalance, deleteDebt } from '@/app/deudas/actions'
import type { SerializedDebt } from '@/types'

interface DebtCardProps {
  debt: SerializedDebt
  onEdit: (debt: SerializedDebt) => void
}

const SEMANTIC_COLORS = {
  positive: 'text-positive',
  warning: 'text-warning',
  negative: 'text-negative',
} as const

const SEMANTIC_BG = {
  positive: 'bg-positive',
  warning: 'bg-warning',
  negative: 'bg-negative',
} as const

const SEMANTIC_TRACK = {
  positive: 'bg-positive/12',
  warning: 'bg-warning/12',
  negative: 'bg-negative/12',
} as const

/** Strip commas and non-numeric chars (except one decimal point) */
function cleanAmountInput(value: string): string {
  return value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
}

export default function DebtCard({ debt, onEdit }: DebtCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditingBalance, setIsEditingBalance] = useState(false)
  const [balanceInput, setBalanceInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const metrics = calculateDebtMetrics(debt)
  const isCreditCard = debt.type === 'CREDIT_CARD'

  // Auto-revert delete confirmation after 3 seconds
  useEffect(() => {
    if (!confirmingDelete) return
    const timer = setTimeout(() => setConfirmingDelete(false), 3000)
    return () => clearTimeout(timer)
  }, [confirmingDelete])

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditingBalance && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditingBalance])

  const startBalanceEdit = useCallback(() => {
    const pesoValue = (Number(debt.currentBalance) / 100).toString()
    setBalanceInput(pesoValue)
    setIsEditingBalance(true)
  }, [debt.currentBalance])

  const cancelBalanceEdit = useCallback(() => {
    setIsEditingBalance(false)
    setBalanceInput('')
  }, [])

  const saveBalance = useCallback(async () => {
    if (!balanceInput.trim()) {
      cancelBalanceEdit()
      return
    }

    setIsSaving(true)
    try {
      const cents = toCents(balanceInput)
      const result = await updateDebtBalance(debt.id, { currentBalance: cents })
      if (result && 'error' in result) {
        const messages = Object.values(result.error).flat()
        toast.error(messages[0] ?? 'Error al actualizar saldo', { duration: 5000 })
      } else {
        toast.success('Saldo actualizado')
      }
    } catch {
      toast.error('Error al actualizar saldo', { duration: 5000 })
    }
    setIsSaving(false)
    setIsEditingBalance(false)
  }, [balanceInput, debt.id, cancelBalanceEdit])

  const handleBalanceKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        saveBalance()
      } else if (e.key === 'Escape') {
        cancelBalanceEdit()
      }
    },
    [saveBalance, cancelBalanceEdit],
  )

  const handleDelete = useCallback(async () => {
    setDeleting(true)
    try {
      const result = await deleteDebt(debt.id)
      if (result && 'error' in result) {
        const messages = Object.values(result.error).flat()
        toast.error(messages[0] ?? 'Error al eliminar', { duration: 5000 })
      } else {
        toast.success('Deuda eliminada')
      }
    } catch {
      toast.error('Error al eliminar', { duration: 5000 })
    }
    setDeleting(false)
    setConfirmingDelete(false)
  }, [debt.id])

  return (
    <div className="rounded-lg bg-surface-elevated p-5 transition-all duration-200">
      {/* Header row: icon, name, balance, chevron */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-3">
          {isCreditCard ? (
            <CreditCard size={18} className="text-warning" aria-hidden="true" />
          ) : (
            <Landmark size={18} className="text-info" aria-hidden="true" />
          )}
          <h3 className="text-lg font-semibold text-text-primary">{debt.name}</h3>
        </div>

        <div className="flex items-center gap-3">
          {/* Balance display / inline edit */}
          {isEditingBalance ? (
            <div
              className="relative"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-text-tertiary text-sm pointer-events-none">
                $
              </span>
              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={balanceInput}
                onChange={(e) => setBalanceInput(cleanAmountInput(e.target.value))}
                onKeyDown={handleBalanceKeyDown}
                onBlur={saveBalance}
                className={cn(
                  'w-32 rounded-lg border border-border-divider bg-transparent pl-6 pr-2 py-1 text-sm text-text-primary text-right',
                  isSaving && 'opacity-50',
                )}
              />
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation()
                startBalanceEdit()
              }}
              className={cn(
                'text-xl font-bold tabular-nums text-negative',
                'hover:text-negative/80 transition-colors duration-200',
                isSaving && 'opacity-50',
              )}
              aria-label="Editar saldo"
            >
              {formatMoney(debt.currentBalance)}
            </button>
          )}

          {isExpanded ? (
            <ChevronUp size={18} className="text-text-tertiary" aria-hidden="true" />
          ) : (
            <ChevronDown size={18} className="text-text-tertiary" aria-hidden="true" />
          )}
        </div>
      </div>

      {/* Expanded section */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-border-divider space-y-4">
          {isCreditCard ? (
            <CreditCardDetails debt={debt} metrics={metrics} />
          ) : (
            <LoanDetails debt={debt} metrics={metrics} />
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            {confirmingDelete ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-text-secondary">Eliminar?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-negative font-semibold hover:text-negative/80 transition-colors duration-200"
                >
                  Si
                </button>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  className="text-text-secondary font-semibold hover:text-text-primary transition-colors duration-200"
                >
                  No
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => onEdit(debt)}
                  className="rounded-full p-2 text-text-tertiary transition-all duration-200 hover:text-text-primary hover:bg-surface-hover active:scale-[0.98]"
                  aria-label="Editar"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => setConfirmingDelete(true)}
                  className="rounded-full p-2 text-text-tertiary transition-all duration-200 hover:text-negative hover:bg-negative/10 active:scale-[0.98]"
                  aria-label="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// --- Sub-components for expanded sections ---

interface DetailsProps {
  debt: SerializedDebt
  metrics: ReturnType<typeof calculateDebtMetrics>
}

function CreditCardDetails({ debt, metrics }: DetailsProps) {
  const utilization = metrics.utilizationRate ?? 0
  const color = getUtilizationColor(utilization)

  return (
    <div className="space-y-3">
      {/* Utilization bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-text-secondary uppercase tracking-wide">
            Utilizacion
          </span>
          <span className={cn('text-sm font-semibold tabular-nums', SEMANTIC_COLORS[color])}>
            {utilization.toFixed(1)}%
          </span>
        </div>
        <div className={cn('h-1.5 rounded-full', SEMANTIC_TRACK[color])}>
          <div
            className={cn('h-full rounded-full transition-all duration-500', SEMANTIC_BG[color])}
            style={{ width: `${Math.min(utilization, 100)}%` }}
            role="progressbar"
            aria-valuenow={utilization}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        {debt.minimumPayment !== null && (
          <MetricItem label="Pago minimo" value={formatMoney(debt.minimumPayment)} />
        )}
        <MetricItem
          label="Interes mensual estimado"
          value={formatMoney(metrics.estimatedMonthlyInterest)}
        />
        {debt.cutOffDay !== null && (
          <MetricItem label="Corte" value={`Dia ${debt.cutOffDay}`} />
        )}
        {debt.paymentDueDay !== null && (
          <MetricItem label="Pago" value={`Dia ${debt.paymentDueDay}`} />
        )}
        <MetricItem label="Tasa anual" value={formatRate(debt.annualRate)} />
      </div>
    </div>
  )
}

function LoanDetails({ debt, metrics }: DetailsProps) {
  const percentPaid = metrics.percentPaid ?? 0
  const progressColor = percentPaid > 50 ? 'positive' : percentPaid >= 25 ? 'warning' : 'negative'

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-text-secondary uppercase tracking-wide">Progreso</span>
          <span
            className={cn('text-sm font-semibold tabular-nums', SEMANTIC_COLORS[progressColor])}
          >
            {percentPaid.toFixed(1)}%
          </span>
        </div>
        <div className={cn('h-1.5 rounded-full', SEMANTIC_TRACK[progressColor])}>
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              SEMANTIC_BG[progressColor],
            )}
            style={{ width: `${Math.min(percentPaid, 100)}%` }}
            role="progressbar"
            aria-valuenow={percentPaid}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        {debt.monthlyPayment !== null && (
          <MetricItem label="Mensualidad" value={formatMoney(debt.monthlyPayment)} />
        )}
        {debt.remainingMonths !== null && (
          <MetricItem label="Meses restantes" value={`${debt.remainingMonths}`} />
        )}
        {metrics.totalRemainingPayment !== null && (
          <MetricItem label="Total por pagar" value={formatMoney(metrics.totalRemainingPayment)} />
        )}
        <MetricItem label="Tasa anual" value={formatRate(debt.annualRate)} />
      </div>
    </div>
  )
}

interface MetricItemProps {
  label: string
  value: string
}

function MetricItem({ label, value }: MetricItemProps) {
  return (
    <div>
      <p className="text-xs text-text-secondary mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-text-primary tabular-nums">{value}</p>
    </div>
  )
}
