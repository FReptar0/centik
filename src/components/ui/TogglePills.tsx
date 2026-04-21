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
export default function TogglePills({ options, value, onChange, className }: TogglePillsProps) {
  function handleKeyDown(event: React.KeyboardEvent, currentIndex: number) {
    let nextIndex: number | null = null

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      nextIndex = (currentIndex + 1) % options.length
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      nextIndex = (currentIndex - 1 + options.length) % options.length
    }

    if (nextIndex !== null) {
      onChange(options[nextIndex].value)
      // Focus the next button after render
      const container = (event.target as HTMLElement).parentElement
      setTimeout(() => {
        const buttons = container?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
        buttons?.[nextIndex as number]?.focus()
      }, 0)
    }
  }

  return (
    <div className={cn('flex gap-1', className)} role="radiogroup">
      {options.map((option, index) => {
        const isActive = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
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
