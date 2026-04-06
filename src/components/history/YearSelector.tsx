'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface YearSelectorProps {
  currentYear: number
  availableYears: number[]
  onYearChange: (year: number) => void
}

/** Year navigation with left/right arrows for the history page */
export default function YearSelector({
  currentYear,
  availableYears,
  onYearChange,
}: YearSelectorProps) {
  const minYear = availableYears.length > 0 ? Math.min(...availableYears) : currentYear
  const maxYear = availableYears.length > 0 ? Math.max(...availableYears) : currentYear

  const isAtMin = currentYear <= minYear
  const isAtMax = currentYear >= maxYear

  function handlePrev() {
    if (!isAtMin) {
      onYearChange(currentYear - 1)
    }
  }

  function handleNext() {
    if (!isAtMax) {
      onYearChange(currentYear + 1)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handlePrev}
        disabled={isAtMin}
        aria-label="Ano anterior"
        className={cn(
          'p-2 rounded-lg',
          'text-accent hover:text-accent-hover',
          'transition-colors duration-200',
          isAtMin && 'opacity-30 cursor-not-allowed hover:text-accent',
        )}
      >
        <ChevronLeft size={20} aria-hidden="true" />
      </button>

      <span className="text-xl font-bold text-text-primary tabular-nums min-w-[4ch] text-center">
        {currentYear}
      </span>

      <button
        type="button"
        onClick={handleNext}
        disabled={isAtMax}
        aria-label="Ano siguiente"
        className={cn(
          'p-2 rounded-lg',
          'text-accent hover:text-accent-hover',
          'transition-colors duration-200',
          isAtMax && 'opacity-30 cursor-not-allowed hover:text-accent',
        )}
      >
        <ChevronRight size={20} aria-hidden="true" />
      </button>
    </div>
  )
}
