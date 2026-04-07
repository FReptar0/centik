'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  maxWidth?: string
}

/**
 * Responsive modal/sheet primitive.
 * Mobile (<md): bottom sheet sliding up from bottom.
 * Desktop (md+): centered modal with fade + scale.
 * Both rendered via CSS-only responsive -- no JS viewport detection.
 */
export default function Modal({
  isOpen,
  onClose,
  children,
  title,
  maxWidth = 'max-w-[480px]',
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        data-testid="modal-backdrop"
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Mobile bottom sheet (<md) */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 md:hidden',
          'max-h-[90vh] overflow-y-auto',
          'bg-surface-elevated border-t border-border-divider rounded-t-xl',
          'transform transition-transform duration-300 ease-out',
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Drag handle indicator */}
        <div className="flex justify-center py-3">
          <div className="h-1 w-10 rounded-full bg-border-light" />
        </div>

        {title && (
          <div className="flex items-center justify-between px-7 pb-4">
            <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-text-tertiary transition-colors duration-200 hover:text-text-primary"
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>
          </div>
        )}

        <div className="px-7 pb-7">{children}</div>
      </div>

      {/* Desktop centered modal (md+) */}
      <div
        className={cn(
          'fixed inset-0 z-50 hidden md:flex items-center justify-center p-4',
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div
          className={cn(
            'relative w-full overflow-y-auto',
            'max-h-[85vh] rounded-xl border border-border-divider bg-surface-elevated p-7',
            'transition-all duration-200',
            maxWidth,
          )}
        >
          {title && (
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="rounded-md p-1 text-text-tertiary transition-colors duration-200 hover:text-text-primary"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
          )}

          {children}
        </div>
      </div>
    </>
  )
}
