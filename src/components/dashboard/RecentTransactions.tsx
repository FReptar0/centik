'use client'

import Link from 'next/link'
import DynamicIcon from '@/components/ui/DynamicIcon'
import { formatMoney, cn } from '@/lib/utils'
import type { RecentTransaction } from '@/lib/dashboard'

export interface RecentTransactionsProps {
  transactions: RecentTransaction[]
}

/** Formats a Date to short Spanish display like "1 abr" */
function formatShortDate(date: Date): string {
  return new Date(date).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
  })
}

export default function RecentTransactions({
  transactions,
}: RecentTransactionsProps) {
  if (transactions.length === 0) {
    return (
      <div className="bg-bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Ultimos Movimientos
        </h3>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <DynamicIcon
            name="receipt"
            size={32}
            className="text-text-muted mb-3"
            aria-hidden="true"
          />
          <p className="text-text-secondary text-sm">Sin movimientos</p>
          <p className="text-text-muted text-xs mt-1">
            Registra tu primer movimiento con el boton +
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold text-text-primary mb-4">
        Ultimos Movimientos
      </h3>

      <div className="space-y-3">
        {transactions.map((txn) => {
          const isIncome = txn.type === 'INCOME'
          const displayName = txn.description ?? txn.category.name

          return (
            <div key={txn.id} className="flex items-center gap-3">
              {/* Category icon */}
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{
                  backgroundColor: `${txn.category.color}26`,
                }}
              >
                <DynamicIcon
                  name={txn.category.icon}
                  size={16}
                  style={{ color: txn.category.color }}
                  aria-hidden="true"
                />
              </div>

              {/* Text stack */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {displayName}
                </p>
                <p className="text-xs text-text-muted">
                  {formatShortDate(txn.date)}
                </p>
              </div>

              {/* Amount */}
              <span
                className={cn(
                  'text-sm font-semibold tabular-nums shrink-0',
                  isIncome ? 'text-positive' : 'text-negative',
                )}
              >
                {isIncome ? '+' : '-'}
                {formatMoney(txn.amount)}
              </span>
            </div>
          )
        })}
      </div>

      {/* "Ver todos" link */}
      <div className="mt-4 pt-3 border-t border-border">
        <Link
          href="/movimientos"
          className="text-accent text-sm font-medium hover:text-accent-hover transition-colors duration-200"
        >
          Ver todos
        </Link>
      </div>
    </div>
  )
}
