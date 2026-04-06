'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import DebtSummaryCards from '@/components/debts/DebtSummaryCards'
import DebtList from '@/components/debts/DebtList'
import DebtForm from '@/components/debts/DebtForm'
import type { SerializedDebt } from '@/types'

interface DeudasClientWrapperProps {
  debts: SerializedDebt[]
  monthlyIncome: string
}

export default function DeudasClientWrapper({ debts, monthlyIncome }: DeudasClientWrapperProps) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingDebt, setEditingDebt] = useState<SerializedDebt | null>(null)

  function handleAdd() {
    setEditingDebt(null)
    setIsFormOpen(true)
  }

  function handleEdit(debt: SerializedDebt) {
    setEditingDebt(debt)
    setIsFormOpen(true)
  }

  function handleClose() {
    setIsFormOpen(false)
    setEditingDebt(null)
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Deudas"
        action={
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg-primary transition-colors duration-200 hover:bg-accent-hover"
          >
            <Plus size={16} />
            Agregar
          </button>
        }
      />

      <DebtSummaryCards debts={debts} monthlyIncome={monthlyIncome} />

      <DebtList debts={debts} onEdit={handleEdit} onAdd={handleAdd} />

      <DebtForm isOpen={isFormOpen} onClose={handleClose} debt={editingDebt} />
    </div>
  )
}
