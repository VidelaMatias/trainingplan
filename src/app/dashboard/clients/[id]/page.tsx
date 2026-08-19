import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays, ChevronLeft, CircleDollarSign, Pencil, Plus } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getClientById } from '@/modules/clients/queries'
import { getClientPlans } from '@/modules/plans/queries'
import { getPlanStatus } from '@/modules/plans/utils'
import { getPaymentsForClient } from '@/modules/payments/queries'
import { buildPaidIndex, getAllMonthsWithStatus } from '@/modules/payments/utils'
import { PaymentToggle } from '@/modules/payments/components/PaymentToggle'
import { PlanCard } from '@/modules/plans/components/PlanCard'
import { PLAN_STATUS } from '@/types/constants'

interface ClientDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = await params

  // All three reads are independent — awaiting the client first cost an extra
  // round trip of pure dead time on every visit.
  const [client, plans, payments] = await Promise.all([
    getClientById(id),
    getClientPlans(id),
    getPaymentsForClient(id),
  ])
  if (!client) notFound()

  const activePlan = plans.find((p) => getPlanStatus(p) === PLAN_STATUS.ACTIVE)
  const monthsWithStatus = getAllMonthsWithStatus(client.created_at, id, buildPaidIndex(payments))

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/clients"
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-secondary-foreground"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">
                {client.first_name} {client.last_name}
              </h1>
              <Badge variant={client.active ? 'success' : 'neutral'}>
                {client.active ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
            {client.email && <p className="mt-0.5 text-sm text-muted-foreground">{client.email}</p>}
          </div>
        </div>
        <Link
          href={`/dashboard/clients/${id}/edit`}
          className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}
        >
          <Pencil />
          Editar alumno
        </Link>
      </div>

      <Card className="mb-6 grid grid-cols-2 gap-4 p-5 sm:grid-cols-3">
        {client.phone && (
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Teléfono</p>
            <p className="mt-0.5 text-sm text-secondary-foreground">{client.phone}</p>
          </div>
        )}
        {client.date_of_birth && (
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Nacimiento</p>
            <p className="mt-0.5 text-sm text-secondary-foreground">
              {new Date(client.date_of_birth).toLocaleDateString('es-AR')}
            </p>
          </div>
        )}
        {client.goal && (
          <div className="col-span-2 sm:col-span-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">Objetivo</p>
            <p className="mt-0.5 text-sm text-secondary-foreground">{client.goal}</p>
          </div>
        )}
        {client.notes && (
          <div className="col-span-2 sm:col-span-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">Notas</p>
            <p className="mt-0.5 text-sm text-secondary-foreground">{client.notes}</p>
          </div>
        )}
      </Card>

      <Card className="mb-6 p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-secondary-foreground">
          <CircleDollarSign className="size-4 text-muted-foreground" />
          Historial de cuotas
        </h2>
        <div className="flex flex-wrap gap-2">
          {monthsWithStatus.map(({ year, month, label, paid }) => (
            <PaymentToggle
              key={`${year}-${month}`}
              alumnoId={id}
              year={year}
              month={month}
              paid={paid}
              monthLabel={label}
            />
          ))}
        </div>
      </Card>

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Planes de entrenamiento</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {plans.length === 0
              ? 'Sin planes aún'
              : `${plans.length} plan${plans.length !== 1 ? 'es' : ''} · ${activePlan ? '1 activo' : 'ninguno activo'}`}
          </p>
        </div>
        <Link href={`/dashboard/clients/${id}/plans/new`} className={cn(buttonVariants())}>
          <Plus />
          Nuevo plan
        </Link>
      </div>

      {plans.length === 0 ? (
        <Card className="py-16 text-center">
          <CalendarDays className="mx-auto mb-3 size-10 text-slate-300" />
          <p className="font-medium text-muted-foreground">Sin planes de entrenamiento</p>
          <Link href={`/dashboard/clients/${id}/plans/new`} className={cn(buttonVariants({ size: 'sm' }), 'mt-4')}>
            Crear primer plan
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} clientId={id} clientRhythmNotes={client.rhythm_notes} />
          ))}
        </div>
      )}
    </div>
  )
}
