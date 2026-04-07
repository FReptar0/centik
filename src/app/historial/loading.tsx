/** Historial page loading skeleton -- mimics pivot table layout */
export default function HistorialLoading() {
  return (
    <div className="space-y-6">
      {/* Title skeleton */}
      <div className="h-8 w-32 bg-surface-elevated rounded-lg animate-pulse" />

      {/* Year selector skeleton */}
      <div className="flex justify-center">
        <div className="h-8 w-36 bg-surface-elevated rounded-lg animate-pulse" />
      </div>

      {/* Table skeleton: header row + 6 data rows */}
      <div className="overflow-hidden rounded-xl border border-border-divider bg-surface-elevated">
        {/* Header row */}
        <div className="flex gap-1 border-b border-border-divider bg-bg p-3">
          <div className="h-4 w-20 bg-border rounded animate-pulse" />
          {Array.from({ length: 13 }).map((_, i) => (
            <div
              key={i}
              className="h-4 w-14 bg-border rounded animate-pulse mx-1"
            />
          ))}
        </div>

        {/* Data rows */}
        {Array.from({ length: 6 }).map((_, row) => (
          <div
            key={row}
            className="flex gap-1 border-b border-border-divider last:border-b-0 p-3"
          >
            <div className="h-4 w-20 bg-border/50 rounded animate-pulse" />
            {Array.from({ length: 13 }).map((_, col) => (
              <div
                key={col}
                className="h-4 w-14 bg-border/30 rounded animate-pulse mx-1"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
