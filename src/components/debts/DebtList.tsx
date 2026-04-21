'use client'

import { CreditCard } from 'lucide-react'
import DebtCard from './DebtCard'
import type { SerializedDebt } from '@/types'

interface DebtListProps {
  debts: SerializedDebt[]
  onEdit: (debt: SerializedDebt) => void
  onAdd: () => void
}

export default function DebtList({ debts, onEdit, onAdd }: DebtListProps) {
  if (debts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CreditCard size={32} className="text-text-tertiary mb-3" aria-hidden="true" />
        <p className="text-text-secondary text-lg mb-4">Sin deudas registradas</p>
        <button
          onClick={onAdd}
          className="bg-accent text-black font-semibold rounded-full px-4 py-2 transition-all duration-200 hover:bg-accent-hover active:scale-[0.98]"
        >
          Agregar deuda
        </button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 items-start">
      {debts.map((debt) => (
        <DebtCard key={debt.id} debt={debt} onEdit={onEdit} />
      ))}
    </div>
  )
}
