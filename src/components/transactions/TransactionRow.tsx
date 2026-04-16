'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Pencil, Trash2 } from 'lucide-react'
import DynamicIcon from '@/components/ui/DynamicIcon'
import MoneyAmount from '@/components/ui/MoneyAmount'
import { cn } from '@/lib/utils'
import { PAYMENT_METHODS_DISPLAY } from '@/lib/constants'
import { deleteTransaction } from '@/app/movimientos/actions'
import type { SerializedTransaction } from '@/types'

interface TransactionRowProps {
  transaction: SerializedTransaction & {
    category: { name: string; icon: string; color: string }
  }
  onEdit: (transaction: SerializedTransaction) => void
  isNew?: boolean
}

/**
 * Single transaction row with category icon, description/name,
 * date, colored signed amount, and inline delete confirmation.
 */
export default function TransactionRow({ transaction, onEdit, isNew }: TransactionRowProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isIncome = transaction.type === 'INCOME'
  const displayName = transaction.description ?? transaction.category.name
  const formattedDate = new Date(transaction.date).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
  })

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
      const result = await deleteTransaction(transaction.id)
      if (result && 'error' in result) {
        const messages = Object.values(result.error).flat()
        toast.error(messages[0] ?? 'Error al eliminar', { duration: 5000 })
      } else {
        toast.success('Movimiento eliminado')
      }
    } catch {
      toast.error('Error al eliminar', { duration: 5000 })
    }
    setDeleting(false)
    setConfirmingDelete(false)
  }, [transaction.id])

  const handleCancel = useCallback(() => {
    setConfirmingDelete(false)
  }, [])

  return (
    <div
      className={cn(
        'flex items-center gap-3 bg-surface-elevated p-4',
        'transition-all duration-200',
        isNew && 'animate-scanline-reveal',
      )}
    >
      {/* Icon circle: 36x36px, border-radius 12px, category color at 12% opacity */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${transaction.category.color}1F` }}
      >
        <DynamicIcon
          name={transaction.category.icon}
          size={18}
          style={{ color: transaction.category.color }}
          aria-hidden="true"
        />
      </div>

      {/* Text stack */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">
          {displayName}
        </p>
        <div className="flex items-center gap-2">
          <p className="text-[11px] text-text-tertiary">{formattedDate}</p>
          {transaction.paymentMethod && (
            <span className="rounded-full bg-surface-hover px-2 py-0.5 text-[11px] font-semibold uppercase text-text-secondary">
              {PAYMENT_METHODS_DISPLAY[transaction.paymentMethod] ?? transaction.paymentMethod}
            </span>
          )}
        </div>
      </div>

      {/* Amount + actions */}
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
            <span className={cn('font-mono text-sm font-semibold tabular-nums', isIncome ? 'text-positive' : 'text-negative')}>
              {isIncome ? '+' : '-'}
            </span>
            <MoneyAmount
              value={transaction.amount}
              variant={isIncome ? 'income' : 'expense'}
              size="sm"
            />
            <button
              onClick={() => onEdit(transaction)}
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
  )
}
