'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import Modal from '@/components/ui/Modal'
import FloatingInput from '@/components/ui/FloatingInput'
import { cn, toCents } from '@/lib/utils'
import { createIncomeSource, updateIncomeSource } from '@/app/(app)/ingresos/actions'
import { createIncomeSourceSchema } from '@/lib/validators'
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

/** Strip commas and non-numeric chars (except one decimal point) */
function cleanAmountInput(value: string): string {
  return value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
}

export default function IncomeSourceForm({ isOpen, onClose, source }: IncomeSourceFormProps) {
  const isEditing = !!source
  const title = isEditing ? 'Editar fuente de ingreso' : 'Nueva fuente de ingreso'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {isOpen && (
        <IncomeSourceFormContent key={source?.id ?? 'new'} source={source} onClose={onClose} />
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

  const rawAmountInit = source ? (Number(source.defaultAmount) / 100).toString() : ''
  const [name, setName] = useState(source?.name ?? '')
  const [amount, setAmount] = useState(rawAmountInit)
  const [frequency, setFrequency] = useState<string>(source?.frequency ?? 'QUINCENAL')
  const [type, setType] = useState<string>(source?.type ?? 'EMPLOYMENT')
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)

  function getFormPayload() {
    return {
      name: name.trim(),
      defaultAmount: toCents(amount || '0'),
      frequency,
      type,
    }
  }

  function validateField(fieldName: string, data: Record<string, unknown>) {
    const result = createIncomeSourceSchema.safeParse(data)
    if (result.success) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[fieldName]
        return next
      })
    } else {
      const fieldErrors = result.error.issues
        .filter((issue) => issue.path[0] === fieldName)
        .map((issue) => issue.message)
      setErrors((prev) => ({
        ...prev,
        [fieldName]: fieldErrors.length > 0 ? fieldErrors : (prev[fieldName] ?? []),
      }))
    }
  }

  function handleNameChange(v: string) {
    setName(v)
    if (!touched.has('name')) {
      setTouched((prev) => new Set(prev).add('name'))
    }
    if (touched.has('name')) {
      const payload = { ...getFormPayload(), name: v.trim() }
      setTimeout(() => validateField('name', payload), 0)
    }
  }

  function handleAmountChange(v: string) {
    const cleaned = cleanAmountInput(v)
    setAmount(cleaned)
    if (!touched.has('defaultAmount')) {
      setTouched((prev) => new Set(prev).add('defaultAmount'))
    }
    if (touched.has('defaultAmount')) {
      const payload = { ...getFormPayload(), defaultAmount: toCents(cleaned || '0') }
      setTimeout(() => validateField('defaultAmount', payload), 0)
    }
  }

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
      <FloatingInput
        label="Nombre"
        value={name}
        onChange={handleNameChange}
        error={errors.name?.[0]}
      />

      {/* Amount field */}
      <FloatingInput
        label="Monto por defecto"
        value={amount}
        onChange={handleAmountChange}
        prefix="$"
        error={errors.defaultAmount?.[0]}
      />

      {/* Frequency radio group */}
      <div>
        <span className="block text-xs font-medium text-text-secondary tracking-[2px] uppercase mb-1.5">
          Frecuencia
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {FREQUENCY_VALUES.map((freq) => (
            <button
              key={freq}
              type="button"
              onClick={() => setFrequency(freq)}
              className={cn(
                'rounded-full border px-3 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.98]',
                frequency === freq
                  ? 'bg-accent/15 text-accent border-accent'
                  : 'bg-transparent text-text-secondary border-border-divider',
              )}
            >
              {FREQUENCY_DISPLAY[freq] ?? freq}
            </button>
          ))}
        </div>
        {errors.frequency && <p className="mt-1 text-xs text-negative">{errors.frequency[0]}</p>}
      </div>

      {/* Type radio group */}
      <div>
        <span className="block text-xs font-medium text-text-secondary tracking-[2px] uppercase mb-1.5">
          Tipo
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {INCOME_SOURCE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                'rounded-full border px-3 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.98]',
                type === t
                  ? 'bg-accent/15 text-accent border-accent'
                  : 'bg-transparent text-text-secondary border-border-divider',
              )}
            >
              {TYPE_DISPLAY[t] ?? t}
            </button>
          ))}
        </div>
        {errors.type && <p className="mt-1 text-xs text-negative">{errors.type[0]}</p>}
      </div>

      {/* Form-level errors */}
      {errors._form && <p className="text-xs text-negative">{errors._form[0]}</p>}

      {/* Submit button */}
      <button
        type="submit"
        disabled={submitting}
        className={cn(
          'w-full rounded-full bg-accent py-2.5 text-sm font-semibold text-black',
          'transition-all duration-200 active:scale-[0.98]',
          'hover:bg-accent-hover',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        )}
      >
        {submitting ? 'Guardando...' : 'Guardar'}
      </button>
    </form>
  )
}
