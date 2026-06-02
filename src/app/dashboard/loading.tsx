export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-8">
        <div className="h-7 w-48 bg-slate-200 rounded-lg" />
        <div className="h-4 w-40 bg-slate-100 rounded mt-2" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4 mb-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="h-3 w-20 bg-slate-100 rounded mb-3" />
            <div className="h-8 w-12 bg-slate-200 rounded" />
          </div>
        ))}
      </div>

      {/* Content block */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <div className="h-4 w-40 bg-slate-200 rounded mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 w-48 bg-slate-100 rounded" />
              <div className="h-4 w-24 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
