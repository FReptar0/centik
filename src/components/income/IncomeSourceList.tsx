'use client'

import DynamicIcon from '@/components/ui/DynamicIcon'
import IncomeSourceCard from './IncomeSourceCard'
import type { SerializedIncomeSource } from '@/types'

interface IncomeSourceListProps {
  sources: SerializedIncomeSource[]
  onEdit: (source: SerializedIncomeSource) => void
  onAdd: () => void
}

export default function IncomeSourceList({ sources, onEdit, onAdd }: IncomeSourceListProps) {
  if (sources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <DynamicIcon
          name="banknote"
          size={48}
          className="text-text-muted mb-4"
          aria-hidden="true"
        />
        <p className="text-text-secondary text-lg mb-4">
          No tienes fuentes de ingreso configuradas
        </p>
        <button
          onClick={onAdd}
          className="bg-accent text-bg-primary font-semibold rounded-lg px-4 py-2 transition-colors duration-200 hover:bg-accent-hover"
        >
          Agregar fuente
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sources.map((source) => (
        <IncomeSourceCard key={source.id} source={source} onEdit={onEdit} />
      ))}
    </div>
  )
}
