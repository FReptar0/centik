/** Ingresos page loading skeleton matching page layout structure */
export default function IngresosLoading() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-bg-card rounded-lg animate-pulse" />
        <div className="h-10 w-28 bg-bg-card rounded-lg animate-pulse" />
      </div>

      {/* Summary cards skeleton (2x2 mobile, 4-col desktop) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-bg-card p-5 animate-pulse"
          >
            <div className="h-3 w-16 bg-bg-elevated rounded mb-3" />
            <div className="h-6 w-24 bg-bg-elevated rounded" />
          </div>
        ))}
      </div>

      {/* Income source cards skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-bg-card p-5 animate-pulse"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-5 w-32 bg-bg-elevated rounded" />
              <div className="h-5 w-16 bg-bg-elevated rounded" />
            </div>
            <div className="h-7 w-28 bg-bg-elevated rounded mb-2" />
            <div className="h-4 w-36 bg-bg-elevated rounded mb-4" />
            <div className="flex items-center justify-between">
              <div className="h-5 w-20 bg-bg-elevated rounded" />
              <div className="flex gap-2">
                <div className="h-8 w-8 bg-bg-elevated rounded-md" />
                <div className="h-8 w-8 bg-bg-elevated rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
