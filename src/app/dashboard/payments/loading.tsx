export default function PaymentMethodsLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 flex items-center gap-3">
        <div className="size-8 rounded-lg bg-slate-100" />
        <div>
          <div className="h-7 w-52 rounded-lg bg-slate-200" />
          <div className="mt-2 h-4 w-64 rounded bg-slate-100" />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 h-3 w-24 rounded bg-slate-100" />
            <div className="h-8 w-16 rounded bg-slate-200" />
          </div>
        ))}
      </div>

      {/* Reparto general y desglose mensual */}
      {[3, 8].map((rows, block) => (
        <div key={block} className="mb-6 rounded-xl border border-border bg-card p-5">
          <div className="mb-4 h-4 w-40 rounded bg-slate-200" />
          <div className="space-y-3">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-3 w-20 shrink-0 rounded bg-slate-100" />
                <div className="h-2.5 flex-1 rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
