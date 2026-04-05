import { Lock } from 'lucide-react'

interface PageHeaderProps {
  /** Page title displayed in h1 */
  title: string
  /** Optional PeriodSelector component for period-aware pages */
  periodSelector?: React.ReactNode
  /** Optional primary action button rendered on the right */
  action?: React.ReactNode
  /** Whether to show the closed period banner */
  closedBanner?: boolean
}

/** Reusable page header with title, optional period selector, and optional action slot */
export default function PageHeader({
  title,
  periodSelector,
  action,
  closedBanner,
}: PageHeaderProps) {
  return (
    <header className="mb-6">
      {/* Top row: title + action */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
        {action && <div data-testid="page-header-action">{action}</div>}
      </div>

      {/* Second row: period selector */}
      {periodSelector && (
        <div className="flex items-center gap-3 mt-1">{periodSelector}</div>
      )}

      {/* Closed period banner */}
      {closedBanner && (
        <div className="mt-3 px-4 py-2.5 rounded-lg bg-info/10 border border-info/20 flex items-center gap-2">
          <Lock size={14} className="text-info" aria-hidden="true" />
          <span className="text-sm text-info">
            Periodo cerrado -- solo lectura
          </span>
        </div>
      )}
    </header>
  )
}
