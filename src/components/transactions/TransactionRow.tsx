'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Pencil, Trash2 } from 'lucide-react'
import DynamicIcon from '@/components/ui/DynamicIcon'
import { cn, formatMoney } from '@/lib/utils'
import { deleteTransaction } from '@/app/movimientos/actions'
import type { SerializedTransaction } from '@/types'

interface TransactionRowProps {
  transaction: SerializedTransaction & {
    category: { name: string; icon: string; color: string }
  }
  onEdit: (transaction: SerializedTransaction) => void
}

/**
 * Single transaction row with category icon, description/name,
 * date, colored signed amount, and inline delete confirmation.
 */
export default function TransactionRow({ transaction, onEdit }: TransactionRowProps) {
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
        'flex items-center gap-3 bg-bg-card rounded-xl p-4 border border-border',
        'transition-all duration-200',
      )}
    >
      {/* Icon circle */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${transaction.category.color}26` }}
      >
        <DynamicIcon
          name={transaction.category.icon}
          size={20}
          style={{ color: transaction.category.color }}
        />
      </div>

      {/* Text stack */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">
          {displayName}
        </p>
        <p className="text-xs text-text-muted">{formattedDate}</p>
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
            <span
              className={cn(
                'text-sm font-semibold tabular-nums',
                isIncome ? 'text-positive' : 'text-negative',
              )}
            >
              {isIncome ? '+' : '-'}
              {formatMoney(transaction.amount)}
            </span>
            <button
              onClick={() => onEdit(transaction)}
              className="rounded-md p-2 text-text-muted transition-colors duration-200 hover:text-text-primary hover:bg-bg-card-hover"
              aria-label="Editar"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={() => setConfirmingDelete(true)}
              className="rounded-md p-2 text-text-muted transition-colors duration-200 hover:text-negative hover:bg-negative/10"
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
