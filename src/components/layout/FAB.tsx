'use client'

import { useState } from 'react'
import { Plus, Receipt } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { cn } from '@/lib/utils'

/** Floating action button for quick transaction entry */
export default function FAB() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        aria-label="Registrar movimiento"
        onClick={() => setIsOpen(true)}
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
        <Plus size={24} className="text-bg-primary" />
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Nuevo movimiento"
      >
        <div className="flex flex-col items-center gap-4 py-6">
          <Receipt size={48} className="text-text-muted" aria-hidden="true" />
          <p className="text-sm text-text-secondary text-center">
            El formulario de transacciones se construira en una fase posterior.
          </p>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-semibold',
              'border border-border-light text-text-secondary',
              'hover:text-text-primary hover:bg-bg-card-hover',
              'transition-all duration-200',
            )}
          >
            Cerrar
          </button>
        </div>
      </Modal>
    </>
  )
}
