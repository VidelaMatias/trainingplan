import Link from 'next/link'
import { Plus, Users } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getClientsWithPlans } from '@/modules/clients/queries'
import { getAllPayments } from '@/modules/payments/queries'
import { buildPaidIndex, getOwedMonths } from '@/modules/payments/utils'
import { getPlanStatus } from '@/modules/plans/utils'
import { ClientsList, type ClientRow } from '@/modules/clients/components/ClientsList'
import { PLAN_STATUS } from '@/types/constants'
import type { PlanSummary } from '@/modules/clients/queries'

// Picks the plan whose badge best represents the client's current state:
// an active plan first, then an upcoming one, otherwise the most recent.
function currentPlanOf(plans: PlanSummary[]): PlanSummary | undefined {
  return (
    plans.find((p) => getPlanStatus(p) === PLAN_STATUS.ACTIVE) ??
    plans.find((p) => getPlanStatus(p) === PLAN_STATUS.UPCOMING) ??
    plans[0]
  )
}

export default async function ClientsPage() {
  const [clients, payments] = await Promise.all([getClientsWithPlans(), getAllPayments()])

  // Everything the list renders is derived once here, on the server: the two
  // layouts (mobile cards, desktop table) show the same values, and searching
  // or re-sorting in the browser must not recompute plan status or fee debt.
  // The paid index is built once instead of re-scanning payments per client.
  const paidIndex = buildPaidIndex(payments)
  const rows: ClientRow[] = clients.map((client) => {
    const current = currentPlanOf(client.plans)
    return {
      id: client.id,
      first_name: client.first_name,
      last_name: client.last_name,
      email: client.email,
      date_of_birth: client.date_of_birth,
      goal: client.goal,
      active: client.active,
      planKey: current ? getPlanStatus(current) : 'none',
      planEndDate: current?.end_date ?? null,
      owedLabels: getOwedMonths(client.created_at, client.id, paidIndex).map((m) => m.label),
    }
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Alumnos</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {clients.length} {clients.length === 1 ? 'alumno registrado' : 'alumnos registrados'}
          </p>
        </div>
        <Link href="/dashboard/clients/new" className={cn(buttonVariants())}>
          <Plus />
          Nuevo alumno
        </Link>
      </div>

      {clients.length === 0 ? (
        <Card className="py-20 text-center">
          <Users className="mx-auto mb-3 size-12 text-slate-300" />
          <p className="font-medium text-muted-foreground">No hay alumnos aún</p>
          <p className="mt-1 text-sm text-muted-foreground">Creá tu primer alumno para comenzar</p>
          <Link href="/dashboard/clients/new" className={cn(buttonVariants({ size: 'sm' }), 'mt-4')}>
            Crear alumno
          </Link>
        </Card>
      ) : (
        <ClientsList rows={rows} />
      )}
    </div>
  )
}
