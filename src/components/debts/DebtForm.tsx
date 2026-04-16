'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import Modal from '@/components/ui/Modal'
import FloatingInput from '@/components/ui/FloatingInput'
import { cn, toCents } from '@/lib/utils'
import { createDebtSchema } from '@/lib/validators'
import { createDebt, updateDebt } from '@/app/deudas/actions'
import { DebtType } from '@/types'
import type { SerializedDebt } from '@/types'

interface DebtFormProps {
  isOpen: boolean
  onClose: () => void
  debt: SerializedDebt | null
}

const DEBT_TYPE_DISPLAY: Record<string, string> = {
  CREDIT_CARD: 'Tarjeta de Credito',
  PERSONAL_LOAN: 'Prestamo Personal',
  AUTO_LOAN: 'Prestamo Auto',
  OTHER: 'Otro',
}

const DEBT_TYPE_VALUES = Object.values(DebtType)

/** Strip commas and non-numeric chars (except one decimal point) */
function cleanAmountInput(value: string): string {
  return value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
}

export default function DebtForm({ isOpen, onClose, debt }: DebtFormProps) {
  const title = debt ? 'Editar Deuda' : 'Nueva Deuda'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {isOpen && (
        <DebtFormContent key={debt?.id ?? 'new'} debt={debt} onClose={onClose} />
      )}
    </Modal>
  )
}

interface FormContentProps {
  debt: SerializedDebt | null
  onClose: () => void
}

/** Cents string to peso display value for form pre-fill */
function centsToPesos(cents: string | null): string {
  if (cents === null || cents === '0') return ''
  return (Number(cents) / 100).toString()
}

/** Inner form that remounts via key when debt changes */
function DebtFormContent({ debt, onClose }: FormContentProps) {
  const isEditing = !!debt

  const [name, setName] = useState(debt?.name ?? '')
  const [type, setType] = useState<string>(debt?.type ?? 'CREDIT_CARD')
  const [currentBalance, setCurrentBalance] = useState(centsToPesos(debt?.currentBalance ?? null))
  const [annualRate, setAnnualRate] = useState(
    debt ? (debt.annualRate / 100).toString() : '',
  )

  // Credit card fields
  const [creditLimit, setCreditLimit] = useState(centsToPesos(debt?.creditLimit ?? null))
  const [minimumPayment, setMinimumPayment] = useState(centsToPesos(debt?.minimumPayment ?? null))
  const [cutOffDay, setCutOffDay] = useState(debt?.cutOffDay?.toString() ?? '')
  const [paymentDueDay, setPaymentDueDay] = useState(debt?.paymentDueDay?.toString() ?? '')

  // Loan fields
  const [originalAmount, setOriginalAmount] = useState(centsToPesos(debt?.originalAmount ?? null))
  const [monthlyPayment, setMonthlyPayment] = useState(centsToPesos(debt?.monthlyPayment ?? null))
  const [remainingMonths, setRemainingMonths] = useState(debt?.remainingMonths?.toString() ?? '')

  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)

  const isCreditCard = type === 'CREDIT_CARD'

  function getDebtPayload(): Record<string, unknown> {
    const rateBps = Math.round(parseFloat(annualRate || '0') * 100)
    const payload: Record<string, unknown> = {
      name: name.trim(),
      type,
      currentBalance: toCents(currentBalance || '0'),
      annualRate: rateBps,
    }
    if (type === 'CREDIT_CARD') {
      if (creditLimit) payload.creditLimit = toCents(creditLimit)
      if (minimumPayment) payload.minimumPayment = toCents(minimumPayment)
      if (cutOffDay) payload.cutOffDay = parseInt(cutOffDay, 10)
      if (paymentDueDay) payload.paymentDueDay = parseInt(paymentDueDay, 10)
    } else {
      if (originalAmount) payload.originalAmount = toCents(originalAmount)
      if (monthlyPayment) payload.monthlyPayment = toCents(monthlyPayment)
      if (remainingMonths) payload.remainingMonths = parseInt(remainingMonths, 10)
    }
    return payload
  }

  function validateField(fieldName: string, data: Record<string, unknown>) {
    const result = createDebtSchema.safeParse(data)
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
        [fieldName]: fieldErrors.length > 0 ? fieldErrors : prev[fieldName] ?? [],
      }))
    }
  }

  function revalidateIfTouched(fieldName: string, payload: Record<string, unknown>) {
    if (touched.has(fieldName)) {
      setTimeout(() => validateField(fieldName, payload), 0)
    }
  }

  function markTouched(fieldName: string) {
    if (!touched.has(fieldName)) {
      setTouched((prev) => new Set(prev).add(fieldName))
    }
  }

  function handleAmountChange(
    fieldName: string,
    setter: (v: string) => void,
    v: string,
    payloadKey?: string,
  ) {
    const cleaned = cleanAmountInput(v)
    setter(cleaned)
    markTouched(fieldName)
    const key = payloadKey ?? fieldName
    revalidateIfTouched(fieldName, { ...getDebtPayload(), [key]: toCents(cleaned || '0') })
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setErrors({})

    const rateBps = Math.round(parseFloat(annualRate || '0') * 100)

    const payload: Record<string, unknown> = {
      name: name.trim(),
      type,
      currentBalance: toCents(currentBalance || '0'),
      annualRate: rateBps,
    }

    if (isCreditCard) {
      if (creditLimit) payload.creditLimit = toCents(creditLimit)
      if (minimumPayment) payload.minimumPayment = toCents(minimumPayment)
      if (cutOffDay) payload.cutOffDay = parseInt(cutOffDay, 10)
      if (paymentDueDay) payload.paymentDueDay = parseInt(paymentDueDay, 10)
    } else {
      if (originalAmount) payload.originalAmount = toCents(originalAmount)
      if (monthlyPayment) payload.monthlyPayment = toCents(monthlyPayment)
      if (remainingMonths) payload.remainingMonths = parseInt(remainingMonths, 10)
    }

    const result = isEditing
      ? await updateDebt(debt.id, payload)
      : await createDebt(payload)

    setSubmitting(false)

    if ('success' in result) {
      toast.success(isEditing ? 'Deuda actualizada' : 'Deuda creada')
      onClose()
    } else {
      setErrors(result.error)
      const messages = Object.values(result.error).flat()
      toast.error(messages[0] ?? 'Error al guardar', { duration: 5000 })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <FloatingInput
        label="Nombre"
        value={name}
        onChange={(v) => {
          setName(v)
          markTouched('name')
          revalidateIfTouched('name', { ...getDebtPayload(), name: v.trim() })
        }}
        error={errors.name?.[0]}
      />

      {/* Type radio group */}
      <div>
        <span className="block text-xs font-medium text-text-secondary tracking-[2px] uppercase mb-1.5">
          Tipo
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DEBT_TYPE_VALUES.map((t) => (
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
              {DEBT_TYPE_DISPLAY[t] ?? t}
            </button>
          ))}
        </div>
        {errors.type && <p className="mt-1 text-xs text-negative">{errors.type[0]}</p>}
      </div>

      {/* Current Balance */}
      <FloatingInput
        label="Saldo actual"
        value={currentBalance}
        onChange={(v) => handleAmountChange('currentBalance', setCurrentBalance, v)}
        prefix="$"
        error={errors.currentBalance?.[0]}
      />

      {/* Annual Rate */}
      <FloatingInput
        label="Tasa anual"
        value={annualRate}
        onChange={(v) => {
          setAnnualRate(v)
          markTouched('annualRate')
          revalidateIfTouched('annualRate', {
            ...getDebtPayload(),
            annualRate: Math.round(parseFloat(v || '0') * 100),
          })
        }}
        suffix="%"
        error={errors.annualRate?.[0]}
      />

      {/* Type-specific fields */}
      {isCreditCard ? (
        <>
          <FloatingInput
            label="Limite de credito"
            value={creditLimit}
            onChange={(v) => handleAmountChange('creditLimit', setCreditLimit, v)}
            prefix="$"
            error={errors.creditLimit?.[0]}
          />
          <FloatingInput
            label="Pago minimo"
            value={minimumPayment}
            onChange={(v) => handleAmountChange('minimumPayment', setMinimumPayment, v)}
            prefix="$"
            error={errors.minimumPayment?.[0]}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FloatingInput
              label="Dia de corte"
              value={cutOffDay}
              onChange={(v) => {
                setCutOffDay(v)
                markTouched('cutOffDay')
                revalidateIfTouched('cutOffDay', {
                  ...getDebtPayload(),
                  cutOffDay: v ? parseInt(v, 10) : undefined,
                })
              }}
              error={errors.cutOffDay?.[0]}
            />
            <FloatingInput
              label="Dia de pago"
              value={paymentDueDay}
              onChange={(v) => {
                setPaymentDueDay(v)
                markTouched('paymentDueDay')
                revalidateIfTouched('paymentDueDay', {
                  ...getDebtPayload(),
                  paymentDueDay: v ? parseInt(v, 10) : undefined,
                })
              }}
              error={errors.paymentDueDay?.[0]}
            />
          </div>
        </>
      ) : (
        <>
          <FloatingInput
            label="Monto original"
            value={originalAmount}
            onChange={(v) => handleAmountChange('originalAmount', setOriginalAmount, v)}
            prefix="$"
            error={errors.originalAmount?.[0]}
          />
          <FloatingInput
            label="Mensualidad"
            value={monthlyPayment}
            onChange={(v) => handleAmountChange('monthlyPayment', setMonthlyPayment, v)}
            prefix="$"
            error={errors.monthlyPayment?.[0]}
          />
          <FloatingInput
            label="Meses restantes"
            value={remainingMonths}
            onChange={(v) => {
              setRemainingMonths(v)
              markTouched('remainingMonths')
              revalidateIfTouched('remainingMonths', {
                ...getDebtPayload(),
                remainingMonths: v ? parseInt(v, 10) : undefined,
              })
            }}
            error={errors.remainingMonths?.[0]}
          />
        </>
      )}

      {/* Form-level errors */}
      {errors._form && <p className="text-xs text-negative">{errors._form[0]}</p>}

      {/* Submit */}
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
