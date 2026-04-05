'use client'

import DynamicIcon from '@/components/ui/DynamicIcon'
import { cn } from '@/lib/utils'

type SemanticColor = 'positive' | 'negative' | 'accent' | 'warning' | 'info'

export interface KPICardProps {
  label: string
  value: string
  icon: string
  color: SemanticColor
  subtitle?: string
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

export default function KPICard({ label, value, icon, color, subtitle }: KPICardProps) {
  return (
    <div className="rounded-xl border border-border bg-bg-card p-5 transition-all duration-200">
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
      <p className={cn('text-2xl font-bold tabular-nums', textColorMap[color])}>
        {value}
      </p>
      <p className="text-sm font-medium text-text-secondary">{label}</p>
      {subtitle ? (
        <p className="mt-1 text-xs text-text-muted">{subtitle}</p>
      ) : null}
    </div>
  )
}
