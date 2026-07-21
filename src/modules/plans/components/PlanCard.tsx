'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, FileSpreadsheet, Pencil, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import { DAYS } from '@/types/constants'
import { PLAN_STATUS, PLAN_STATUS_META } from '@/types/constants'
import { getPlanStatus, getWeekDates } from '@/modules/plans/utils'
import { deletePlanAction } from '@/modules/plans/actions'
import type { PlanWithWeeks, TrainingPlanWeek } from '@/types'

interface PlanCardProps {
  plan: PlanWithWeeks
  clientId: string
  clientRhythmNotes?: string | null
}

export function PlanCard({ plan, clientId, clientRhythmNotes }: PlanCardProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [loadingDelete, setLoadingDelete] = useState(false)
  const [loadingExport, setLoadingExport] = useState(false)

  const status = getPlanStatus(plan)
  const meta = PLAN_STATUS_META[status]
  const weeks = [...(plan.training_plan_weeks ?? [])].sort((a, b) => a.week_number - b.week_number)

  async function handleDelete() {
    setLoadingDelete(true)
    await deletePlanAction(plan.id, clientId)
  }

  async function handleExport() {
    setLoadingExport(true)
    try {
      const res = await fetch(`/api/plans/${plan.id}/export`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `plan-${plan.title.toLowerCase().replace(/\s+/g, '-')}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoadingExport(false)
    }
  }

  return (
    <Card className={cn('overflow-hidden', status === PLAN_STATUS.ACTIVE && 'border-blue-200')}>
      <div className="flex items-start justify-between gap-3 px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-card-foreground">{plan.title}</h3>
            <Badge variant={meta.variant}>{meta.label}</Badge>
            <span className="text-xs text-muted-foreground">
              {weeks.length} semana{weeks.length !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {fmtDate(plan.start_date)} — {fmtDate(plan.end_date)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            title={expanded ? 'Cerrar' : 'Ver plan'}
            onClick={() => setExpanded((v) => !v)}
            className="text-muted-foreground"
          >
            <ChevronDown className={cn('transition-transform', expanded && 'rotate-180')} />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            title="Descargar Excel"
            onClick={handleExport}
            disabled={loadingExport}
            className="text-muted-foreground hover:bg-green-50 hover:text-green-600"
          >
            {loadingExport ? <Spinner className="size-4 text-green-600" /> : <FileSpreadsheet />}
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            title="Editar"
            onClick={() => router.push(`/dashboard/clients/${clientId}/plans/${plan.id}/edit`)}
            className="text-muted-foreground hover:bg-accent hover:text-primary"
          >
            <Pencil />
          </Button>

          {!confirmDelete ? (
            <Button
              variant="ghost"
              size="icon-sm"
              title="Eliminar"
              onClick={() => setConfirmDelete(true)}
              className="text-muted-foreground hover:bg-red-50 hover:text-destructive"
            >
              <Trash2 />
            </Button>
          ) : (
            <div className="flex items-center gap-1">
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loadingDelete}>
                {loadingDelete && <Spinner className="size-3.5" />}
                {loadingDelete ? 'Borrando' : 'Sí'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmDelete(false)}
                disabled={loadingDelete}
              >
                No
              </Button>
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100">
          {clientRhythmNotes && (
            <div className="border-b border-slate-100 bg-muted px-5 py-3">
              <p className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">
                Ritmos de referencia
              </p>
              <div className="space-y-0.5">
                {clientRhythmNotes
                  .split('\n')
                  .filter(Boolean)
                  .map((line, i) => (
                    <p key={i} className="text-xs italic text-red-700">
                      {line}
                    </p>
                  ))}
              </div>
            </div>
          )}

          {weeks.length === 0 ? (
            <p className="px-5 py-4 text-sm italic text-muted-foreground">Sin semanas cargadas.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {weeks.map((week) => (
                <WeekView key={week.week_number} week={week} startDate={plan.start_date} />
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

function WeekView({ week, startDate }: { week: TrainingPlanWeek; startDate: string }) {
  const dates = getWeekDates(week.week_start)
  // A plan started mid-week has a partial first week: it opens on the start date
  // rather than on its Monday.
  const from = dates[0] < startDate ? startDate : dates[0]

  return (
    <div>
      <div className="bg-slate-800 px-5 py-2">
        <span className="text-xs font-semibold uppercase text-slate-400">Semana {week.week_number} </span>
        <span className="text-xs text-slate-300">
          {fmtShort(from)} — {fmtShort(dates[6])}
        </span>
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-140 grid-cols-7 divide-x divide-slate-100 border-b border-slate-100">
          {DAYS.map((day, i) => {
            const beforeStart = dates[i] < startDate
            return (
              <div key={day.key} className={cn('min-h-15', beforeStart && 'bg-slate-50')}>
                <div
                  className={cn(
                    'py-1 text-center text-xs font-bold text-white',
                    beforeStart ? 'bg-slate-300' : 'bg-red-600',
                  )}
                >
                  {day.label}
                </div>
                {!beforeStart && (
                  <p className="whitespace-pre-wrap p-2 text-xs leading-relaxed text-slate-600">
                    {week[day.key] ?? <span className="text-slate-300">—</span>}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function fmtShort(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
