import Link from 'next/link'
import { Check, Plus, Users } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getClientsWithPlans } from '@/modules/clients/queries'
import { getAllPayments } from '@/modules/payments/queries'
import { getOwedMonths } from '@/modules/payments/utils'
import { getPlanStatus } from '@/modules/plans/utils'
import { ClientActions } from '@/modules/clients/components/ClientActions'
import { PLAN_LIST_BADGE, PLAN_STATUS } from '@/types/constants'
import type { TrainingPlan } from '@/types'

// Picks the plan whose badge best represents the client's current state:
// an active plan first, then an upcoming one, otherwise the most recent.
function currentPlanKey(plans: TrainingPlan[]): keyof typeof PLAN_LIST_BADGE {
  const current =
    plans.find((p) => getPlanStatus(p) === PLAN_STATUS.ACTIVE) ??
    plans.find((p) => getPlanStatus(p) === PLAN_STATUS.UPCOMING) ??
    plans[0]
  return current ? getPlanStatus(current) : 'none'
}

export default async function ClientsPage() {
  const [clients, payments] = await Promise.all([getClientsWithPlans(), getAllPayments()])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Alumnos</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{clients.length} alumnos registrados</p>
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
        <>
          {/* Mobile: card list */}
          <div className="space-y-3 md:hidden">
            {clients.map((client) => {
              const planBadge = PLAN_LIST_BADGE[currentPlanKey(client.plans)]
              const owed = getOwedMonths(client.created_at, client.id, payments)

              return (
                <Card key={client.id} className="p-4">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <Link
                      href={`/dashboard/clients/${client.id}`}
                      className="font-semibold leading-tight text-slate-900 transition hover:text-primary"
                    >
                      {client.first_name} {client.last_name}
                    </Link>
                    <ClientActions client={client} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={planBadge.variant}>{planBadge.label}</Badge>
                    <Badge variant={client.active ? 'success' : 'neutral'}>
                      {client.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                    {owed.length === 0 ? (
                      <Badge variant="success">Al día</Badge>
                    ) : (
                      <Badge variant="danger">
                        Debe {owed.length} {owed.length === 1 ? 'mes' : 'meses'}
                      </Badge>
                    )}
                  </div>
                  {owed.length > 0 && (
                    <p className="mt-1.5 text-xs text-red-400">{owed.map((m) => m.label).join(', ')}</p>
                  )}
                </Card>
              )
            })}
          </div>

          {/* Desktop: table */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-muted">
                  <th className="px-5 py-3 text-left font-semibold text-secondary-foreground">Nombre</th>
                  <th className="px-5 py-3 text-left font-semibold text-secondary-foreground">Email</th>
                  <th className="hidden px-5 py-3 text-left font-semibold text-secondary-foreground lg:table-cell">
                    Objetivo
                  </th>
                  <th className="px-5 py-3 text-left font-semibold text-secondary-foreground">Plan</th>
                  <th className="px-5 py-3 text-left font-semibold text-secondary-foreground">Estado</th>
                  <th className="px-5 py-3 text-left font-semibold text-secondary-foreground">Cuota</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.map((client) => {
                  const planKey = currentPlanKey(client.plans)
                  const planBadge = PLAN_LIST_BADGE[planKey]
                  const owed = getOwedMonths(client.created_at, client.id, payments)
                  const current =
                    client.plans.find((p) => getPlanStatus(p) === PLAN_STATUS.ACTIVE) ??
                    client.plans.find((p) => getPlanStatus(p) === PLAN_STATUS.UPCOMING) ??
                    client.plans[0]

                  return (
                    <tr key={client.id} className="transition hover:bg-muted">
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/dashboard/clients/${client.id}`}
                          className="font-medium text-slate-900 transition hover:text-primary"
                        >
                          {client.first_name} {client.last_name}
                        </Link>
                        {client.date_of_birth && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {new Date(client.date_of_birth).toLocaleDateString('es-AR')}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-secondary-foreground">
                        {client.email ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="hidden max-w-xs truncate px-5 py-3.5 text-secondary-foreground lg:table-cell">
                        {client.goal ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={planBadge.variant}>{planBadge.label}</Badge>
                        {current && planKey !== 'none' && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            vence{' '}
                            {new Date(current.end_date + 'T12:00:00').toLocaleDateString('es-AR', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={client.active ? 'success' : 'neutral'}>
                          {client.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        {owed.length === 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                            <Check className="size-3" />
                            Al día
                          </span>
                        ) : (
                          <div>
                            <span className="text-xs font-semibold text-destructive">
                              Debe {owed.length} {owed.length === 1 ? 'mes' : 'meses'}
                            </span>
                            <p className="mt-0.5 max-w-40 text-xs leading-tight text-red-400">
                              {owed.map((m) => m.label).join(', ')}
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <ClientActions client={client} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  )
}
