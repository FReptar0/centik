'use client'

import { useState, useCallback } from 'react'
import DynamicIcon from '@/components/ui/DynamicIcon'
import FloatingInput from '@/components/ui/FloatingInput'
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

/** Strip commas and non-numeric chars (except one decimal point) */
function cleanAmountInput(value: string): string {
  return value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
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
      <div className="overflow-x-auto overflow-y-visible">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-divider">
              <th
                scope="col"
                className="bg-bg px-4 py-3 text-left text-xs font-medium uppercase tracking-[2px] text-text-secondary"
              >
                Categoria
              </th>
              <th
                scope="col"
                className="bg-bg px-4 py-3 text-right text-xs font-medium uppercase tracking-[2px] text-text-secondary"
              >
                Quincenal
              </th>
              <th
                scope="col"
                className="hidden bg-bg px-4 py-3 text-right text-xs font-medium uppercase tracking-[2px] text-text-secondary xl:table-cell"
              >
                Mensual
              </th>
              <th
                scope="col"
                className="hidden bg-bg px-4 py-3 text-right text-xs font-medium uppercase tracking-[2px] text-text-secondary lg:table-cell"
              >
                Semestral
              </th>
              <th
                scope="col"
                className="hidden bg-bg px-4 py-3 text-right text-xs font-medium uppercase tracking-[2px] text-text-secondary 2xl:table-cell"
              >
                Anual
              </th>
            </tr>
          </thead>
          <tbody>
            {budgets.map((budget) => {
              const pesoValue = editValues[budget.categoryId] ?? ''

              return (
                <tr key={budget.categoryId} className="border-b border-border-divider">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${budget.categoryColor}1F` }}
                      >
                        <DynamicIcon
                          name={budget.categoryIcon}
                          size={18}
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
                    <div className="ml-auto w-28 min-h-[44px] flex items-center">
                      <FloatingInput
                        label=""
                        value={pesoValue}
                        onChange={(v) => handleChange(budget.categoryId, cleanAmountInput(v))}
                        prefix="$"
                        disabled={isClosed}
                      />
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-right text-sm font-mono tabular-nums text-text-secondary whitespace-nowrap xl:table-cell">
                    {calculateMultiplied(pesoValue, 2)}
                  </td>
                  <td className="hidden px-4 py-3 text-right text-sm font-mono tabular-nums text-text-secondary whitespace-nowrap lg:table-cell">
                    {calculateMultiplied(pesoValue, 12)}
                  </td>
                  <td className="hidden px-4 py-3 text-right text-sm font-mono tabular-nums text-text-secondary whitespace-nowrap 2xl:table-cell">
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
              'rounded-full bg-accent px-4 py-2 min-h-[44px] text-sm font-semibold text-black',
              'transition-all duration-200 hover:bg-accent-hover active:scale-[0.98]',
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
