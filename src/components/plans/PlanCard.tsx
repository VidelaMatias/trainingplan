'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TrainingPlan, TrainingPlanWeek, DAYS, getPlanStatus } from '@/types/training-plan'
import { deletePlanAction } from '@/app/dashboard/clients/[id]/plans/actions'

interface PlanCardProps {
  plan: TrainingPlan & { training_plan_weeks?: TrainingPlanWeek[] }
  clientId: string
  clientRhythmNotes?: string | null
}

const STATUS_CONFIG = {
  active:   { label: 'Activo',   className: 'bg-green-100 text-green-700' },
  upcoming: { label: 'Próximo',  className: 'bg-blue-100 text-blue-700' },
  expired:  { label: 'Vencido', className: 'bg-slate-100 text-slate-500' },
}

export default function PlanCard({ plan, clientId, clientRhythmNotes }: PlanCardProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [loading, setLoading] = useState(false)

  const status = getPlanStatus(plan)
  const config = STATUS_CONFIG[status]
  const weeks = [...(plan.training_plan_weeks ?? [])].sort((a, b) => a.week_number - b.week_number)

  async function handleDelete() {
    setLoading(true)
    await deletePlanAction(plan.id, clientId)
  }

  function handleExport() {
    window.open(`/api/plans/${plan.id}/export`, '_blank')
  }

  return (
    <div className={`bg-white rounded-xl border ${status === 'active' ? 'border-blue-200' : 'border-slate-200'} overflow-hidden`}>
      {/* Card header */}
      <div className="px-5 py-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-900 truncate">{plan.title}</h3>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
              {config.label}
            </span>
            <span className="text-xs text-slate-400">
              {weeks.length} semana{weeks.length !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {fmtDate(plan.start_date)} — {fmtDate(plan.end_date)}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Expand/collapse */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
            title={expanded ? 'Cerrar' : 'Ver plan'}
          >
            <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Export */}
          <button
            onClick={handleExport}
            className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
            title="Descargar Excel"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>

          {/* Edit */}
          <button
            onClick={() => router.push(`/dashboard/clients/${clientId}/plans/${plan.id}/edit`)}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
            title="Editar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          {/* Delete */}
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Eliminar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button onClick={handleDelete} disabled={loading} className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg transition">
                {loading ? '...' : 'Sí'}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition">
                No
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-slate-100">
          {/* Rhythm notes — from client profile */}
          {clientRhythmNotes && (
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5">Ritmos de referencia</p>
              <div className="space-y-0.5">
                {clientRhythmNotes.split('\n').filter(Boolean).map((line, i) => (
                  <p key={i} className="text-xs text-red-700 italic">{line}</p>
                ))}
              </div>
            </div>
          )}

          {/* Weeks */}
          {weeks.length === 0 ? (
            <p className="px-5 py-4 text-sm text-slate-400 italic">Sin semanas cargadas.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {weeks.map((week) => <WeekView key={week.week_number} week={week} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function WeekView({ week }: { week: TrainingPlanWeek }) {
  const monday = new Date(week.week_start + 'T12:00:00')
  const sunday = new Date(week.week_start + 'T12:00:00')
  sunday.setDate(sunday.getDate() + 6)

  const fmt = (d: Date) => d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })

  return (
    <div>
      <div className="px-5 py-2 bg-slate-800">
        <span className="text-xs font-semibold text-slate-400 uppercase">Semana {week.week_number} </span>
        <span className="text-xs text-slate-300">{fmt(monday)} — {fmt(sunday)}</span>
      </div>
      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 divide-x divide-slate-100 border-b border-slate-100 min-w-140">
          {DAYS.map((day) => (
            <div key={day.key} className="min-h-15">
              <div className="bg-red-600 text-white text-center text-xs font-bold py-1">
                {day.label}
              </div>
              <p className="p-2 text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                {week[day.key] ?? <span className="text-slate-300">—</span>}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}
