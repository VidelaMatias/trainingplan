import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getClientPlans } from './plans/actions'
import { getAllPayments } from '@/app/dashboard/clients/actions'
import PlanCard from '@/components/plans/PlanCard'
import PaymentToggle from '@/components/clients/PaymentToggle'
import { getPlanStatus } from '@/types/training-plan'
import { getAllMonthsWithStatus } from '@/lib/payments'

interface ClientDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: client, error } = await supabase
    .from('alumnos')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !client) notFound()

  const [plans, allPayments] = await Promise.all([
    getClientPlans(id),
    getAllPayments(),
  ])
  const activePlan = plans.find((p) => getPlanStatus(p) === 'active')
  const monthsWithStatus = getAllMonthsWithStatus(client.created_at, id, allPayments)

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/clients"
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">
                {client.first_name} {client.last_name}
              </h1>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  client.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {client.active ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            {client.email && <p className="text-slate-500 text-sm mt-0.5">{client.email}</p>}
          </div>
        </div>
        <Link
          href={`/dashboard/clients/${id}/edit`}
          className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Editar alumno
        </Link>
      </div>

      {/* Client info */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
        {client.phone && (
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase">Teléfono</p>
            <p className="text-sm text-slate-700 mt-0.5">{client.phone}</p>
          </div>
        )}
        {client.date_of_birth && (
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase">Nacimiento</p>
            <p className="text-sm text-slate-700 mt-0.5">
              {new Date(client.date_of_birth).toLocaleDateString('es-AR')}
            </p>
          </div>
        )}
        {client.goal && (
          <div className="col-span-2 sm:col-span-3">
            <p className="text-xs text-slate-400 font-medium uppercase">Objetivo</p>
            <p className="text-sm text-slate-700 mt-0.5">{client.goal}</p>
          </div>
        )}
        {client.notes && (
          <div className="col-span-2 sm:col-span-3">
            <p className="text-xs text-slate-400 font-medium uppercase">Notas</p>
            <p className="text-sm text-slate-700 mt-0.5">{client.notes}</p>
          </div>
        )}
      </div>

      {/* Payments section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
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
      </div>

      {/* Plans section */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Planes de entrenamiento</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            {plans.length === 0
              ? 'Sin planes aún'
              : `${plans.length} plan${plans.length !== 1 ? 'es' : ''} · ${activePlan ? '1 activo' : 'ninguno activo'}`}
          </p>
        </div>
        <Link
          href={`/dashboard/clients/${id}/plans/new`}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo plan
        </Link>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-slate-500 font-medium">Sin planes de entrenamiento</p>
          <Link
            href={`/dashboard/clients/${id}/plans/new`}
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition text-sm"
          >
            Crear primer plan
          </Link>
        </div>
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
