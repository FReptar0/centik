'use client'

import { cn } from '@/lib/utils'

interface TogglePillsProps {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  className?: string
}

/**
 * Single-select pill toggle for binary or multi-option controls.
 * Used for Expense/Income toggles, period selectors, etc.
 * Active pill: chartreuse bg with black text. Inactive: transparent with secondary text.
 */
export default function TogglePills({
  options,
  value,
  onChange,
  className,
}: TogglePillsProps) {
  return (
    <div className={cn('flex gap-1', className)} role="radiogroup">
      {options.map((option) => {
        const isActive = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'px-4 py-2 text-sm rounded-full transition-all duration-200 active:scale-[0.98] min-h-[40px]',
              isActive
                ? 'bg-accent text-black font-semibold'
                : 'bg-transparent text-text-secondary',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
