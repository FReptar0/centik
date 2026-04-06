'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import Modal from '@/components/ui/Modal'
import { cn, toCents } from '@/lib/utils'
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
  const [submitting, setSubmitting] = useState(false)

  const isCreditCard = type === 'CREDIT_CARD'

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
      <FormField label="Nombre" htmlFor="debt-name" error={errors.name}>
        <input
          id="debt-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. BBVA Oro"
          className={cn(inputClass, errors.name ? 'border-negative' : 'border-border')}
        />
      </FormField>

      {/* Type radio group */}
      <div>
        <span className="block text-xs font-medium text-text-secondary tracking-wide uppercase mb-1.5">
          Tipo
        </span>
        <div className="grid grid-cols-2 gap-2">
          {DEBT_TYPE_VALUES.map((t) => (
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
              {DEBT_TYPE_DISPLAY[t] ?? t}
            </button>
          ))}
        </div>
        {errors.type && <p className="mt-1 text-xs text-negative">{errors.type[0]}</p>}
      </div>

      {/* Current Balance */}
      <AmountField
        label="Saldo actual"
        id="debt-balance"
        value={currentBalance}
        onChange={setCurrentBalance}
        error={errors.currentBalance}
      />

      {/* Annual Rate */}
      <FormField label="Tasa anual" htmlFor="debt-rate" error={errors.annualRate}>
        <div className="relative">
          <input
            id="debt-rate"
            type="text"
            inputMode="decimal"
            value={annualRate}
            onChange={(e) => setAnnualRate(e.target.value)}
            placeholder="45.00"
            className={cn(
              inputClass,
              'pr-8',
              errors.annualRate ? 'border-negative' : 'border-border',
            )}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">
            %
          </span>
        </div>
      </FormField>

      {/* Type-specific fields */}
      {isCreditCard ? (
        <>
          <AmountField
            label="Limite de credito"
            id="debt-credit-limit"
            value={creditLimit}
            onChange={setCreditLimit}
            error={errors.creditLimit}
          />
          <AmountField
            label="Pago minimo"
            id="debt-min-payment"
            value={minimumPayment}
            onChange={setMinimumPayment}
            error={errors.minimumPayment}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Dia de corte" htmlFor="debt-cutoff" error={errors.cutOffDay}>
              <input
                id="debt-cutoff"
                type="number"
                min={1}
                max={31}
                value={cutOffDay}
                onChange={(e) => setCutOffDay(e.target.value)}
                placeholder="15"
                className={cn(inputClass, errors.cutOffDay ? 'border-negative' : 'border-border')}
              />
            </FormField>
            <FormField label="Dia de pago" htmlFor="debt-due" error={errors.paymentDueDay}>
              <input
                id="debt-due"
                type="number"
                min={1}
                max={31}
                value={paymentDueDay}
                onChange={(e) => setPaymentDueDay(e.target.value)}
                placeholder="5"
                className={cn(
                  inputClass,
                  errors.paymentDueDay ? 'border-negative' : 'border-border',
                )}
              />
            </FormField>
          </div>
        </>
      ) : (
        <>
          <AmountField
            label="Monto original"
            id="debt-original"
            value={originalAmount}
            onChange={setOriginalAmount}
            error={errors.originalAmount}
          />
          <AmountField
            label="Mensualidad"
            id="debt-monthly"
            value={monthlyPayment}
            onChange={setMonthlyPayment}
            error={errors.monthlyPayment}
          />
          <FormField
            label="Meses restantes"
            htmlFor="debt-remaining"
            error={errors.remainingMonths}
          >
            <input
              id="debt-remaining"
              type="number"
              min={0}
              value={remainingMonths}
              onChange={(e) => setRemainingMonths(e.target.value)}
              placeholder="36"
              className={cn(
                inputClass,
                errors.remainingMonths ? 'border-negative' : 'border-border',
              )}
            />
          </FormField>
        </>
      )}

      {/* Form-level errors */}
      {errors._form && <p className="text-xs text-negative">{errors._form[0]}</p>}

      {/* Submit */}
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

// --- Shared form primitives ---

const inputClass = [
  'w-full rounded-lg border bg-bg-input px-3 py-2.5 text-sm text-text-primary',
  'placeholder:text-text-muted',
  'transition-colors duration-200',
  'focus:outline-none focus:border-border-focus focus:shadow-[0_0_20px_rgba(34,211,238,0.15)]',
].join(' ')

interface FormFieldProps {
  label: string
  htmlFor: string
  error?: string[]
  children: React.ReactNode
}

function FormField({ label, htmlFor, error, children }: FormFieldProps) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-xs font-medium text-text-secondary tracking-wide uppercase mb-1.5"
      >
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-negative">{error[0]}</p>}
    </div>
  )
}

interface AmountFieldProps {
  label: string
  id: string
  value: string
  onChange: (v: string) => void
  error?: string[]
}

function AmountField({ label, id, value, onChange, error }: AmountFieldProps) {
  return (
    <FormField label={label} htmlFor={id} error={error}>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">
          $
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0.00"
          className={cn(
            inputClass,
            'pl-7 text-right',
            error ? 'border-negative' : 'border-border',
          )}
        />
      </div>
    </FormField>
  )
}
