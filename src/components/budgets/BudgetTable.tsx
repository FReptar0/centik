'use client'

import { useState, useCallback } from 'react'
import DynamicIcon from '@/components/ui/DynamicIcon'
import { cn, formatMoney, toCents } from '@/lib/utils'
import type { BudgetWithSpent } from '@/lib/budget-shared'

interface BudgetTableProps {
  budgets: BudgetWithSpent[]
  onSave: (entries: { categoryId: string; quincenalAmount: string }[]) => Promise<void>
  isClosed: boolean
}

/** Converts centavo string to peso display value for input fields */
function centsToPesos(cents: string): string {
  const num = Number(cents)
  if (num === 0) return ''
  return (num / 100).toString()
}

/** Safely calculates a multiplied amount for display, returning "--" on invalid input */
function calculateMultiplied(pesosValue: string, multiplier: number): string {
  if (!pesosValue.trim()) return formatMoney('0')
  try {
    const cents = BigInt(toCents(pesosValue))
    return formatMoney((cents * BigInt(multiplier)).toString())
  } catch {
    return '--'
  }
}

export default function BudgetTable({ budgets, onSave, isClosed }: BudgetTableProps) {
  const [editValues, setEditValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const budget of budgets) {
      initial[budget.categoryId] = centsToPesos(budget.quincenalAmount)
    }
    return initial
  })
  const [isPending, setIsPending] = useState(false)

  const handleChange = useCallback((categoryId: string, value: string) => {
    setEditValues((prev) => ({ ...prev, [categoryId]: value }))
  }, [])

  const handleSave = useCallback(async () => {
    setIsPending(true)
    try {
      const entries = budgets.map((budget) => ({
        categoryId: budget.categoryId,
        quincenalAmount: toCents(editValues[budget.categoryId] || '0'),
      }))
      await onSave(entries)
    } catch {
      // Error handling delegated to parent
    }
    setIsPending(false)
  }, [budgets, editValues, onSave])

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="bg-bg-primary px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-secondary">
                Categoria
              </th>
              <th className="bg-bg-primary px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-text-secondary">
                Quincenal
              </th>
              <th className="bg-bg-primary px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-text-secondary">
                Mensual
              </th>
              <th className="hidden bg-bg-primary px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-text-secondary md:table-cell">
                Semestral
              </th>
              <th className="hidden bg-bg-primary px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-text-secondary md:table-cell">
                Anual
              </th>
            </tr>
          </thead>
          <tbody>
            {budgets.map((budget) => {
              const pesoValue = editValues[budget.categoryId] ?? ''

              return (
                <tr key={budget.categoryId} className="border-b border-border">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${budget.categoryColor}26` }}
                      >
                        <DynamicIcon
                          name={budget.categoryIcon}
                          size={16}
                          style={{ color: budget.categoryColor }}
                          aria-hidden="true"
                        />
                      </div>
                      <span className="text-sm font-medium text-text-primary">
                        {budget.categoryName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end">
                      <span className="mr-1 text-sm text-text-muted">$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={pesoValue}
                        onChange={(e) => handleChange(budget.categoryId, e.target.value)}
                        disabled={isClosed}
                        placeholder="0"
                        className={cn(
                          'w-24 rounded-lg border border-border bg-bg-input px-2 py-1.5 text-right text-sm text-text-primary tabular-nums',
                          'focus:border-border-focus focus:outline-none focus:shadow-[0_0_20px_rgba(34,211,238,0.15)]',
                          'transition-colors duration-200',
                          isClosed && 'cursor-not-allowed opacity-50',
                        )}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm tabular-nums text-text-secondary">
                    {calculateMultiplied(pesoValue, 2)}
                  </td>
                  <td className="hidden px-4 py-3 text-right text-sm tabular-nums text-text-secondary md:table-cell">
                    {calculateMultiplied(pesoValue, 12)}
                  </td>
                  <td className="hidden px-4 py-3 text-right text-sm tabular-nums text-text-secondary md:table-cell">
                    {calculateMultiplied(pesoValue, 24)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {!isClosed && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isPending}
            className={cn(
              'rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg-primary',
              'transition-colors duration-200 hover:bg-accent-hover',
              isPending && 'cursor-not-allowed opacity-50',
            )}
          >
            {isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      )}
    </div>
  )
}
