'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ChevronDown, X, Check } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import DynamicIcon from '@/components/ui/DynamicIcon'
import TogglePills from '@/components/ui/TogglePills'
import FloatingInput from '@/components/ui/FloatingInput'
import Numpad from '@/components/transactions/Numpad'
import { cn, toCents } from '@/lib/utils'
import { createTransactionSchema } from '@/lib/validators'
import { createTransaction, updateTransaction } from '@/app/movimientos/actions'
import { PAYMENT_METHODS_DISPLAY } from '@/lib/constants'
import { TransactionType } from '@/types'
import type { Category, SerializedIncomeSource, SerializedTransaction } from '@/types'

/** Format a numeric string with commas for display */
function formatAmountDisplay(value: string): string {
  if (!value) return ''
  const parts = value.split('.')
  const integerPart = parts[0]
  const num = parseFloat(integerPart)
  if (isNaN(num)) return value
  const formatted = num.toLocaleString('es-MX')
  if (parts.length > 1) {
    return `${formatted}.${parts[1]}`
  }
  return formatted
}

interface TransactionFormProps {
  isOpen: boolean
  onClose: () => void
  categories: Category[]
  incomeSources: SerializedIncomeSource[]
  transaction?: SerializedTransaction | null
}

/**
 * Transaction bottom sheet with dot-matrix hero amount, TogglePills,
 * circular category grid, custom Numpad, and FloatingInput optional fields.
 * Uses key-based remount to reset state when switching between new/edit.
 */
export default function TransactionForm({
  isOpen,
  onClose,
  categories,
  incomeSources,
  transaction,
}: TransactionFormProps) {
  return isOpen ? (
    <TransactionFormContent
      key={transaction?.id ?? 'new'}
      isOpen={isOpen}
      categories={categories}
      incomeSources={incomeSources}
      transaction={transaction}
      onClose={onClose}
    />
  ) : null
}

interface FormContentProps {
  isOpen: boolean
  categories: Category[]
  incomeSources: SerializedIncomeSource[]
  transaction?: SerializedTransaction | null
  onClose: () => void
}

/** Inner form component that owns Modal and all state */
function TransactionFormContent({
  isOpen,
  categories,
  incomeSources,
  transaction,
  onClose,
}: FormContentProps) {
  const isEditing = !!transaction

  const [type, setType] = useState<string>(
    transaction?.type ?? TransactionType.EXPENSE,
  )
  const rawAmountInit = transaction
    ? (Number(transaction.amount) / 100).toString()
    : ''
  const [amount, setAmount] = useState(rawAmountInit)
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
  const [submitting, setSubmitting] = useState(false)
  const [showCheckmark, setShowCheckmark] = useState(false)

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

  async function handleSave() {
    if (submitting) return
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

    const validation = createTransactionSchema.safeParse(payload)
    if (!validation.success) {
      const fieldErrors: Record<string, string[]> = {}
      for (const issue of validation.error.issues) {
        const key = String(issue.path[0] ?? '_form')
        if (!fieldErrors[key]) fieldErrors[key] = []
        fieldErrors[key].push(issue.message)
      }
      setErrors(fieldErrors)
      setSubmitting(false)
      const messages = Object.values(fieldErrors).flat()
      toast.error(messages[0] ?? 'Error al guardar', { duration: 5000 })
      return
    }

    const result = isEditing
      ? await updateTransaction(transaction.id, payload)
      : await createTransaction(payload)

    setSubmitting(false)

    if ('success' in result) {
      setShowCheckmark(true)
      setTimeout(() => {
        onClose()
        toast.success(
          isEditing ? 'Movimiento actualizado' : 'Movimiento registrado',
        )
      }, 200)
    } else {
      setErrors(result.error)
      const messages = Object.values(result.error).flat()
      toast.error(messages[0] ?? 'Error al guardar', { duration: 5000 })
    }
  }

  const headerContent = (
    <div className="flex items-center justify-between px-7 pb-2">
      <button
        type="button"
        onClick={onClose}
        className="rounded-full p-2 text-text-tertiary hover:text-text-primary transition-colors duration-200"
        aria-label="Cerrar"
      >
        <X size={20} />
      </button>
      <span className="text-sm font-medium text-text-primary">
        {isEditing ? 'Editar movimiento' : 'Nueva transaccion'}
      </span>
      <button
        type="button"
        onClick={handleSave}
        disabled={submitting}
        className="text-xs font-semibold uppercase tracking-[2px] text-accent hover:text-accent-hover transition-colors duration-200 disabled:opacity-50"
        aria-label="Guardar"
      >
        {showCheckmark ? <Check size={20} className="text-accent" /> : 'GUARDAR'}
      </button>
    </div>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} headerContent={headerContent}>
      <div className="space-y-4">
        {/* Section 1: Hero Amount Zone with dot-matrix texture */}
        <div className="dot-matrix-hero bg-surface-elevated rounded-2xl p-6">
          <div className="relative z-[2] text-center">
            <span className="font-mono text-xl text-text-tertiary mr-0.5">$</span>
            <span className="font-mono text-4xl font-semibold text-text-primary tabular-nums">
              {formatAmountDisplay(amount) || '0.00'}
            </span>
          </div>
        </div>

        {/* Section 2: Type Toggle (TogglePills) */}
        <TogglePills
          options={[
            { value: 'EXPENSE', label: 'Gasto' },
            { value: 'INCOME', label: 'Ingreso' },
          ]}
          value={type}
          onChange={handleTypeChange}
          className="justify-center"
        />

        {/* Section 3: Category Grid */}
        <div>
          <div className="grid grid-cols-4 gap-3">
            {filteredCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(cat.id)}
                className="flex flex-col items-center gap-1.5"
                aria-label={cat.name}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200',
                    categoryId === cat.id ? 'ring-2 ring-accent' : '',
                  )}
                  style={{ backgroundColor: `${cat.color}1F` }}
                >
                  <DynamicIcon
                    name={cat.icon}
                    size={20}
                    style={{ color: cat.color }}
                  />
                </div>
                <span className="text-[11px] text-center text-text-secondary truncate w-full">
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
          {errors.categoryId && (
            <p className="mt-1 text-xs text-negative">{errors.categoryId[0]}</p>
          )}
        </div>

        {/* Section 4: Numpad */}
        <div>
          <Numpad value={amount} onChange={setAmount} />
        </div>

        {/* Section 5: Optional Fields (collapsible) */}
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
          <div className="space-y-6">
            {/* Description */}
            <FloatingInput
              label="Descripcion"
              value={description}
              onChange={setDescription}
              optional
            />

            {/* Date */}
            <FloatingInput
              type="date"
              label="Fecha"
              value={date}
              onChange={setDate}
            />

            {/* Payment method -- only for expenses */}
            {type === TransactionType.EXPENSE && (
              <div>
                <span className="block text-[11px] uppercase tracking-[2px] text-text-secondary mb-2">
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
                        'rounded-full border px-3 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.98]',
                        paymentMethod === key
                          ? 'bg-accent/15 text-accent border-accent'
                          : 'bg-transparent text-text-secondary border-border-divider',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="relative">
              <label
                htmlFor="txn-notes"
                className="block text-[11px] uppercase tracking-[2px] text-text-secondary mb-1"
              >
                Notas (opcional)
              </label>
              <textarea
                id="txn-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-transparent border-0 border-b border-border-divider py-2 text-sm text-text-primary focus:border-accent focus:outline-none transition-colors duration-200 resize-none"
              />
            </div>

            {/* Income source -- only for income type with sources available */}
            {type === TransactionType.INCOME && incomeSources.length > 0 && (
              <div>
                <label
                  htmlFor="txn-income-source"
                  className="block text-[11px] uppercase tracking-[2px] text-text-secondary mb-1"
                >
                  Fuente de ingreso (opcional)
                </label>
                <select
                  id="txn-income-source"
                  value={incomeSourceId}
                  onChange={(e) => setIncomeSourceId(e.target.value)}
                  className="w-full bg-transparent border-0 border-b border-border-divider py-2 text-sm text-text-primary focus:border-accent focus:outline-none transition-colors duration-200"
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

        {/* Amount error */}
        {errors.amount && (
          <p className="text-xs text-negative">{errors.amount[0]}</p>
        )}

        {/* Form-level errors */}
        {errors._form && (
          <p className="text-xs text-negative">{errors._form[0]}</p>
        )}
      </div>
    </Modal>
  )
}
