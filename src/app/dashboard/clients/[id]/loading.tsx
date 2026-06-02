export default function ClientDetailLoading() {
  return (
    <div className="max-w-3xl animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-slate-200 rounded-lg" />
          <div>
            <div className="h-7 w-48 bg-slate-200 rounded-lg" />
            <div className="h-4 w-32 bg-slate-100 rounded mt-1" />
          </div>
        </div>
        <div className="h-9 w-28 bg-slate-100 rounded-lg" />
      </div>

      {/* Info card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <div className="h-3 w-16 bg-slate-100 rounded mb-2" />
            <div className="h-4 w-28 bg-slate-200 rounded" />
          </div>
        ))}
      </div>

      {/* Payments */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <div className="h-4 w-36 bg-slate-200 rounded mb-4" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-7 w-16 bg-slate-100 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Plans header */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-44 bg-slate-200 rounded" />
        <div className="h-9 w-28 bg-slate-200 rounded-lg" />
      </div>

      {/* Plan cards */}
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 px-5 py-4">
            <div className="flex justify-between">
              <div>
                <div className="h-5 w-40 bg-slate-200 rounded mb-2" />
                <div className="h-4 w-32 bg-slate-100 rounded" />
              </div>
              <div className="flex gap-1">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-7 w-7 bg-slate-100 rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
