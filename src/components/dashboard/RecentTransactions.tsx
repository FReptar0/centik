'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import DynamicIcon from '@/components/ui/DynamicIcon'
import MoneyAmount from '@/components/ui/MoneyAmount'
import { cn } from '@/lib/utils'
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
      <div className="bg-surface-elevated rounded-lg p-5">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Ultimos Movimientos
        </h3>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <DynamicIcon
            name="receipt"
            size={32}
            className="text-text-tertiary mb-3"
            aria-hidden="true"
          />
          <p className="text-text-secondary text-sm">Sin movimientos</p>
          <p className="text-text-tertiary text-xs mt-1">
            Registra tu primer movimiento con el boton +
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface-elevated rounded-lg p-5">
      <h3 className="text-lg font-semibold text-text-primary mb-4">
        Ultimos Movimientos
      </h3>

      <div className="divide-y divide-border-divider">
        {transactions.map((txn) => {
          const isIncome = txn.type === 'INCOME'
          const displayName = txn.description ?? txn.category.name

          return (
            <div key={txn.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              {/* Category icon */}
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
                style={{
                  backgroundColor: `${txn.category.color}1F`,
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
                <p className="text-[11px] text-text-tertiary">
                  {formatShortDate(txn.date)}
                </p>
              </div>

              {/* Amount via MoneyAmount */}
              <span className="shrink-0 text-sm font-semibold">
                <span className={cn('font-mono', isIncome ? 'text-positive' : 'text-negative')}>
                  {isIncome ? '+' : '-'}
                </span>
                <MoneyAmount
                  value={txn.amount}
                  variant={isIncome ? 'income' : 'expense'}
                  size="sm"
                />
              </span>
            </div>
          )
        })}
      </div>

      {/* "VER TODO" accent badge link */}
      <div className="mt-4 pt-3 border-t border-border-divider">
        <Link
          href="/movimientos"
          className={cn(
            'inline-flex items-center gap-1.5',
            'rounded-full bg-accent-subtle px-3 py-1',
            'text-[11px] font-semibold uppercase tracking-widest text-accent',
            'hover:bg-accent/20 transition-colors duration-200',
          )}
        >
          VER TODO
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}
