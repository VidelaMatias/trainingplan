import Link from 'next/link'
import { AlertTriangle, CircleDollarSign, Plus, Users } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/server'
import { todayISO } from '@/lib/date'
import { getCurrentUser } from '@/lib/auth/guards'
import { getClients } from '@/modules/clients/queries'
import { getAllPayments } from '@/modules/payments/queries'
import { buildPaidIndex, getOwedMonths } from '@/modules/payments/utils'
import { getPlanStatus, isExpiringWithin } from '@/modules/plans/utils'
import { PaymentToggle } from '@/modules/payments/components/PaymentToggle'
import { PLAN_STATUS } from '@/types/constants'

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
  const expiringThisWeek = activePlans.filter((p) => isExpiringWithin(p.end_date, 7))

  // Indexed once and reused across every client, instead of re-scanning the
  // full payments array per client inside getOwedMonths.
  const paidIndex = buildPaidIndex(payments)
  const activeClients = clients.filter((c) => c.active)
  const debtors = activeClients
    .map((c) => ({ client: c, owed: getOwedMonths(c.created_at, c.id, paidIndex) }))
    .filter(({ owed }) => owed.length > 0)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Panel principal</h1>
        <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:mb-8 md:grid-cols-3 md:gap-4 xl:grid-cols-5">
        <StatTile label="Alumnos" value={clients.length} />
        <StatTile label="Activos" value={activeClients.length} valueClassName="text-green-600" />
        <StatTile label="Planes activos" value={activePlans.length} valueClassName="text-primary" />
        <StatTile
          label="Vencen esta semana"
          value={expiringThisWeek.length}
          highlight={expiringThisWeek.length > 0 ? 'amber' : undefined}
        />
        <StatTile
          label="Cuotas pendientes"
          value={debtors.length}
          highlight={debtors.length > 0 ? 'red' : undefined}
        />
      </div>

      {expiringThisWeek.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-800">
            <AlertTriangle className="size-4" />
            Planes que vencen esta semana
          </h2>
          <div className="space-y-2">
            {expiringThisWeek.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="font-medium text-amber-900">
                  {p.alumnos?.first_name} {p.alumnos?.last_name} — {p.title}
                </span>
                <span className="text-xs text-amber-700">
                  vence{' '}
                  {new Date(p.end_date + 'T12:00:00').toLocaleDateString('es-AR', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {debtors.length > 0 && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-red-800">
            <CircleDollarSign className="size-4" />
            Cuotas pendientes
          </h2>
          <div className="space-y-3">
            {debtors.map(({ client: c, owed }) => (
              <div key={c.id} className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/clients/${c.id}`}
                    className="text-sm font-medium text-red-900 hover:underline"
                  >
                    {c.first_name} {c.last_name}
                  </Link>
                  <p className="mt-0.5 text-xs text-red-600">Debe: {owed.map((m) => m.label).join(', ')}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {owed.map(({ year, month, label }) => (
                    <PaymentToggle
                      key={`${year}-${month}`}
                      alumnoId={c.id}
                      year={year}
                      month={month}
                      paid={false}
                      monthLabel={label}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

function StatTile({
  label,
  value,
  valueClassName,
  highlight,
}: {
  label: string
  value: number
  valueClassName?: string
  highlight?: 'amber' | 'red'
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-5',
        highlight === 'amber' && 'border-amber-200 bg-amber-50',
        highlight === 'red' && 'border-red-200 bg-red-50',
        !highlight && 'border-border bg-card',
      )}
    >
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1 text-3xl font-bold text-slate-900',
          valueClassName,
          highlight === 'amber' && 'text-amber-600',
          highlight === 'red' && 'text-destructive',
        )}
      >
        {value}
      </p>
    </div>
  )
}
