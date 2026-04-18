'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getMonthlyEquivalent } from '@/lib/income'
import { deleteIncomeSource } from '@/app/(app)/ingresos/actions'
import { FREQUENCY_DISPLAY } from '@/lib/constants'
import MoneyAmount from '@/components/ui/MoneyAmount'
import DynamicIcon from '@/components/ui/DynamicIcon'
import type { SerializedIncomeSource } from '@/types'

interface IncomeSourceCardProps {
  source: SerializedIncomeSource
  onEdit: (source: SerializedIncomeSource) => void
}

export default function IncomeSourceCard({ source, onEdit }: IncomeSourceCardProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const monthlyAmount = getMonthlyEquivalent(source.defaultAmount, source.frequency)
  const isVariable = source.frequency === 'VARIABLE'

  /** Icon and color per type (Phase 17 decision: Empleo #6BAF8E, Freelance #7AACB8) */
  const typeIcon = source.type === 'EMPLOYMENT' ? 'briefcase' : source.type === 'FREELANCE' ? 'laptop' : 'banknote'
  const typeColor = source.type === 'EMPLOYMENT' ? '#6BAF8E' : source.type === 'FREELANCE' ? '#7AACB8' : '#8A9099'

  useEffect(() => {
    if (!confirmingDelete) return

    const timer = setTimeout(() => {
      setConfirmingDelete(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [confirmingDelete])

  const handleDelete = useCallback(async () => {
    setDeleting(true)
    try {
      const result = await deleteIncomeSource(source.id)
      if (result && 'error' in result) {
        const messages = Object.values(result.error).flat()
        toast.error(messages[0] ?? 'Error al eliminar', { duration: 5000 })
      } else {
        toast.success('Fuente de ingreso eliminada')
      }
    } catch {
      toast.error('Error al eliminar', { duration: 5000 })
    }
    setDeleting(false)
    setConfirmingDelete(false)
  }, [source.id])

  const handleCancel = useCallback(() => {
    setConfirmingDelete(false)
  }, [])

  return (
    <div className={cn(
      'rounded-2xl bg-surface-elevated p-5',
      'transition-all duration-200',
    )}>
      {/* Top row: icon + name + type label */}
      <div className="flex items-center gap-3 mb-3">
        {/* Circular icon container with category color at 12% opacity */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${typeColor}1F` }}
        >
          <DynamicIcon
            name={typeIcon}
            size={18}
            style={{ color: typeColor }}
            aria-hidden="true"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-text-primary truncate">{source.name}</h3>
          <span className="text-xs font-medium uppercase tracking-[2px] text-text-secondary">
            {source.type === 'EMPLOYMENT' ? 'Empleo' : source.type === 'FREELANCE' ? 'Freelance' : 'Otro'}
          </span>
        </div>
        {/* Frequency badge */}
        <span className={cn(
          'text-[11px] font-semibold uppercase tracking-[2px]',
          'px-2 py-0.5 rounded-full shrink-0',
          'bg-positive-subtle text-positive',
        )}>
          {FREQUENCY_DISPLAY[source.frequency] ?? source.frequency}
        </span>
      </div>

      {/* Amount row: MoneyAmount with positive color */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          <MoneyAmount value={source.defaultAmount} variant="income" size="xl" className="text-xl font-bold" />
          {isVariable && (
            <span className="text-sm text-accent">(estimado)</span>
          )}
        </div>
        <p className="text-xs font-medium uppercase tracking-[2px] text-text-secondary mt-1">
          Mensual: <span className="font-mono tabular-nums normal-case tracking-normal">{' '}</span>
          <MoneyAmount value={monthlyAmount} variant="income" size="sm" className="text-xs" />
        </p>
      </div>

      {/* Actions row */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
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
                onClick={handleCancel}
                className="text-text-secondary font-semibold hover:text-text-primary transition-colors duration-200"
              >
                No
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => onEdit(source)}
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
    </div>
  )
}
