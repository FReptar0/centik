'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import Modal from '@/components/ui/Modal'
import { cn, toCents } from '@/lib/utils'
import { createIncomeSource, updateIncomeSource } from '@/app/ingresos/actions'
import { FREQUENCY_DISPLAY, INCOME_SOURCE_TYPES } from '@/lib/constants'
import { Frequency } from '@/types'
import type { SerializedIncomeSource } from '@/types'

interface IncomeSourceFormProps {
  isOpen: boolean
  onClose: () => void
  source?: SerializedIncomeSource | null
}

const TYPE_DISPLAY: Record<string, string> = {
  EMPLOYMENT: 'Empleo',
  FREELANCE: 'Freelance',
  OTHER: 'Otro',
}

const FREQUENCY_VALUES = Object.values(Frequency)

export default function IncomeSourceForm({ isOpen, onClose, source }: IncomeSourceFormProps) {
  const isEditing = !!source
  const title = isEditing ? 'Editar fuente de ingreso' : 'Nueva fuente de ingreso'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {isOpen && (
        <IncomeSourceFormContent
          key={source?.id ?? 'new'}
          source={source}
          onClose={onClose}
        />
      )}
    </Modal>
  )
}

interface FormContentProps {
  source?: SerializedIncomeSource | null
  onClose: () => void
}

/** Inner form component that remounts via key when source changes */
function IncomeSourceFormContent({ source, onClose }: FormContentProps) {
  const isEditing = !!source

  const [name, setName] = useState(source?.name ?? '')
  const [amount, setAmount] = useState(
    source ? (Number(source.defaultAmount) / 100).toString() : '',
  )
  const [frequency, setFrequency] = useState<string>(source?.frequency ?? 'QUINCENAL')
  const [type, setType] = useState<string>(source?.type ?? 'EMPLOYMENT')
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setErrors({})

    const payload = {
      name: name.trim(),
      defaultAmount: toCents(amount || '0'),
      frequency,
      type,
    }

    const result = isEditing
      ? await updateIncomeSource(source.id, payload)
      : await createIncomeSource(payload)

    setSubmitting(false)

    if ('success' in result) {
      toast.success(isEditing ? 'Fuente de ingreso actualizada' : 'Fuente de ingreso creada')
      onClose()
    } else {
      setErrors(result.error)
      const messages = Object.values(result.error).flat()
      toast.error(messages[0] ?? 'Error al guardar', { duration: 5000 })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name field */}
      <div>
        <label
          htmlFor="income-name"
          className="block text-xs font-medium text-text-secondary tracking-wide uppercase mb-1.5"
        >
          Nombre
        </label>
        <input
          id="income-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. TerSoft"
          className={cn(
            'w-full rounded-lg border bg-bg-input px-3 py-2.5 text-sm text-text-primary',
            'placeholder:text-text-muted',
            'transition-colors duration-200',
            'focus:outline-none focus:border-border-focus focus:shadow-[0_0_20px_rgba(34,211,238,0.15)]',
            errors.name ? 'border-negative' : 'border-border',
          )}
        />
        {errors.name && (
          <p className="mt-1 text-xs text-negative">{errors.name[0]}</p>
        )}
      </div>

      {/* Amount field */}
      <div>
        <label
          htmlFor="income-amount"
          className="block text-xs font-medium text-text-secondary tracking-wide uppercase mb-1.5"
        >
          Monto por defecto
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">
            $
          </span>
          <input
            id="income-amount"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className={cn(
              'w-full rounded-lg border bg-bg-input pl-7 pr-3 py-2.5 text-sm text-text-primary text-right',
              'placeholder:text-text-muted',
              'transition-colors duration-200',
              'focus:outline-none focus:border-border-focus focus:shadow-[0_0_20px_rgba(34,211,238,0.15)]',
              errors.defaultAmount ? 'border-negative' : 'border-border',
            )}
          />
        </div>
        {errors.defaultAmount && (
          <p className="mt-1 text-xs text-negative">{errors.defaultAmount[0]}</p>
        )}
      </div>

      {/* Frequency radio group */}
      <div>
        <span className="block text-xs font-medium text-text-secondary tracking-wide uppercase mb-1.5">
          Frecuencia
        </span>
        <div className="grid grid-cols-2 gap-2">
          {FREQUENCY_VALUES.map((freq) => (
            <button
              key={freq}
              type="button"
              onClick={() => setFrequency(freq)}
              className={cn(
                'rounded-lg border px-3 py-2 text-sm font-medium transition-colors duration-200',
                frequency === freq
                  ? 'bg-accent/15 text-accent border-accent'
                  : 'bg-bg-input text-text-secondary border-border hover:border-border-light',
              )}
            >
              {FREQUENCY_DISPLAY[freq] ?? freq}
            </button>
          ))}
        </div>
        {errors.frequency && (
          <p className="mt-1 text-xs text-negative">{errors.frequency[0]}</p>
        )}
      </div>

      {/* Type radio group */}
      <div>
        <span className="block text-xs font-medium text-text-secondary tracking-wide uppercase mb-1.5">
          Tipo
        </span>
        <div className="grid grid-cols-3 gap-2">
          {INCOME_SOURCE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                'rounded-lg border px-3 py-2 text-sm font-medium transition-colors duration-200',
                type === t
                  ? 'bg-accent/15 text-accent border-accent'
                  : 'bg-bg-input text-text-secondary border-border hover:border-border-light',
              )}
            >
              {TYPE_DISPLAY[t] ?? t}
            </button>
          ))}
        </div>
        {errors.type && (
          <p className="mt-1 text-xs text-negative">{errors.type[0]}</p>
        )}
      </div>

      {/* Form-level errors */}
      {errors._form && (
        <p className="text-xs text-negative">{errors._form[0]}</p>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={submitting}
        className={cn(
          'w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-bg-primary',
          'transition-colors duration-200',
          'hover:bg-accent-hover',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        )}
      >
        {submitting ? 'Guardando...' : 'Guardar'}
      </button>
    </form>
  )
}
