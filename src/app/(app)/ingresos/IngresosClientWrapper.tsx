'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import IncomeSummaryCards from '@/components/income/IncomeSummaryCards'
import IncomeSourceList from '@/components/income/IncomeSourceList'
import IncomeSourceForm from '@/components/income/IncomeSourceForm'
import type { SerializedIncomeSource } from '@/types'

interface IngresosClientWrapperProps {
  sources: SerializedIncomeSource[]
}

export default function IngresosClientWrapper({ sources }: IngresosClientWrapperProps) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSource, setEditingSource] = useState<SerializedIncomeSource | null>(null)

  function handleAdd() {
    setEditingSource(null)
    setIsFormOpen(true)
  }

  function handleEdit(source: SerializedIncomeSource) {
    setEditingSource(source)
    setIsFormOpen(true)
  }

  function handleClose() {
    setIsFormOpen(false)
    setEditingSource(null)
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Ingresos"
        action={
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black transition-all duration-200 hover:bg-accent-hover active:scale-[0.98]"
          >
            <Plus size={16} />
            Agregar
          </button>
        }
      />

      <IncomeSummaryCards sources={sources} />

      <IncomeSourceList sources={sources} onEdit={handleEdit} onAdd={handleAdd} />

      <IncomeSourceForm isOpen={isFormOpen} onClose={handleClose} source={editingSource} />
    </div>
  )
}
