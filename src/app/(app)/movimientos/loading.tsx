/** Movimientos page loading skeleton with header, filter chips, and transaction rows */
export default function MovimientosLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-surface-elevated rounded-lg animate-pulse" />
          <div className="h-10 w-28 bg-surface-elevated rounded-lg animate-pulse" />
        </div>
        <div className="h-5 w-32 bg-surface-elevated rounded-lg animate-pulse" />
      </div>

      {/* Filter chips skeleton */}
      <div className="flex gap-2 overflow-hidden pb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-9 rounded-lg bg-surface-elevated animate-pulse shrink-0"
            style={{ width: `${60 + i * 12}px` }}
          />
        ))}
      </div>

      {/* Transaction row skeletons */}
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-16 bg-surface-elevated rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  )
}
