'use client'

import { useState, memo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Spinner from '@/components/ui/Spinner'
import {
  TrainingPlan, TrainingPlanWeek, DAYS, DayKey,
  getNextMonday, addWeeks, emptyWeek,
} from '@/types/training-plan'
import { createPlanAction, updatePlanAction } from '@/app/dashboard/clients/[id]/plans/actions'

interface PlanFormProps {
  clientId: string
  clientRhythmNotes?: string | null
  plan?: TrainingPlan & { training_plan_weeks?: TrainingPlanWeek[] }
}

function buildInitialWeeks(plan?: PlanFormProps['plan']): TrainingPlanWeek[] {
  if (plan?.training_plan_weeks?.length) {
    return [...plan.training_plan_weeks].sort((a, b) => a.week_number - b.week_number)
  }
  return [emptyWeek(getNextMonday(), 1)]
}

export default function PlanForm({ clientId, clientRhythmNotes, plan }: PlanFormProps) {
  const router = useRouter()
  const isEdit = !!plan

  const [title, setTitle] = useState(plan?.title ?? '')
  const [generalNotes, setGeneralNotes] = useState(plan?.notes ?? '')
  const [weeks, setWeeks] = useState<TrainingPlanWeek[]>(buildInitialWeeks(plan))
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const updateDay = useCallback((weekIdx: number, day: DayKey, value: string) => {
    setWeeks((prev) =>
      prev.map((w, i) => (i === weekIdx ? { ...w, [day]: value || null } : w))
    )
  }, [])

  const addWeek = useCallback(() => {
    setWeeks((prev) => {
      const last = prev[prev.length - 1]
      const nextStart = addWeeks(last.week_start, 1)
      return [...prev, emptyWeek(nextStart, prev.length + 1)]
    })
  }, [])

  const removeWeek = useCallback((idx: number) => {
    setWeeks((prev) => {
      if (prev.length === 1) return prev
      return prev
        .filter((_, i) => i !== idx)
        .map((w, i) => ({ ...w, week_number: i + 1 }))
    })
  }, [])

  async function submitAction(formData: FormData) {
    setLoading(true)
    setError(null)
    // title, rhythm_notes, notes come from named inputs automatically
    formData.set('weeks', JSON.stringify(weeks))

    const result = isEdit
      ? await updatePlanAction(plan.id, clientId, formData)
      : await createPlanAction(clientId, formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.push(`/dashboard/clients/${clientId}`)
  }

  return (
    <form action={submitAction} className="space-y-8">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Título del plan <span className="text-red-500">*</span>
        </label>
        <input
          name="title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Semana de fuerza, Preparación maratón..."
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
      </div>

      {/* Rhythm notes — read-only, set on the client profile */}
      {clientRhythmNotes && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Ritmos del alumno</p>
          {clientRhythmNotes.split('\n').filter(Boolean).map((line, i) => (
            <p key={i} className="text-xs text-red-700 italic font-mono leading-relaxed">{line}</p>
          ))}
        </div>
      )}

      {/* Weeks */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700">
            Semanas ({weeks.length})
          </h3>
          <button
            type="button"
            onClick={addWeek}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar semana
          </button>
        </div>

        <div className="space-y-6">
          {weeks.map((week, weekIdx) => (
            <WeekEditor
              key={week.week_start}
              week={week}
              weekIdx={weekIdx}
              canRemove={weeks.length > 1}
              onUpdateDay={updateDay}
              onRemove={removeWeek}
            />
          ))}
        </div>
      </div>

      {/* General notes */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Notas generales</label>
        <textarea
          name="notes"
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
          rows={2}
          placeholder="Observaciones generales del plan..."
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition"
        >
          {loading && <Spinner />}
          {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear plan'}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/dashboard/clients/${clientId}`)}
          className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

interface WeekEditorProps {
  week: TrainingPlanWeek
  weekIdx: number
  canRemove: boolean
  onUpdateDay: (weekIdx: number, day: DayKey, val: string) => void
  onRemove: (weekIdx: number) => void
}

const WeekEditor = memo(function WeekEditor({ week, weekIdx, canRemove, onUpdateDay, onRemove }: WeekEditorProps) {
  const monday = new Date(week.week_start + 'T12:00:00')
  const sunday = new Date(week.week_start + 'T12:00:00')
  sunday.setDate(sunday.getDate() + 6)

  const fmt = (d: Date) =>
    d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Week header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase">
            Semana {weekIdx + 1}
          </span>
          <span className="text-sm font-semibold text-white">
            {fmt(monday)} — {fmt(sunday)}
          </span>
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(weekIdx)}
            className="text-slate-500 hover:text-red-400 transition"
            title="Eliminar semana"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Day grid */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 divide-x divide-slate-100 min-w-140">
          {DAYS.map((day) => (
            <div key={day.key} className="flex flex-col">
              <div className="bg-red-600 text-white text-center text-xs font-bold py-1.5 px-1">
                {day.label}
              </div>
              <textarea
                value={week[day.key] ?? ''}
                onChange={(e) => onUpdateDay(weekIdx, day.key, e.target.value)}
                placeholder="—"
                rows={4}
                className="flex-1 w-full p-2 text-xs text-slate-700 placeholder-slate-300 border-0 border-b border-slate-100 resize-none focus:outline-none focus:bg-blue-50 transition"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})
