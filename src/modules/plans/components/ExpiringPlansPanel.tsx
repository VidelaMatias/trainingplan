'use client'

import { AlertTriangle } from 'lucide-react'

import { Pagination, usePagination } from '@/components/ui/pagination'

// Vista plana armada en el servidor: el nombre del alumno ya viene resuelto.
export interface ExpiringPlanRow {
  id: string
  title: string
  end_date: string
  clientName: string
}

export function ExpiringPlansPanel({ plans }: { plans: ExpiringPlanRow[] }) {
  const { page, pageCount, pageItems, total, from, to, setPage } = usePagination(plans)

  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-800">
        <AlertTriangle className="size-4" />
        Planes que vencen esta semana
      </h2>

      {/* Tope de alto sólo en desktop: en mobile la página ya scrollea y anidar
          otro scroll acá adentro sólo estorba. El overflow-x va explícito porque
          con el Y en auto el X deja de ser visible y pasa a auto por su cuenta. */}
      <div className="space-y-2 md:max-h-96 md:overflow-y-auto md:overflow-x-hidden md:pr-1">
        {pageItems.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-amber-900">
              {p.clientName} — {p.title}
            </span>
            <span className="shrink-0 text-xs text-amber-700">vence {fmtExpiry(p.end_date)}</span>
          </div>
        ))}
      </div>

      <Pagination
        page={page}
        pageCount={pageCount}
        total={total}
        from={from}
        to={to}
        onPageChange={setPage}
        label="planes"
        className="border-t border-amber-200 pt-3"
      />
    </div>
  )
}

// Al mediodía local como todas las fechas de la app: el ISO pelado se lee como
// medianoche UTC y en Argentina rendería el día anterior.
function fmtExpiry(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}
