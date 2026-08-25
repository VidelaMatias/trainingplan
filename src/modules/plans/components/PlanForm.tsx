'use client'

import Link from 'next/link'
import { memo, useActionState, useCallback, useMemo, useState } from 'react'
import { AlertCircle, Plus, X } from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import { RhythmNotes } from '@/modules/clients/components/RhythmNotes'
import { DAYS, type DayKey } from '@/types/constants'
import {
  addWeeks,
  clampWeeksToStart,
  emptyWeekContent,
  getMondayOf,
  getNextMonday,
  getWeekDates,
} from '@/modules/plans/utils'
import type { ActionResult, PlanWithWeeks, TrainingPlanWeek, WeekContent } from '@/types'

interface PlanFormProps {
  action: (prev: ActionResult<null>, formData: FormData) => Promise<ActionResult<null>>
  cancelHref: string
  clientRhythmNotes?: string | null
  plan?: PlanWithWeeks
}

const initialState: ActionResult<null> = { data: null, error: null }

// Only the day cells live in state — week numbers and dates are derived from the
// start date, so moving the start date shifts every week without touching them.
function buildInitialContents(plan?: PlanWithWeeks): WeekContent[] {
  if (!plan?.training_plan_weeks?.length) return [emptyWeekContent()]
  return [...plan.training_plan_weeks]
    .sort((a, b) => a.week_number - b.week_number)
    .map(({ monday, tuesday, wednesday, thursday, friday, saturday, sunday }) => ({
      monday,
      tuesday,
      wednesday,
      thursday,
      friday,
      saturday,
      sunday,
    }))
}

export function PlanForm({ action, cancelHref, clientRhythmNotes, plan }: PlanFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState)
  const isEdit = !!plan

  const [startDate, setStartDate] = useState<string>(() => plan?.start_date ?? getNextMonday())
  const [contents, setContents] = useState<WeekContent[]>(() => buildInitialContents(plan))

  // Week N covers the calendar week N Mondays after the one the plan starts in.
  // Only the dates are derived here — the day cells stay untouched so that
  // editing one week doesn't change the identity of every other week's props
  // and defeat the memo on WeekEditor.
  const weekCount = contents.length
  const weekStarts = useMemo<string[]>(() => {
    const firstMonday = getMondayOf(startDate)
    return Array.from({ length: weekCount }, (_, i) => addWeeks(firstMonday, i))
  }, [weekCount, startDate])

  const updateDay = useCallback((weekIdx: number, day: DayKey, value: string) => {
    setContents((prev) => prev.map((w, i) => (i === weekIdx ? { ...w, [day]: value || null } : w)))
  }, [])

  // Serializing on submit instead of into a hidden field's value: as a render
  // prop this ran a full JSON.stringify of every week on every keystroke.
  const handleSubmit = useCallback(
    (formData: FormData) => {
      const firstMonday = getMondayOf(startDate)
      const weeks: TrainingPlanWeek[] = clampWeeksToStart(
        contents.map((content, i) => ({
          ...content,
          week_number: i + 1,
          week_start: addWeeks(firstMonday, i),
        })),
        startDate,
      )
      formData.set('weeks', JSON.stringify(weeks))
      return formAction(formData)
    },
    [contents, startDate, formAction],
  )

  const addWeek = useCallback(() => {
    setContents((prev) => [...prev, emptyWeekContent()])
  }, [])

  const removeWeek = useCallback((idx: number) => {
    setContents((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)))
  }, [])

  return (
    <form action={handleSubmit} className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="title">
            Título del plan <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            name="title"
            required
            defaultValue={plan?.title ?? ''}
            placeholder="Ej: Semana de fuerza, Preparación maratón..."
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="start_date">
            Fecha de inicio <span className="text-destructive">*</span>
          </Label>
          <Input
            id="start_date"
            name="start_date"
            type="date"
            required
            value={startDate}
            onChange={(e) => e.target.value && setStartDate(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Puede ser cualquier día. Si no es lunes, la primera semana arranca ese día.
          </p>
        </div>
      </div>

      {clientRhythmNotes && (
        <div className="rounded-xl border border-border bg-muted px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Ritmos del alumno</p>
          <RhythmNotes
            notes={clientRhythmNotes}
            lineClassName="font-mono italic leading-relaxed"
          />
        </div>
      )}

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-secondary-foreground">Semanas ({weekCount})</h3>
          <Button type="button" variant="ghost" size="sm" onClick={addWeek} className="text-primary hover:bg-accent">
            <Plus />
            Agregar semana
          </Button>
        </div>

        <div className="space-y-6">
          {contents.map((content, weekIdx) => (
            <WeekEditor
              key={weekIdx}
              content={content}
              weekStart={weekStarts[weekIdx]}
              weekIdx={weekIdx}
              startDate={startDate}
              canRemove={weekCount > 1}
              onUpdateDay={updateDay}
              onRemove={removeWeek}
            />
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="notes">Notas generales</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={plan?.notes ?? ''}
          placeholder="Observaciones generales del plan..."
          className="resize-none"
        />
      </div>

      {state.error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {state.error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending && <Spinner />}
          {isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear plan'}
        </Button>
        <Link href={cancelHref} className={cn(buttonVariants({ variant: 'secondary' }))}>
          Cancelar
        </Link>
      </div>
    </form>
  )
}

interface WeekEditorProps {
  content: WeekContent
  weekStart: string
  weekIdx: number
  startDate: string
  canRemove: boolean
  onUpdateDay: (weekIdx: number, day: DayKey, val: string) => void
  onRemove: (weekIdx: number) => void
}

// Takes the raw week content rather than a derived week object: editing one day
// used to rebuild every week, so all props changed identity and this memo never
// actually skipped a render.
const WeekEditor = memo(function WeekEditor({
  content,
  weekStart,
  weekIdx,
  startDate,
  canRemove,
  onUpdateDay,
  onRemove,
}: WeekEditorProps) {
  const dates = getWeekDates(weekStart)
  // A first week the coach started mid-week runs from that day, not from Monday.
  const from = dates[0] < startDate ? startDate : dates[0]
  const isPartial = from !== dates[0]

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="flex items-center justify-between bg-slate-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase text-slate-400">Semana {weekIdx + 1}</span>
          <span className="text-sm font-semibold text-white">
            {fmtDay(from)} — {fmtDay(dates[6])}
          </span>
          {isPartial && (
            <span className="text-xs text-slate-400">(inicio del plan)</span>
          )}
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(weekIdx)}
            title="Eliminar semana"
            className="text-slate-500 transition hover:text-red-400"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Igual que la vista de la semana: 7 columnas en desktop, y en mobile los
          días apilados. Con la grilla, cargar una semana en el teléfono era
          escribir dentro de campos de ~80px scrolleando de costado. */}
      <div className="md:overflow-x-auto">
        <div className="grid grid-cols-1 divide-y divide-slate-100 md:min-w-140 md:grid-cols-7 md:divide-x md:divide-y-0">
          {DAYS.map((day, i) => {
            const beforeStart = dates[i] < startDate
            return (
              <div
                key={day.key}
                // Los días anteriores al inicio del plan van deshabilitados y se
                // guardan vacíos: en mobile, donde no alinean ninguna grilla,
                // sólo ocuparían lugar.
                className={cn('md:flex md:flex-col', beforeStart ? 'hidden md:flex' : 'flex')}
              >
                <div
                  className={cn(
                    'flex w-24 shrink-0 items-center justify-center px-1 py-1.5 text-center text-xs font-bold text-white md:w-auto',
                    beforeStart ? 'bg-slate-300' : 'bg-red-600',
                  )}
                >
                  {day.label}
                </div>
                <textarea
                  // Days before the plan starts render empty regardless of what
                  // was typed earlier: the action clamps them away on save, so
                  // showing stale text would promise something it won't store.
                  value={beforeStart ? '' : (content[day.key] ?? '')}
                  onChange={(e) => onUpdateDay(weekIdx, day.key, e.target.value)}
                  placeholder={beforeStart ? '' : '—'}
                  rows={4}
                  disabled={beforeStart}
                  title={beforeStart ? 'Anterior al inicio del plan' : undefined}
                  // text-base en mobile por el zoom al enfocar de iOS; en la
                  // grilla de desktop vuelve al xs, que es lo que la hace entrar.
                  className="min-w-0 flex-1 resize-none border-0 border-b border-slate-100 p-2 text-base text-slate-700 placeholder-slate-300 transition outline-none focus:bg-blue-50 disabled:cursor-not-allowed disabled:bg-slate-50 md:w-full md:text-xs"
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
})

function fmtDay(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}
