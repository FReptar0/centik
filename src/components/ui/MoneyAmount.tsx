import { formatMoney, cn } from '@/lib/utils'

export interface MoneyAmountProps {
  /** Centavo string from API (e.g., "15075") */
  value: string
  /** Color direction: income (green), expense (red), neutral (default text) */
  variant?: 'income' | 'expense' | 'neutral'
  /** Additional CSS classes for the container span */
  className?: string
  /** Size variant for the "$" prefix text */
  size?: 'sm' | 'base' | 'lg' | 'xl' | '2xl'
}

const VARIANT_COLOR: Record<NonNullable<MoneyAmountProps['variant']>, string> = {
  income: 'text-positive',
  expense: 'text-negative',
  neutral: 'text-text-primary',
}

/** Maps the main size to one step smaller for the "$" prefix */
const PREFIX_SIZE: Record<NonNullable<MoneyAmountProps['size']>, string> = {
  sm: 'text-xs',
  base: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg',
  '2xl': 'text-xl',
}

export default function MoneyAmount({
  value,
  variant = 'neutral',
  className,
  size = 'base',
}: MoneyAmountProps) {
  const formatted = formatMoney(value)
  // formatMoney returns strings like "$150.75" — "$" is always the first character
  const prefix = formatted.charAt(0)
  const digits = formatted.slice(1)

  return (
    <span
      data-testid="money-wrapper"
      className={cn('font-mono tabular-nums', VARIANT_COLOR[variant], className)}
    >
      <span
        data-testid="money-prefix"
        className={cn('text-text-tertiary', PREFIX_SIZE[size])}
      >
        {prefix}
      </span>
      <span data-testid="money-amount" className="font-mono tabular-nums">
        {digits}
      </span>
    </span>
  )
}
