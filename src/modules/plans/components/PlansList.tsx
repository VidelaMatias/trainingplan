'use client'

import { Pagination, usePagination } from '@/components/ui/pagination'
import { PlanCard } from '@/modules/plans/components/PlanCard'
import type { PlanListItem } from '@/modules/plans/queries'

interface PlansListProps {
  plans: PlanListItem[]
  clientId: string
  clientRhythmNotes?: string | null
  whatsappUrl?: string | null
}

// Los planes se acumulan semana a semana: la ficha muestra una página por vez
// para que el historial viejo no entierre el plan en curso.
export function PlansList({ plans, clientId, clientRhythmNotes, whatsappUrl }: PlansListProps) {
  const { page, pageCount, pageItems, total, from, to, setPage } = usePagination(plans)

  return (
    <div>
      <div className="space-y-3">
        {pageItems.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            clientId={clientId}
            clientRhythmNotes={clientRhythmNotes}
            whatsappUrl={whatsappUrl}
          />
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
      />
    </div>
  )
}
