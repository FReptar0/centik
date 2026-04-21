import { cn } from '@/lib/utils'

interface StatusDotProps {
  className?: string
}

/**
 * Pulsing status indicator (decorative).
 * Renders a 4px chartreuse circle with animate-status-pulse animation.
 * Animation is auto-disabled via prefers-reduced-motion in globals.css.
 */
export default function StatusDot({ className }: StatusDotProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('h-1 w-1 rounded-full bg-accent animate-status-pulse', className)}
    />
  )
}
