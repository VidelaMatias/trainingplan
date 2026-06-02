export default function ClientsLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-7 w-24 bg-slate-200 rounded-lg" />
          <div className="h-4 w-36 bg-slate-100 rounded mt-2" />
        </div>
        <div className="h-9 w-32 bg-slate-200 rounded-lg" />
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex justify-between mb-3">
              <div className="h-5 w-36 bg-slate-200 rounded" />
              <div className="h-5 w-16 bg-slate-100 rounded" />
            </div>
            <div className="flex gap-2">
              <div className="h-5 w-20 bg-slate-100 rounded-full" />
              <div className="h-5 w-16 bg-slate-100 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 flex gap-8">
          {['Nombre', 'Email', 'Objetivo', 'Plan', 'Estado', 'Cuota'].map((h) => (
            <div key={h} className="h-4 w-20 bg-slate-200 rounded" />
          ))}
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-5 py-4 flex gap-8 items-center">
              <div className="h-4 w-32 bg-slate-200 rounded" />
              <div className="h-4 w-36 bg-slate-100 rounded" />
              <div className="h-4 w-28 bg-slate-100 rounded" />
              <div className="h-5 w-20 bg-slate-100 rounded-full" />
              <div className="h-5 w-14 bg-slate-100 rounded-full" />
              <div className="h-5 w-16 bg-slate-100 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
