import { Banknote, Calendar, BookOpen, TrendingUp } from 'lucide-react'
import MoneyAmount from '@/components/ui/MoneyAmount'
import { calculateIncomeSummary } from '@/lib/income'
import type { SerializedIncomeSource } from '@/types'

interface IncomeSummaryCardsProps {
  sources: SerializedIncomeSource[]
}

const SUMMARY_ITEMS = [
  { key: 'quincenal' as const, label: 'Quincenal', Icon: Banknote },
  { key: 'monthly' as const, label: 'Mensual', Icon: Calendar },
  { key: 'semester' as const, label: 'Semestral', Icon: BookOpen },
  { key: 'annual' as const, label: 'Anual', Icon: TrendingUp },
]

export default function IncomeSummaryCards({ sources }: IncomeSummaryCardsProps) {
  const summary = calculateIncomeSummary(sources)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {SUMMARY_ITEMS.map(({ key, label, Icon }) => (
        <div
          key={key}
          className="rounded-lg bg-surface-elevated p-5"
        >
          <div className="flex items-center gap-2 mb-2">
            <Icon size={16} className="text-positive" aria-hidden="true" />
            <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              {label}
            </span>
          </div>
          <MoneyAmount value={summary[key]} variant="income" size="xl" className="text-xl font-bold" />
        </div>
      ))}
    </div>
  )
}
