'use client'

import DynamicIcon from '@/components/ui/DynamicIcon'
import TransactionRow from '@/components/transactions/TransactionRow'
import { cn } from '@/lib/utils'
import type { SerializedTransaction } from '@/types'

type TransactionWithCategory = SerializedTransaction & {
  category: { name: string; icon: string; color: string }
}

interface TransactionListProps {
  transactions: TransactionWithCategory[]
  onEdit: (transaction: SerializedTransaction) => void
  hasMore: boolean
  onLoadMore: () => void
  isLoadingMore: boolean
  newTransactionIds?: Set<string>
}

/** Transaction list with empty state and "Cargar mas" pagination */
export default function TransactionList({
  transactions,
  onEdit,
  hasMore,
  onLoadMore,
  isLoadingMore,
  newTransactionIds,
}: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <DynamicIcon
          name="arrow-left-right"
          size={32}
          className="text-text-tertiary mb-3"
          aria-hidden="true"
        />
        <p className="text-text-secondary text-lg">
          Sin movimientos este mes
        </p>
        <p className="mt-1 text-sm text-text-tertiary">
          Usa el boton + para registrar tu primer movimiento
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="divide-y divide-border-divider rounded-2xl overflow-hidden">
        {transactions.map((txn) => (
          <TransactionRow key={txn.id} transaction={txn} onEdit={onEdit} isNew={newTransactionIds?.has(txn.id)} />
        ))}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={isLoadingMore}
          className={cn(
            'mt-4 w-full rounded-full border border-border-divider bg-surface-elevated py-3',
            'text-sm font-medium text-text-secondary',
            'transition-all duration-200 active:scale-[0.98]',
            'hover:bg-surface-hover hover:text-text-primary',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {isLoadingMore ? 'Cargando...' : 'Cargar mas'}
        </button>
      )}
    </div>
  )
}
