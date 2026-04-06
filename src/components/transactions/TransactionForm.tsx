'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ChevronDown } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import DynamicIcon from '@/components/ui/DynamicIcon'
import { cn, toCents } from '@/lib/utils'
import { createTransactionSchema } from '@/lib/validators'
import { createTransaction, updateTransaction } from '@/app/movimientos/actions'
import { PAYMENT_METHODS_DISPLAY } from '@/lib/constants'
import { TransactionType } from '@/types'
import type { Category, SerializedIncomeSource, SerializedTransaction } from '@/types'

interface TransactionFormProps {
  isOpen: boolean
  onClose: () => void
  categories: Category[]
  incomeSources: SerializedIncomeSource[]
  transaction?: SerializedTransaction | null
}

/**
 * Transaction quick-add form wrapped in a Modal.
 * Uses key-based remount to reset state when switching between new/edit.
 */
export default function TransactionForm({
  isOpen,
  onClose,
  categories,
  incomeSources,
  transaction,
}: TransactionFormProps) {
  const title = transaction ? 'Editar movimiento' : 'Nuevo movimiento'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {isOpen && (
        <TransactionFormContent
          key={transaction?.id ?? 'new'}
          categories={categories}
          incomeSources={incomeSources}
          transaction={transaction}
          onClose={onClose}
        />
      )}
    </Modal>
  )
}

interface FormContentProps {
  categories: Category[]
  incomeSources: SerializedIncomeSource[]
  transaction?: SerializedTransaction | null
  onClose: () => void
}

/** Inner form component that remounts via key when transaction changes */
function TransactionFormContent({
  categories,
  incomeSources,
  transaction,
  onClose,
}: FormContentProps) {
  const isEditing = !!transaction

  const [type, setType] = useState<string>(
    transaction?.type ?? TransactionType.EXPENSE,
  )
  const [amount, setAmount] = useState(
    transaction ? (Number(transaction.amount) / 100).toString() : '',
  )
  const [categoryId, setCategoryId] = useState<string | null>(
    transaction?.categoryId ?? null,
  )
  const [showDetails, setShowDetails] = useState(
    isEditing &&
      !!(transaction.description || transaction.notes || transaction.paymentMethod),
  )
  const [description, setDescription] = useState(transaction?.description ?? '')
  const [paymentMethod, setPaymentMethod] = useState<string | null>(
    transaction?.paymentMethod ?? null,
  )
  const [notes, setNotes] = useState(transaction?.notes ?? '')
  const [date, setDate] = useState(
    transaction
      ? new Date(transaction.date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  )
  const [incomeSourceId, setIncomeSourceId] = useState<string>(
    transaction?.incomeSourceId ?? '',
  )
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)

  function getFormPayload() {
    return {
      type,
      amount: toCents(amount || '0'),
      categoryId: categoryId ?? '',
      date,
      description: description.trim() || undefined,
      paymentMethod: paymentMethod ?? undefined,
      notes: notes.trim() || undefined,
      incomeSourceId: incomeSourceId || undefined,
    }
  }

  function validateField(fieldName: string, data: Record<string, unknown>) {
    const result = createTransactionSchema.safeParse(data)
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

  function handleBlur(fieldName: string) {
    setTouched((prev) => new Set(prev).add(fieldName))
    validateField(fieldName, getFormPayload())
  }

  const filteredCategories = categories.filter((cat) => {
    if (type === TransactionType.EXPENSE) {
      return cat.type === 'EXPENSE' || cat.type === 'BOTH'
    }
    return cat.type === 'INCOME' || cat.type === 'BOTH'
  })

  function handleTypeChange(newType: string) {
    setType(newType)
    setCategoryId(null)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setErrors({})

    const payload = {
      type,
      amount: toCents(amount || '0'),
      categoryId: categoryId ?? '',
      date,
      description: description.trim() || undefined,
      paymentMethod: paymentMethod ?? undefined,
      notes: notes.trim() || undefined,
      incomeSourceId: incomeSourceId || undefined,
    }

    const result = isEditing
      ? await updateTransaction(transaction.id, payload)
      : await createTransaction(payload)

    setSubmitting(false)

    if ('success' in result) {
      toast.success(isEditing ? 'Movimiento actualizado' : 'Movimiento registrado')
      onClose()
    } else {
      setErrors(result.error)
      const messages = Object.values(result.error).flat()
      toast.error(messages[0] ?? 'Error al guardar', { duration: 5000 })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          aria-label="Gasto"
          onClick={() => handleTypeChange(TransactionType.EXPENSE)}
          className={cn(
            'flex-1 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors duration-200',
            type === TransactionType.EXPENSE
              ? 'bg-accent/15 text-accent border-accent'
              : 'bg-bg-input text-text-secondary border-border hover:border-border-light',
          )}
        >
          Gasto
        </button>
        <button
          type="button"
          aria-label="Ingreso"
          onClick={() => handleTypeChange(TransactionType.INCOME)}
          className={cn(
            'flex-1 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors duration-200',
            type === TransactionType.INCOME
              ? 'bg-accent/15 text-accent border-accent'
              : 'bg-bg-input text-text-secondary border-border hover:border-border-light',
          )}
        >
          Ingreso
        </button>
      </div>

      {/* Amount input */}
      <div>
        <label
          htmlFor="txn-amount"
          className="block text-xs font-medium text-text-secondary tracking-wide uppercase mb-1.5"
        >
          Monto
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-2xl font-bold">
            $
          </span>
          <input
            id="txn-amount"
            type="text"
            inputMode="decimal"
            autoFocus
            value={amount}
            onChange={(e) => {
              const v = e.target.value
              setAmount(v)
              if (touched.has('amount')) {
                const payload = { ...getFormPayload(), amount: toCents(v || '0') }
                setTimeout(() => validateField('amount', payload), 0)
              }
            }}
            onBlur={() => handleBlur('amount')}
            placeholder="0.00"
            className={cn(
              'w-full rounded-lg border bg-bg-input pl-10 pr-3 py-3 text-2xl font-bold text-text-primary text-right',
              'placeholder:text-text-muted',
              'transition-colors duration-200',
              'focus:outline-none focus:border-border-focus focus:shadow-[0_0_20px_rgba(34,211,238,0.15)]',
              errors.amount ? 'border-negative' : 'border-border',
            )}
          />
        </div>
        {errors.amount && (
          <p className="mt-1 text-xs text-negative">{errors.amount[0]}</p>
        )}
      </div>

      {/* Category grid */}
      <div>
        <span className="block text-xs font-medium text-text-secondary tracking-wide uppercase mb-1.5">
          Categoria
        </span>
        <div className="grid grid-cols-3 gap-2">
          {filteredCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              aria-label={cat.name}
              onClick={() => setCategoryId(cat.id)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-colors duration-200',
                categoryId === cat.id
                  ? 'ring-2 ring-accent bg-accent/10 border-accent'
                  : 'border-border hover:border-border-light',
              )}
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: `${cat.color}26` }}
              >
                <DynamicIcon name={cat.icon} size={24} style={{ color: cat.color }} />
              </div>
              <span className="text-xs text-center text-text-secondary truncate w-full">
                {cat.name}
              </span>
            </button>
          ))}
        </div>
        {errors.categoryId && (
          <p className="mt-1 text-xs text-negative">{errors.categoryId[0]}</p>
        )}
      </div>

      {/* "Mas detalles" collapsible */}
      <button
        type="button"
        aria-label="Mas detalles"
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors duration-200"
      >
        <span>Mas detalles</span>
        <ChevronDown
          size={16}
          className={cn(
            'transition-transform duration-200',
            showDetails && 'rotate-180',
          )}
        />
      </button>

      {showDetails && (
        <div className="space-y-4">
          {/* Description */}
          <div>
            <label
              htmlFor="txn-description"
              className="block text-xs font-medium text-text-secondary tracking-wide uppercase mb-1.5"
            >
              Descripcion (opcional)
            </label>
            <input
              id="txn-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Almuerzo en restaurante"
              className={cn(
                'w-full rounded-lg border bg-bg-input px-3 py-2.5 text-sm text-text-primary',
                'placeholder:text-text-muted',
                'transition-colors duration-200',
                'focus:outline-none focus:border-border-focus focus:shadow-[0_0_20px_rgba(34,211,238,0.15)]',
                'border-border',
              )}
            />
          </div>

          {/* Payment method -- only for expenses */}
          {type === TransactionType.EXPENSE && (
            <div>
              <span className="block text-xs font-medium text-text-secondary tracking-wide uppercase mb-1.5">
                Metodo de pago (opcional)
              </span>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(PAYMENT_METHODS_DISPLAY).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setPaymentMethod(paymentMethod === key ? null : key)
                    }
                    className={cn(
                      'rounded-lg border px-3 py-2 text-sm font-medium transition-colors duration-200',
                      paymentMethod === key
                        ? 'bg-accent/15 text-accent border-accent'
                        : 'bg-bg-input text-text-secondary border-border hover:border-border-light',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label
              htmlFor="txn-notes"
              className="block text-xs font-medium text-text-secondary tracking-wide uppercase mb-1.5"
            >
              Notas (opcional)
            </label>
            <textarea
              id="txn-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={cn(
                'w-full rounded-lg border bg-bg-input px-3 py-2.5 text-sm text-text-primary',
                'placeholder:text-text-muted resize-none',
                'transition-colors duration-200',
                'focus:outline-none focus:border-border-focus focus:shadow-[0_0_20px_rgba(34,211,238,0.15)]',
                'border-border',
              )}
            />
          </div>

          {/* Date */}
          <div>
            <label
              htmlFor="txn-date"
              className="block text-xs font-medium text-text-secondary tracking-wide uppercase mb-1.5"
            >
              Fecha
            </label>
            <input
              id="txn-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={cn(
                'w-full rounded-lg border bg-bg-input px-3 py-2.5 text-sm text-text-primary',
                'transition-colors duration-200',
                'focus:outline-none focus:border-border-focus focus:shadow-[0_0_20px_rgba(34,211,238,0.15)]',
                'border-border',
              )}
            />
          </div>

          {/* Income source -- only for income type with sources available */}
          {type === TransactionType.INCOME && incomeSources.length > 0 && (
            <div>
              <label
                htmlFor="txn-income-source"
                className="block text-xs font-medium text-text-secondary tracking-wide uppercase mb-1.5"
              >
                Fuente de ingreso (opcional)
              </label>
              <select
                id="txn-income-source"
                value={incomeSourceId}
                onChange={(e) => setIncomeSourceId(e.target.value)}
                className={cn(
                  'w-full rounded-lg border bg-bg-input px-3 py-2.5 text-sm text-text-primary',
                  'transition-colors duration-200',
                  'focus:outline-none focus:border-border-focus focus:shadow-[0_0_20px_rgba(34,211,238,0.15)]',
                  'border-border',
                )}
              >
                <option value="">Sin fuente</option>
                {incomeSources.map((src) => (
                  <option key={src.id} value={src.id}>
                    {src.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Form-level errors */}
      {errors._form && (
        <p className="text-xs text-negative">{errors._form[0]}</p>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={submitting}
        className={cn(
          'w-full rounded-lg bg-accent py-3 text-sm font-semibold text-bg-primary',
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
