'use client'

import DynamicIcon from '@/components/ui/DynamicIcon'
import MoneyAmount from '@/components/ui/MoneyAmount'
import { cn } from '@/lib/utils'

type SemanticColor = 'positive' | 'negative' | 'accent' | 'warning' | 'info'

export interface KPICardProps {
  label: string
  value: string
  icon: string
  color: SemanticColor
  subtitle?: string
  hero?: boolean
  /** Raw centavo string for monetary KPIs (renders MoneyAmount instead of plain text) */
  rawValue?: string
  /** MoneyAmount variant for monetary KPIs */
  moneyVariant?: 'income' | 'expense' | 'neutral'
}

const textColorMap: Record<SemanticColor, string> = {
  positive: 'text-positive',
  negative: 'text-negative',
  accent: 'text-accent',
  warning: 'text-warning',
  info: 'text-info',
}

const bgColorMap: Record<SemanticColor, string> = {
  positive: 'bg-positive/15',
  negative: 'bg-negative/15',
  accent: 'bg-accent/15',
  warning: 'bg-warning/15',
  info: 'bg-info/15',
}

export default function KPICard({ label, value, icon, color, subtitle, hero, rawValue, moneyVariant }: KPICardProps) {
  return (
    <div className={cn(
      'rounded-lg bg-surface-elevated p-6 transition-all duration-200',
      hero && 'dot-matrix-hero',
    )}>
      <div className="relative z-[2]">
        <div className="mb-3 flex items-center gap-3">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              bgColorMap[color],
            )}
          >
            <DynamicIcon name={icon} size={24} className={textColorMap[color]} />
          </div>
        </div>
        {rawValue ? (
          <MoneyAmount value={rawValue} variant={moneyVariant} size="2xl" className="text-2xl font-bold" />
        ) : (
          <p className={cn('text-2xl font-bold font-mono tabular-nums', textColorMap[color])}>
            {value}
          </p>
        )}
        <p className="mt-1 text-xs font-medium uppercase tracking-widest text-text-secondary">{label}</p>
        {subtitle ? (
          <p className="mt-1 text-[11px] text-text-tertiary">{subtitle}</p>
        ) : null}
      </div>
    </div>
  )
}
