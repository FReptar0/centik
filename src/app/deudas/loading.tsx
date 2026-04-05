/** Deudas page loading skeleton matching page structure */
export default function DeudasLoading() {
  return (
    <div className="space-y-6">
      {/* Header bar + button placeholder */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-bg-card rounded-lg animate-pulse" />
        <div className="h-10 w-28 bg-bg-card rounded-lg animate-pulse" />
      </div>

      {/* Summary cards: 3-column grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-bg-card rounded-xl animate-pulse" />
        ))}
      </div>

      {/* Debt card skeletons: 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-32 bg-bg-card rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  )
}
