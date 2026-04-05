/** Dashboard loading skeleton with KPI grid and chart placeholders */
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="h-8 w-48 bg-bg-card rounded-lg animate-pulse" />

      {/* KPI grid (6 cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-24 bg-bg-card rounded-xl animate-pulse"
          />
        ))}
      </div>

      {/* Chart placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 bg-bg-card rounded-xl animate-pulse" />
        <div className="h-64 bg-bg-card rounded-xl animate-pulse" />
      </div>
    </div>
  )
}
