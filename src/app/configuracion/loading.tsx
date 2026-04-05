/** Configuracion page loading skeleton */
export default function ConfiguracionLoading() {
  return (
    <div>
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-48 bg-bg-card rounded-lg animate-pulse" />
        <div className="h-10 w-44 bg-bg-card rounded-lg animate-pulse" />
      </div>

      {/* Section heading skeleton */}
      <div className="h-6 w-32 bg-bg-card rounded-lg animate-pulse mb-4" />

      {/* Category row skeletons */}
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-14 bg-bg-card rounded-xl animate-pulse"
          />
        ))}
      </div>
    </div>
  )
}
