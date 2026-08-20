import Link from 'next/link'
import { Plus, Users, X } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getClientsWithPlans } from '@/modules/clients/queries'
import { getAllPayments } from '@/modules/payments/queries'
import { buildPaidIndex, getOwedMonths } from '@/modules/payments/utils'
import { getPlanStatus } from '@/modules/plans/utils'
import { matchesClientFilter, parseClientFilter } from '@/modules/clients/utils'
import { ClientsList, type ClientRow } from '@/modules/clients/components/ClientsList'
import { CLIENT_FILTER_META, PLAN_STATUS } from '@/types/constants'
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

// Each tile on the panel links here with ?filter=…; an unknown value is ignored
// rather than yielding an empty list.
interface ClientsPageProps {
  searchParams: Promise<{ filter?: string | string[] }>
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const [{ filter: rawFilter }, clients, payments] = await Promise.all([
    searchParams,
    getClientsWithPlans(),
    getAllPayments(),
  ])
  const filter = parseClientFilter(typeof rawFilter === 'string' ? rawFilter : undefined)
  const filterMeta = filter ? CLIENT_FILTER_META[filter] : null

  // Everything the list renders is derived once here, on the server: the two
  // layouts (mobile cards, desktop table) show the same values, and searching
  // or re-sorting in the browser must not recompute plan status or fee debt.
  // The paid index is built once instead of re-scanning payments per client.
  const paidIndex = buildPaidIndex(payments)
  const rows: ClientRow[] = []
  for (const client of clients) {
    const owed = getOwedMonths(client.created_at, client.id, paidIndex)

    // Filtered against every plan the alumno has, not just the one the row
    // shows — matchesClientFilter is the same rule the panel counts with.
    if (
      filter &&
      !matchesClientFilter(
        { active: client.active, plans: client.plans, owedCount: owed.length },
        filter,
      )
    ) {
      continue
    }

    const current = currentPlanOf(client.plans)
    rows.push({
      id: client.id,
      first_name: client.first_name,
      last_name: client.last_name,
      email: client.email,
      date_of_birth: client.date_of_birth,
      goal: client.goal,
      active: client.active,
      planKey: current ? getPlanStatus(current) : 'none',
      planEndDate: current?.end_date ?? null,
      owedLabels: owed.map((m) => m.label),
    })
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">{filterMeta?.title ?? 'Alumnos'}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {filter
              ? `${rows.length} de ${clients.length} ${clients.length === 1 ? 'alumno' : 'alumnos'}`
              : `${clients.length} ${clients.length === 1 ? 'alumno registrado' : 'alumnos registrados'}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {filter && (
            <Link
              href="/dashboard/clients"
              className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}
            >
              <X />
              Ver todos
            </Link>
          )}
          <Link href="/dashboard/clients/new" className={cn(buttonVariants())}>
            <Plus />
            Nuevo alumno
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card className="py-20 text-center">
          <Users className="mx-auto mb-3 size-12 text-slate-300" />
          <p className="font-medium text-muted-foreground">
            {filterMeta?.empty ?? 'No hay alumnos aún'}
          </p>
          {filter ? (
            <Link
              href="/dashboard/clients"
              className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'mt-4')}
            >
              Ver todos los alumnos
            </Link>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                Creá tu primer alumno para comenzar
              </p>
              <Link
                href="/dashboard/clients/new"
                className={cn(buttonVariants({ size: 'sm' }), 'mt-4')}
              >
                Crear alumno
              </Link>
            </>
          )}
        </Card>
      ) : (
        <ClientsList rows={rows} />
      )}
    </div>
  )
}
