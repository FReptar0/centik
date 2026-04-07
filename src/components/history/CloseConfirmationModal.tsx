'use client'

import { Loader2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { formatMoney, formatRate, cn } from '@/lib/utils'
import type { ClosePeriodPreview } from '@/lib/history'

interface CloseConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isLoading: boolean
  monthName: string
  year: number
  preview: ClosePeriodPreview | null
}

/** Danger-styled modal confirming period close with preview of exact totals */
export default function CloseConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  monthName,
  year,
  preview,
}: CloseConfirmationModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Cerrar el periodo de ${monthName} ${year}?`}
    >
      <div className="space-y-5">
        {/* Preview grid */}
        <div className="grid grid-cols-2 gap-3">
          {preview ? (
            <>
              <PreviewItem
                label="Ingresos"
                value={formatMoney(preview.totalIncome)}
                colorClass="text-positive"
              />
              <PreviewItem
                label="Gastos"
                value={formatMoney(preview.totalExpenses)}
                colorClass="text-negative"
              />
              <PreviewItem
                label="Ahorro"
                value={formatMoney(preview.totalSavings)}
                colorClass={
                  Number(preview.totalSavings) >= 0
                    ? 'text-positive'
                    : 'text-negative'
                }
              />
              <PreviewItem
                label="Tasa de Ahorro"
                value={formatRate(preview.savingsRate)}
                colorClass="text-text-primary"
              />
              <PreviewItem
                label="Deuda al Cierre"
                value={formatMoney(preview.debtAtClose)}
                colorClass={
                  Number(preview.debtAtClose) > 0
                    ? 'text-negative'
                    : 'text-text-primary'
                }
              />
              <PreviewItem
                label="Pagos a Deudas"
                value={formatMoney(preview.debtPayments)}
                colorClass="text-text-primary"
              />
            </>
          ) : (
            <>
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg bg-surface p-3 space-y-2"
                >
                  <div className="h-3 w-16 bg-border rounded animate-pulse" />
                  <div className="h-5 w-24 bg-border rounded animate-pulse" />
                </div>
              ))}
            </>
          )}
        </div>

        {/* Consequence text */}
        <p className="text-sm text-text-tertiary italic">
          Las transacciones de este mes quedaran bloqueadas
        </p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className={cn(
              'rounded-lg border px-4 py-2',
              'text-sm font-semibold text-text-secondary',
              'transition-colors duration-200 hover:text-text-primary',
            )}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading || !preview}
            className={cn(
              'rounded-lg px-4 py-2',
              'text-sm font-semibold text-white',
              'bg-negative hover:bg-negative/90',
              'transition-colors duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center gap-2',
            )}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                Cerrando...
              </>
            ) : (
              'Cerrar Periodo'
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}

interface PreviewItemProps {
  label: string
  value: string
  colorClass: string
}

/** Single metric card in the preview grid */
function PreviewItem({ label, value, colorClass }: PreviewItemProps) {
  return (
    <div className="rounded-lg bg-surface p-3">
      <p className="text-xs text-text-secondary mb-1">{label}</p>
      <p className={cn('text-base font-semibold tabular-nums', colorClass)}>
        {value}
      </p>
    </div>
  )
}
