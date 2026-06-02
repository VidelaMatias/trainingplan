import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getClients, getAllPayments } from './actions'
import ClientActions from '@/components/clients/ClientActions'
import PaymentToggle from '@/components/clients/PaymentToggle'
import { getPlanStatus, TrainingPlan } from '@/types/training-plan'
import { getOwedMonths } from '@/lib/payments'

async function getClientsWithPlans() {
  const supabase = await createClient()

  const [clients, { data: plans }] = await Promise.all([
    getClients(),
    supabase
      .from('training_plans')
      .select('id, alumno_id, start_date, end_date, title, active, created_at, created_by, notes')
      .order('start_date', { ascending: false }),
  ])

  const plansByClient = new Map<string, TrainingPlan[]>()
  for (const plan of plans ?? []) {
    const arr = plansByClient.get(plan.alumno_id as string) ?? []
    arr.push(plan as unknown as TrainingPlan)
    plansByClient.set(plan.alumno_id as string, arr)
  }

  return clients.map((c) => ({
    ...c,
    plans: plansByClient.get(c.id) ?? [],
  }))
}

const PLAN_BADGE: Record<string, { label: string; className: string }> = {
  active: { label: 'Plan activo', className: 'bg-blue-100 text-blue-700' },
  upcoming: { label: 'Plan próximo', className: 'bg-amber-100 text-amber-700' },
  expired: { label: 'Plan vencido', className: 'bg-red-100 text-red-600' },
  none: { label: 'Sin plan', className: 'bg-slate-100 text-slate-400' },
}

export default async function ClientsPage() {
  const [clients, payments] = await Promise.all([
    getClientsWithPlans(),
    getAllPayments(),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Alumnos</h1>
          <p className="text-slate-500 text-sm mt-0.5">{clients.length} alumnos registrados</p>
        </div>
        <Link
          href="/dashboard/clients/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo alumno
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
          <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-slate-500 font-medium">No hay alumnos aún</p>
          <p className="text-slate-400 text-sm mt-1">Creá tu primer alumno para comenzar</p>
          <Link
            href="/dashboard/clients/new"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition text-sm"
          >
            Crear alumno
          </Link>
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="md:hidden space-y-3">
            {clients.map((client) => {
              const currentPlan = client.plans.find((p: TrainingPlan) => getPlanStatus(p) === 'active')
                ?? client.plans.find((p: TrainingPlan) => getPlanStatus(p) === 'upcoming')
                ?? client.plans[0]
              const planKey = currentPlan ? getPlanStatus(currentPlan) : 'none'
              const planBadge = PLAN_BADGE[planKey]
              const owed = getOwedMonths(client.created_at, client.id, payments)

              return (
                <div key={client.id} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <Link
                      href={`/dashboard/clients/${client.id}`}
                      className="font-semibold text-slate-900 hover:text-blue-600 transition leading-tight"
                    >
                      {client.first_name} {client.last_name}
                    </Link>
                    <ClientActions client={client} />
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${planBadge.className}`}>
                      {planBadge.label}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      client.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {client.active ? 'Activo' : 'Inactivo'}
                    </span>
                    {owed.length === 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                        Al día
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-medium">
                        Debe {owed.length} {owed.length === 1 ? 'mes' : 'meses'}
                      </span>
                    )}
                  </div>
                  {owed.length > 0 && (
                    <p className="text-xs text-red-400 mt-1.5">{owed.map((m) => m.label).join(', ')}</p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 font-semibold text-slate-600">Nombre</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600">Email</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600 hidden lg:table-cell">Objetivo</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600">Plan</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600">Estado</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600">Cuota</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.map((client) => {
                  const currentPlan = client.plans.find((p: TrainingPlan) => getPlanStatus(p) === 'active')
                    ?? client.plans.find((p: TrainingPlan) => getPlanStatus(p) === 'upcoming')
                    ?? client.plans[0]
                  const planKey = currentPlan ? getPlanStatus(currentPlan) : 'none'
                  const planBadge = PLAN_BADGE[planKey]
                  const owed = getOwedMonths(client.created_at, client.id, payments)

                  return (
                    <tr key={client.id} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-3.5">
                        <Link href={`/dashboard/clients/${client.id}`} className="font-medium text-slate-900 hover:text-blue-600 transition">
                          {client.first_name} {client.last_name}
                        </Link>
                        {client.date_of_birth && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {new Date(client.date_of_birth).toLocaleDateString('es-AR')}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {client.email ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 hidden lg:table-cell max-w-xs truncate">
                        {client.goal ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${planBadge.className}`}>
                          {planBadge.label}
                        </span>
                        {currentPlan && planKey !== 'none' && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            vence {new Date(currentPlan.end_date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          client.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {client.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {owed.length === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-100 text-green-700 text-xs font-semibold">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            Al día
                          </span>
                        ) : (
                          <div>
                            <span className="text-xs font-semibold text-red-600">
                              Debe {owed.length} {owed.length === 1 ? 'mes' : 'meses'}
                            </span>
                            <p className="text-xs text-red-400 mt-0.5 max-w-40 leading-tight">
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
          </div>
        </>
      )}
    </div>
  )
}
