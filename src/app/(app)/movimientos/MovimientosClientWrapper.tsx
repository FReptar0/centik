'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Plus, RotateCcw } from 'lucide-react'
import { reopenPeriod } from '@/app/(app)/historial/actions'
import PageHeader from '@/components/layout/PageHeader'
import PeriodSelector from '@/components/layout/PeriodSelector'
import TransactionFilters from '@/components/transactions/TransactionFilters'
import TransactionList from '@/components/transactions/TransactionList'
import TransactionForm from '@/components/transactions/TransactionForm'
import { cn } from '@/lib/utils'
import type { Category, SerializedIncomeSource, SerializedTransaction } from '@/types'

type TransactionWithCategory = SerializedTransaction & {
  category: { name: string; icon: string; color: string }
}

interface MovimientosClientWrapperProps {
  transactions: TransactionWithCategory[]
  categories: Category[]
  incomeSources: SerializedIncomeSource[]
  totalCount: number
  periodIsClosed: boolean
  periodId: string
}

/** Client wrapper for /movimientos managing form state, filters, and pagination */
export default function MovimientosClientWrapper({
  transactions,
  categories,
  incomeSources,
  totalCount,
  periodIsClosed,
  periodId,
}: MovimientosClientWrapperProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] =
    useState<SerializedTransaction | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const currentLimit = Number(searchParams.get('limit')) || 25

  const activeFilters = {
    type: searchParams.get('type') ?? undefined,
    categoryId: searchParams.get('categoryId') ?? undefined,
    startDate: searchParams.get('startDate') ?? undefined,
    endDate: searchParams.get('endDate') ?? undefined,
    paymentMethod: searchParams.get('paymentMethod') ?? undefined,
  }

  const handleFilterChange = useCallback(
    (filters: Record<string, string | undefined>) => {
      const params = new URLSearchParams()

      const month = searchParams.get('month')
      const year = searchParams.get('year')
      if (month) params.set('month', month)
      if (year) params.set('year', year)

      for (const [key, value] of Object.entries(filters)) {
        if (value) {
          params.set(key, value)
        }
      }

      router.replace(`${pathname}?${params.toString()}`)
    },
    [searchParams, router, pathname],
  )

  function handleAdd() {
    setEditingTransaction(null)
    setIsFormOpen(true)
  }

  function handleEdit(txn: SerializedTransaction) {
    setEditingTransaction(txn)
    setIsFormOpen(true)
  }

  function handleClose() {
    setIsFormOpen(false)
    setEditingTransaction(null)
  }

  function handleLoadMore() {
    setIsLoadingMore(true)
    const params = new URLSearchParams(searchParams.toString())
    params.set('limit', String(currentLimit + 25))
    router.replace(`${pathname}?${params.toString()}`)
    setIsLoadingMore(false)
  }

  async function handleReopen() {
    const result = await reopenPeriod(periodId)
    if ('success' in result) {
      toast.success('Periodo reabierto')
      router.refresh()
    } else {
      const messages = Object.values(result.error).flat()
      toast.error(messages[0] ?? 'Error al reabrir periodo', { duration: 5000 })
    }
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Movimientos"
        periodSelector={<PeriodSelector isClosed={periodIsClosed} />}
        reopenAction={
          periodIsClosed ? (
            <button
              type="button"
              onClick={handleReopen}
              className="flex items-center gap-1.5 text-sm text-info hover:text-info/80 underline underline-offset-2 transition-colors duration-200"
            >
              <RotateCcw size={14} aria-hidden="true" />
              Reabrir periodo
            </button>
          ) : undefined
        }
        action={
          !periodIsClosed ? (
            <button
              onClick={handleAdd}
              className={cn(
                'flex items-center gap-2 rounded-full bg-accent px-4 py-2',
                'text-sm font-semibold text-black',
                'transition-all duration-200 hover:bg-accent-hover active:scale-[0.98]',
              )}
            >
              <Plus size={16} />
              Registrar
            </button>
          ) : undefined
        }
        closedBanner={periodIsClosed}
      />

      <TransactionFilters
        categories={categories}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
      />

      <TransactionList
        transactions={transactions}
        onEdit={handleEdit}
        hasMore={transactions.length < totalCount}
        onLoadMore={handleLoadMore}
        isLoadingMore={isLoadingMore}
      />

      <TransactionForm
        isOpen={isFormOpen}
        onClose={handleClose}
        categories={categories}
        incomeSources={incomeSources}
        transaction={editingTransaction}
      />
    </div>
  )
}
