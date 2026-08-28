export default function AccountLoading() {
  return (
    <div className="max-w-2xl animate-pulse">
      <div className="mb-6">
        <div className="h-7 w-36 rounded-lg bg-slate-200" />
        <div className="mt-1.5 h-4 w-40 rounded bg-slate-100" />
      </div>

      {/* Email y Cambiar contraseña: dos tarjetas con cabecera separada. */}
      {[1, 3].map((rows, i) => (
        <div key={i} className="mb-6 rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <div className="h-5 w-40 rounded bg-slate-200" />
          </div>
          <div className="space-y-4 px-5 py-4">
            {Array.from({ length: rows }).map((_, j) => (
              <div key={j} className="h-10 rounded-lg bg-slate-100" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
