'use client'

import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import TransactionForm from '@/components/transactions/TransactionForm'
import { getTransactionFormData } from '@/app/movimientos/actions'
import { cn } from '@/lib/utils'
import type { Category, SerializedIncomeSource } from '@/types'

interface FormData {
  categories: Category[]
  incomeSources: SerializedIncomeSource[]
}

/** Floating action button that opens TransactionForm with lazy-loaded data */
export default function FAB() {
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState<FormData | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleOpen() {
    setIsOpen(true)
    if (!formData) {
      setLoading(true)
      const data = await getTransactionFormData()
      setFormData(data)
      setLoading(false)
    }
  }

  function handleClose() {
    setIsOpen(false)
  }

  return (
    <>
      <button
        type="button"
        aria-label="Registrar movimiento"
        onClick={handleOpen}
        className={cn(
          'fixed z-40',
          'bottom-20 right-4 md:bottom-6 md:right-6',
          'flex h-12 w-12 items-center justify-center',
          'rounded-full bg-accent shadow-lg shadow-glow',
          'hover:bg-accent-hover hover:scale-105',
          'active:scale-95',
          'transition-all duration-200',
        )}
      >
        {loading ? (
          <Loader2 size={24} className="text-bg-primary animate-spin" />
        ) : (
          <Plus size={24} className="text-bg-primary" />
        )}
      </button>

      {formData && (
        <TransactionForm
          isOpen={isOpen}
          onClose={handleClose}
          categories={formData.categories}
          incomeSources={formData.incomeSources}
        />
      )}
    </>
  )
}
