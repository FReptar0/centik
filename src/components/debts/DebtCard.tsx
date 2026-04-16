'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { CreditCard, Landmark, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react'
import BatteryBar from '@/components/ui/BatteryBar'
import MoneyAmount from '@/components/ui/MoneyAmount'
import { cn, formatRate, toCents } from '@/lib/utils'
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
              <span className="absolute left-0 bottom-[6px] text-xs text-text-tertiary pointer-events-none">
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
                  'w-32 bg-transparent border-0 border-b border-accent pl-4 pr-0 py-1 text-sm font-mono text-text-primary text-right focus:outline-none transition-colors duration-200',
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
                'text-xl font-bold',
                'hover:opacity-80 transition-colors duration-200',
                isSaving && 'opacity-50',
              )}
              aria-label="Editar saldo"
            >
              <MoneyAmount value={debt.currentBalance} variant="expense" size="xl" />
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
                  className="rounded-full p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-text-tertiary transition-all duration-200 hover:text-text-primary hover:bg-surface-hover active:scale-[0.98]"
                  aria-label="Editar"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => setConfirmingDelete(true)}
                  className="rounded-full p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-text-tertiary transition-all duration-200 hover:text-negative hover:bg-negative/10 active:scale-[0.98]"
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
          <span className="text-xs font-medium text-text-secondary uppercase tracking-[2px]">
            Utilizacion
          </span>
          <span className={cn('text-sm font-semibold tabular-nums', SEMANTIC_COLORS[color])}>
            {utilization.toFixed(1)}%
          </span>
        </div>
        <BatteryBar value={utilization} variant="compact" thresholds={{ warning: 31, danger: 71 }} label={`Utilizacion de credito ${utilization.toFixed(1)}%`} />
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {debt.minimumPayment !== null && (
          <MetricItem label="Pago minimo" value={<MoneyAmount value={debt.minimumPayment} size="sm" />} />
        )}
        <MetricItem
          label="Interes mensual estimado"
          value={<MoneyAmount value={metrics.estimatedMonthlyInterest} size="sm" />}
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
          <span className="text-xs font-medium text-text-secondary uppercase tracking-[2px]">Progreso</span>
          <span
            className={cn('text-sm font-semibold tabular-nums', SEMANTIC_COLORS[progressColor])}
          >
            {percentPaid.toFixed(1)}%
          </span>
        </div>
        <BatteryBar value={percentPaid} variant="compact" thresholds={{ warning: 101, danger: 102 }} label={`Progreso de pago ${percentPaid.toFixed(1)}%`} />
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {debt.monthlyPayment !== null && (
          <MetricItem label="Mensualidad" value={<MoneyAmount value={debt.monthlyPayment} size="sm" />} />
        )}
        {debt.remainingMonths !== null && (
          <MetricItem label="Meses restantes" value={`${debt.remainingMonths}`} />
        )}
        {metrics.totalRemainingPayment !== null && (
          <MetricItem label="Total por pagar" value={<MoneyAmount value={metrics.totalRemainingPayment} size="sm" />} />
        )}
        <MetricItem label="Tasa anual" value={formatRate(debt.annualRate)} />
      </div>
    </div>
  )
}

interface MetricItemProps {
  label: string
  value: React.ReactNode
}

function MetricItem({ label, value }: MetricItemProps) {
  return (
    <div>
      <p className="text-xs font-medium text-text-secondary uppercase tracking-[2px] mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-text-primary">{value}</p>
    </div>
  )
}
