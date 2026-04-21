'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, ChevronDown } from 'lucide-react'
import DynamicIcon from '@/components/ui/DynamicIcon'
import FloatingInput from '@/components/ui/FloatingInput'
import { cn } from '@/lib/utils'
import { PAYMENT_METHODS_DISPLAY } from '@/lib/constants'
import type { Category } from '@/types'

interface TransactionFiltersProps {
  categories: Category[]
  activeFilters: {
    type?: string
    categoryId?: string
    startDate?: string
    endDate?: string
    paymentMethod?: string
  }
  onFilterChange: (filters: Record<string, string | undefined>) => void
}

/** Horizontal scrollable filter chips for transaction list */
export default function TransactionFilters({
  categories,
  activeFilters,
  onFilterChange,
}: TransactionFiltersProps) {
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const categoryRef = useRef<HTMLDivElement>(null)
  const paymentRef = useRef<HTMLDivElement>(null)

  const hasAnyFilter =
    activeFilters.type ||
    activeFilters.categoryId ||
    activeFilters.startDate ||
    activeFilters.endDate ||
    activeFilters.paymentMethod

  const selectedCategory = categories.find((c) => c.id === activeFilters.categoryId)

  const selectedPaymentLabel = activeFilters.paymentMethod
    ? PAYMENT_METHODS_DISPLAY[activeFilters.paymentMethod]
    : null

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
      setCategoryOpen(false)
    }
    if (paymentRef.current && !paymentRef.current.contains(event.target as Node)) {
      setPaymentOpen(false)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [handleClickOutside])

  function toggleType(value: string) {
    onFilterChange({
      ...activeFilters,
      type: activeFilters.type === value ? undefined : value,
    })
  }

  function selectCategory(id: string) {
    onFilterChange({
      ...activeFilters,
      categoryId: activeFilters.categoryId === id ? undefined : id,
    })
    setCategoryOpen(false)
  }

  function clearCategory() {
    onFilterChange({ ...activeFilters, categoryId: undefined })
  }

  function selectPaymentMethod(method: string) {
    onFilterChange({
      ...activeFilters,
      paymentMethod: activeFilters.paymentMethod === method ? undefined : method,
    })
    setPaymentOpen(false)
  }

  function clearPaymentMethod() {
    onFilterChange({ ...activeFilters, paymentMethod: undefined })
  }

  function setDateFilter(key: 'startDate' | 'endDate', value: string) {
    onFilterChange({
      ...activeFilters,
      [key]: value || undefined,
    })
  }

  function clearAllFilters() {
    onFilterChange({
      type: undefined,
      categoryId: undefined,
      startDate: undefined,
      endDate: undefined,
      paymentMethod: undefined,
    })
  }

  const chipBase = cn(
    'flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium',
    'transition-all duration-200 whitespace-nowrap shrink-0 active:scale-[0.98]',
  )

  const chipActive = 'bg-accent/15 text-accent border-accent'
  const chipInactive = 'bg-surface-elevated text-text-secondary border-border-divider'

  return (
    <div className="flex flex-wrap items-center gap-2 pb-2 mb-4">
      {/* Type chips */}
      <button
        type="button"
        onClick={() => toggleType('EXPENSE')}
        className={cn(chipBase, activeFilters.type === 'EXPENSE' ? chipActive : chipInactive)}
      >
        Gastos
      </button>
      <button
        type="button"
        onClick={() => toggleType('INCOME')}
        className={cn(chipBase, activeFilters.type === 'INCOME' ? chipActive : chipInactive)}
      >
        Ingresos
      </button>

      {/* Category dropdown chip */}
      <div className="relative shrink-0" ref={categoryRef}>
        {selectedCategory ? (
          <button type="button" onClick={clearCategory} className={cn(chipBase, chipActive)}>
            <DynamicIcon name={selectedCategory.icon} size={14} />
            {selectedCategory.name}
            <X size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setCategoryOpen(!categoryOpen)
              setPaymentOpen(false)
            }}
            className={cn(chipBase, chipInactive)}
          >
            Categoria
            <ChevronDown size={14} />
          </button>
        )}

        {categoryOpen && (
          <div
            className={cn(
              'absolute top-full left-0 mt-1 z-10',
              'w-56 max-h-64 overflow-y-auto',
              'bg-surface-elevated border border-border-divider rounded-xl p-2',
            )}
          >
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => selectCategory(cat.id)}
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-left',
                  'transition-colors duration-200',
                  'hover:bg-surface-hover',
                  activeFilters.categoryId === cat.id && 'bg-accent/10 text-accent',
                )}
              >
                <DynamicIcon name={cat.icon} size={16} style={{ color: cat.color }} />
                <span className="text-text-primary">{cat.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Date range inputs */}
      <div className="flex items-center gap-1.5">
        <FloatingInput
          type="date"
          label="Desde"
          value={activeFilters.startDate ?? ''}
          onChange={(v) => setDateFilter('startDate', v)}
          className="w-28 sm:w-36"
        />
        <span className="text-text-tertiary text-xs">-</span>
        <FloatingInput
          type="date"
          label="Hasta"
          value={activeFilters.endDate ?? ''}
          onChange={(v) => setDateFilter('endDate', v)}
          className="w-28 sm:w-36"
        />
      </div>

      {/* Payment method dropdown chip */}
      <div className="relative shrink-0" ref={paymentRef}>
        {selectedPaymentLabel ? (
          <button type="button" onClick={clearPaymentMethod} className={cn(chipBase, chipActive)}>
            {selectedPaymentLabel}
            <X size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setPaymentOpen(!paymentOpen)
              setCategoryOpen(false)
            }}
            className={cn(chipBase, chipInactive)}
          >
            Pago
            <ChevronDown size={14} />
          </button>
        )}

        {paymentOpen && (
          <div
            className={cn(
              'absolute top-full left-0 mt-1 z-10',
              'w-48 bg-surface-elevated border border-border-divider rounded-xl p-2',
            )}
          >
            {Object.entries(PAYMENT_METHODS_DISPLAY).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => selectPaymentMethod(key)}
                className={cn(
                  'flex items-center w-full px-3 py-2 rounded-lg text-sm text-left',
                  'transition-colors duration-200',
                  'hover:bg-surface-hover text-text-primary',
                  activeFilters.paymentMethod === key && 'bg-accent/10 text-accent',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Clear all filters */}
      {hasAnyFilter && (
        <button
          type="button"
          onClick={clearAllFilters}
          className="text-xs text-accent hover:text-accent-hover transition-colors duration-200 whitespace-nowrap shrink-0"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  )
}
