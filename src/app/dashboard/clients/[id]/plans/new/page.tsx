import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PlanForm from '@/components/plans/PlanForm'

interface NewPlanPageProps {
  params: Promise<{ id: string }>
}

export default async function NewPlanPage({ params }: NewPlanPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: client, error } = await supabase
    .from('alumnos')
    .select('first_name, last_name, rhythm_notes')
    .eq('id', id)
    .single()

  if (error || !client) notFound()

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/dashboard/clients/${id}`}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nuevo plan</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {client.first_name} {client.last_name}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <PlanForm clientId={id} clientRhythmNotes={client.rhythm_notes} />
      </div>
    </div>
  )
}
