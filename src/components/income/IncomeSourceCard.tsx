'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Pencil, Trash2 } from 'lucide-react'
import { cn, formatMoney } from '@/lib/utils'
import { getMonthlyEquivalent } from '@/lib/income'
import { deleteIncomeSource } from '@/app/ingresos/actions'
import { FREQUENCY_DISPLAY } from '@/lib/constants'
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
      'rounded-xl border border-border-divider bg-surface-elevated p-5',
      'transition-all duration-200',
    )}>
      {/* Top row: name + type badge */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-text-primary">{source.name}</h3>
        <span className="text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-sm bg-accent/15 text-accent">
          {source.type === 'EMPLOYMENT' ? 'Empleo' : source.type === 'FREELANCE' ? 'Freelance' : 'Otro'}
        </span>
      </div>

      {/* Middle row: amount + monthly equivalent */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-text-primary tabular-nums">
            {formatMoney(source.defaultAmount)}
          </span>
          {isVariable && (
            <span className="text-sm text-accent">(estimado)</span>
          )}
        </div>
        <p className="text-sm tabular-nums text-text-secondary mt-1">
          Mensual: {formatMoney(monthlyAmount)}
        </p>
      </div>

      {/* Bottom row: frequency badge + actions */}
      <div className="flex items-center justify-between">
        <span className={cn(
          'text-[11px] font-semibold uppercase tracking-wide',
          'px-2 py-0.5 rounded-sm',
          'bg-positive/15 text-positive',
        )}>
          {FREQUENCY_DISPLAY[source.frequency] ?? source.frequency}
        </span>

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
                className="rounded-md p-2 text-text-tertiary transition-colors duration-200 hover:text-text-primary hover:bg-surface-hover"
                aria-label="Editar"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => setConfirmingDelete(true)}
                className="rounded-md p-2 text-text-tertiary transition-colors duration-200 hover:text-negative hover:bg-negative/10"
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
