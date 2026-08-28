// Esqueleto de las cuatro pantallas de formulario (alta y edición de alumno,
// alta y edición de plan). Todas tienen la misma silueta —flecha de volver,
// título con subtítulo, tarjeta con campos y botones al pie—, así que comparten
// un solo skeleton en vez de cuatro archivos casi idénticos.
//
// Sin esto, esas rutas caían en el loading.tsx del segmento de arriba y
// mostraban el esqueleto de otra pantalla: al editar un plan aparecía la
// silueta de la ficha del alumno, con su grilla de cuotas y sus tarjetas de
// planes, y después se reemplazaba entera por un formulario.
export function FormPageSkeleton({
  /** Filas de campos antes del bloque ancho. Un plan tiene menos que un alumno. */
  fields = 6,
  /** Bloque alto al final de la tarjeta: la grilla de una semana, un textarea. */
  wideBlock = false,
}: {
  fields?: number
  wideBlock?: boolean
}) {
  return (
    <div className="max-w-3xl animate-pulse">
      <div className="mb-6 flex items-center gap-3">
        <div className="size-8 rounded-lg bg-slate-200" />
        <div>
          <div className="h-7 w-44 rounded-lg bg-slate-200" />
          <div className="mt-1.5 h-4 w-32 rounded bg-slate-100" />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i}>
              <div className="mb-2 h-3 w-24 rounded bg-slate-100" />
              <div className="h-10 rounded-lg bg-slate-100" />
            </div>
          ))}
        </div>

        {wideBlock && (
          <div className="mt-6">
            <div className="mb-3 h-4 w-32 rounded bg-slate-200" />
            <div className="h-40 rounded-xl bg-slate-100" />
          </div>
        )}

        <div className="mt-8 flex gap-3">
          <div className="h-10 w-28 rounded-lg bg-slate-200" />
          <div className="h-10 w-24 rounded-lg bg-slate-100" />
        </div>
      </div>
    </div>
  )
}
