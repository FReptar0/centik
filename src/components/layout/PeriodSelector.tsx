'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import StatusDot from '@/components/ui/StatusDot'
import { MONTH_NAMES_ES } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface PeriodSelectorProps {
  /** Whether the current period is closed (shows lock icon). Defaults to false. */
  isClosed?: boolean
}

/** Month/year navigator with URL search params for period-aware pages */
export default function PeriodSelector({ isClosed = false }: PeriodSelectorProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const month = Number(searchParams.get('month')) || currentMonth
  const year = Number(searchParams.get('year')) || currentYear

  const isCurrentPeriod = month === currentMonth && year === currentYear

  function navigate(newMonth: number, newYear: number) {
    router.push(`${pathname}?month=${newMonth}&year=${newYear}`)
  }

  function handlePrev() {
    if (month === 1) {
      navigate(12, year - 1)
    } else {
      navigate(month - 1, year)
    }
  }

  function handleNext() {
    if (isCurrentPeriod) return
    if (month === 12) {
      navigate(1, year + 1)
    } else {
      navigate(month + 1, year)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={handlePrev}
        aria-label="Mes anterior"
        className={cn(
          'p-1.5 rounded-md min-w-[44px] min-h-[44px] flex items-center justify-center',
          'text-text-secondary hover:text-text-primary',
          'hover:bg-surface-hover',
          'transition-colors duration-200',
        )}
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>

      <span className="text-sm font-medium text-text-secondary flex items-center gap-1.5">
        {isClosed && (
          <Lock size={14} data-testid="period-lock-icon" className="text-info" aria-hidden="true" />
        )}
        {MONTH_NAMES_ES[month - 1]} {year}
        {isCurrentPeriod && <StatusDot />}
      </span>

      <button
        type="button"
        onClick={handleNext}
        disabled={isCurrentPeriod}
        aria-label="Mes siguiente"
        className={cn(
          'p-1.5 rounded-md min-w-[44px] min-h-[44px] flex items-center justify-center',
          'text-text-secondary hover:text-text-primary',
          'hover:bg-surface-hover',
          'transition-colors duration-200',
          isCurrentPeriod &&
            'opacity-30 cursor-not-allowed hover:bg-transparent hover:text-text-secondary',
        )}
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </div>
  )
}
