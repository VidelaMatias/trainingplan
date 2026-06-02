import { createClient } from '@/lib/supabase/server'
import { getClients, getAllPayments } from '@/app/dashboard/clients/actions'
import { getPlanStatus } from '@/types/training-plan'
import { getOwedMonths } from '@/lib/payments'
import Link from 'next/link'
import PaymentToggle from '@/components/clients/PaymentToggle'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [clients, payments, { data: plans }] = await Promise.all([
    getClients(),
    getAllPayments(),
    supabase
      .from('training_plans')
      .select('id, alumno_id, start_date, end_date, title, active, alumnos(first_name, last_name)')
      .order('start_date', { ascending: false }),
  ])

  const activePlans = (plans ?? []).filter((p) => getPlanStatus(p as any) === 'active')
  const expiringThisWeek = activePlans.filter((p) => {
    const diff = new Date(p.end_date).getTime() - Date.now()
    return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000
  })

  const activeClients = clients.filter((c) => c.active)

  const debtors = activeClients
    .map((c) => ({ client: c, owed: getOwedMonths(c.created_at, c.id, payments) }))
    .filter(({ owed }) => owed.length > 0)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Panel principal</h1>
        <p className="text-slate-500 mt-1 text-sm">{user?.email}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 font-medium uppercase">Alumnos</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{clients.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 font-medium uppercase">Activos</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{activeClients.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 font-medium uppercase">Planes activos</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{activePlans.length}</p>
        </div>
        <div className={`rounded-xl border p-5 ${expiringThisWeek.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
          <p className="text-xs text-slate-500 font-medium uppercase">Vencen esta semana</p>
          <p className={`text-3xl font-bold mt-1 ${expiringThisWeek.length > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
            {expiringThisWeek.length}
          </p>
        </div>
        <div className={`rounded-xl border p-5 ${debtors.length > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
          <p className="text-xs text-slate-500 font-medium uppercase">Cuotas pendientes</p>
          <p className={`text-3xl font-bold mt-1 ${debtors.length > 0 ? 'text-red-600' : 'text-slate-400'}`}>
            {debtors.length}
          </p>
        </div>
      </div>

      {expiringThisWeek.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Planes que vencen esta semana
          </h2>
          <div className="space-y-2">
            {expiringThisWeek.map((p) => {
              const alumno = (p as any).alumnos
              return (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-amber-900 font-medium">
                    {alumno?.first_name} {alumno?.last_name} — {p.title}
                  </span>
                  <span className="text-amber-700 text-xs">
                    vence {new Date(p.end_date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {debtors.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-red-800 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Cuotas pendientes
          </h2>
          <div className="space-y-3">
            {debtors.map(({ client: c, owed }) => (
              <div key={c.id} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/clients/${c.id}`}
                    className="text-red-900 font-medium text-sm hover:underline"
                  >
                    {c.first_name} {c.last_name}
                  </Link>
                  <p className="text-xs text-red-600 mt-0.5">
                    Debe: {owed.map((m) => m.label).join(', ')}
                  </p>
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
        <Link
          href="/dashboard/clients"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Ver alumnos
        </Link>
        <Link
          href="/dashboard/clients/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium rounded-lg transition text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo alumno
        </Link>
      </div>
    </div>
  )
}
