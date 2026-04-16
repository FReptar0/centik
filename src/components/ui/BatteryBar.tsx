'use client'

import { cn } from '@/lib/utils'

interface BatteryBarProps {
  /** Percentage value (0-100+). Already calculated by caller. */
  value: number
  /** Max display value for ARIA (default 100) */
  max?: number
  /** Height variant: compact (6px) or detailed (8px) */
  variant?: 'compact' | 'detailed'
  /** Color breakpoints for warning and danger thresholds */
  thresholds?: { warning: number; danger: number }
  /** Accessible label describing what is being measured */
  label?: string
  className?: string
}

const SEGMENT_COUNT = 10

/**
 * Determines the fill color class for a segment based on its position
 * relative to the warning and danger thresholds.
 *
 * Color is determined by the segment's cumulative end position:
 * - End range <= warning threshold: accent (chartreuse)
 * - End range <= danger threshold: warning (orange)
 * - Above danger threshold: negative (red)
 *
 * In overflow (value > danger), all filled segments use negative.
 */
function getSegmentColor(
  segmentIndex: number,
  isOverflow: boolean,
  thresholds: { warning: number; danger: number },
): string {
  if (isOverflow) {
    return 'bg-negative'
  }

  const segmentEndRange = (segmentIndex + 1) * 10

  if (segmentEndRange <= thresholds.warning) {
    return 'bg-accent'
  }

  if (segmentEndRange <= thresholds.danger) {
    return 'bg-warning'
  }

  return 'bg-negative'
}

/**
 * Segmented progress bar (battery-bar style).
 *
 * Replaces all smooth progress bars in the app. Core Glyph Finance visual
 * signature: 10 rectangular segments with traffic-light coloring.
 *
 * - Chartreuse (<warning threshold) -> Orange (warning-danger) -> Red (>danger)
 * - Overflow: all segments red + "+N%" text
 */
export default function BatteryBar({
  value,
  max,
  variant = 'compact',
  thresholds = { warning: 80, danger: 100 },
  label,
  className,
}: BatteryBarProps) {
  const isOverflow = value > thresholds.danger
  const clampedValue = Math.min(value, 100)
  const overflowAmount = isOverflow
    ? Math.round(value - thresholds.danger)
    : 0

  const heightClass = variant === 'detailed' ? 'h-[8px]' : 'h-[6px]'

  return (
    <div
      className={cn('flex items-center gap-1', className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max ?? 100}
      aria-label={label ?? `${Math.round(value)}% progress`}
    >
      <div
        className={cn('flex flex-1 gap-[2px]', heightClass)}
        data-testid="battery-bar"
      >
        {Array.from({ length: SEGMENT_COUNT }, (_, i) => {
          const segmentStart = i * 10
          const segmentEnd = segmentStart + 10
          let fillPercent: number

          if (clampedValue >= segmentEnd) {
            fillPercent = 100
          } else if (clampedValue <= segmentStart) {
            fillPercent = 0
          } else {
            fillPercent = ((clampedValue - segmentStart) / 10) * 100
          }

          const colorClass = getSegmentColor(i, isOverflow, thresholds)

          return (
            <div
              key={i}
              data-testid={`segment-${i}`}
              className="flex-1 bg-accent-subtle"
            >
              <div
                data-testid={`segment-fill-${i}`}
                className={cn('h-full transition-all duration-300', colorClass)}
                style={{ width: `${fillPercent}%` }}
              />
            </div>
          )
        })}
      </div>

      {isOverflow && (
        <span className="ml-1 shrink-0 text-[11px] font-medium text-negative">
          +{overflowAmount}%
        </span>
      )}
    </div>
  )
}
