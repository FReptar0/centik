/** Presupuesto page loading skeleton */
export default function PresupuestoLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-bg-card rounded-lg animate-pulse" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-16 bg-bg-card rounded-xl animate-pulse"
          />
        ))}
      </div>
    </div>
  )
}
