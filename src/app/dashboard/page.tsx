import Link from 'next/link'
import { Plus, Users, Wallet } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { StatTile } from '@/components/ui/stat-tile'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/server'
import { todayISO } from '@/lib/date'
import { getCurrentUser } from '@/lib/auth/guards'
import { getClients } from '@/modules/clients/queries'
import { getAllPayments } from '@/modules/payments/queries'
import { buildPaidIndex, getOwedMonths } from '@/modules/payments/utils'
import { getPlanStatus, isExpiringWithin } from '@/modules/plans/utils'
import { DebtorsPanel, type DebtorRow } from '@/modules/payments/components/DebtorsPanel'
import {
  ExpiringPlansPanel,
  type ExpiringPlanRow,
} from '@/modules/plans/components/ExpiringPlansPanel'
import { CLIENT_FILTERS, EXPIRING_SOON_DAYS, PLAN_STATUS } from '@/types/constants'

interface DashboardPlan {
  id: string
  title: string
  start_date: string
  end_date: string
  alumnos: { first_name: string; last_name: string } | null
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const [user, clients, payments, { data: plansData }] = await Promise.all([
    getCurrentUser(),
    getClients(),
    getAllPayments(),
    // Both tiles below describe plans that are still running or still to come,
    // so anything already finished is dropped in the database rather than
    // downloaded and filtered out here — otherwise this grows without bound as
    // the coach accumulates years of history. `alumno_id` and `active` were
    // selected but never read (DashboardPlan does not even declare them).
    supabase
      .from('training_plans')
      .select('id, start_date, end_date, title, alumnos(first_name, last_name)')
      .gte('end_date', todayISO())
      .order('start_date', { ascending: false }),
  ])

  const plans = (plansData ?? []) as unknown as DashboardPlan[]
  const activePlans = plans.filter((p) => getPlanStatus(p) === PLAN_STATUS.ACTIVE)
  const expiringThisWeek = activePlans.filter((p) => isExpiringWithin(p.end_date, EXPIRING_SOON_DAYS))

  // Indexed once and reused across every client, instead of re-scanning the
  // full payments array per client inside getOwedMonths.
  const paidIndex = buildPaidIndex(payments)
  const activeClients = clients.filter((c) => c.active)
  const debtors: DebtorRow[] = activeClients
    .map((c) => ({
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      owed: getOwedMonths(c.created_at, c.id, paidIndex),
    }))
    .filter(({ owed }) => owed.length > 0)

  const expiringRows: ExpiringPlanRow[] = expiringThisWeek.map((p) => ({
    id: p.id,
    title: p.title,
    end_date: p.end_date,
    clientName: `${p.alumnos?.first_name ?? ''} ${p.alumnos?.last_name ?? ''}`.trim(),
  }))

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Panel principal</h1>
        <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:mb-8 md:grid-cols-3 md:gap-4 xl:grid-cols-6">
        {/* Cada tile abre la lista de alumnos ya filtrada por lo que cuenta. */}
        <StatTile label="Alumnos" value={clients.length} href="/dashboard/clients" />
        <StatTile
          label="Activos"
          value={activeClients.length}
          href={`/dashboard/clients?filter=${CLIENT_FILTERS.ACTIVE}`}
          valueClassName="text-green-600"
        />
        <StatTile
          label="Planes activos"
          value={activePlans.length}
          href={`/dashboard/clients?filter=${CLIENT_FILTERS.WITH_ACTIVE_PLAN}`}
          valueClassName="text-primary"
        />
        <StatTile
          label="Vencen esta semana"
          value={expiringThisWeek.length}
          href={`/dashboard/clients?filter=${CLIENT_FILTERS.EXPIRING}`}
          highlight={expiringThisWeek.length > 0 ? 'amber' : undefined}
        />
        <StatTile
          label="Cuotas pendientes"
          value={debtors.length}
          href={`/dashboard/clients?filter=${CLIENT_FILTERS.DEBTORS}`}
          highlight={debtors.length > 0 ? 'red' : undefined}
        />
        {/* getAllPayments ya devuelve sólo las cuotas cobradas, así que el
            total del tile es exactamente el universo que desglosa el reporte:
            los dos números no pueden discrepar. */}
        <StatTile
          label="Métodos de pago"
          value={payments.length}
          href="/dashboard/payments"
          icon={Wallet}
          valueClassName="text-primary"
        />
      </div>

      {expiringRows.length > 0 && <ExpiringPlansPanel plans={expiringRows} />}

      {debtors.length > 0 && <DebtorsPanel debtors={debtors} />}

      <div className="flex gap-3">
        <Link href="/dashboard/clients" className={cn(buttonVariants())}>
          <Users />
          Ver alumnos
        </Link>
        <Link href="/dashboard/clients/new" className={cn(buttonVariants({ variant: 'outline' }))}>
          <Plus />
          Nuevo alumno
        </Link>
      </div>
    </div>
  )
}
