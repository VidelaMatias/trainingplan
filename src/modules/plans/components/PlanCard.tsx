'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ChevronDown, FileSpreadsheet, Info, Pencil, Send, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import { formatMediumDate, formatShortDate } from '@/lib/date'
import { RhythmNotes } from '@/modules/clients/components/RhythmNotes'
import { DAYS } from '@/types/constants'
import { PLAN_STATUS, PLAN_STATUS_META } from '@/types/constants'
import { useClientFilter } from '@/modules/clients/useClientFilter'
import { withClientFilter } from '@/modules/clients/utils'
import { getPlanStatus, getWeekDates } from '@/modules/plans/utils'
import { deletePlanAction, fetchPlanWeeks } from '@/modules/plans/actions'
import type { PlanListItem } from '@/modules/plans/queries'
import type { TrainingPlanWeek } from '@/types'

interface PlanCardProps {
  plan: PlanListItem
  clientId: string
  clientRhythmNotes?: string | null
  // Chat del alumno en WhatsApp, ya normalizado en el servidor. Null cuando el
  // teléfono está vacío o no da un número usable.
  whatsappUrl?: string | null
}

export function PlanCard({
  plan,
  clientId,
  clientRhythmNotes,
  whatsappUrl,
}: PlanCardProps): React.JSX.Element {
  // Vista filtrada de la lista de alumnos, para que la edición del plan vuelva a ella.
  const filter = useClientFilter()
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [loadingDelete, setLoadingDelete] = useState(false)
  const [loadingExport, setLoadingExport] = useState(false)
  const [loadingSend, setLoadingSend] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Aviso, no error: el envío terminó bien pero falta un paso manual.
  const [notice, setNotice] = useState<string | null>(null)

  // Week bodies arrive only on first expand; null means "not fetched yet".
  const [weeks, setWeeks] = useState<TrainingPlanWeek[] | null>(null)
  const [loadingWeeks, setLoadingWeeks] = useState(false)
  // A ref, not the loading flag: a state update is not visible to a second
  // click within the same tick, so two fast expands would both fire a fetch.
  const weeksRequested = useRef(false)

  const status = getPlanStatus(plan)
  const meta = PLAN_STATUS_META[status]

  async function toggleExpanded() {
    const next = !expanded
    setExpanded(next)
    if (!next || weeksRequested.current) return

    weeksRequested.current = true
    setLoadingWeeks(true)
    setError(null)
    const result = await fetchPlanWeeks(plan.id)
    setLoadingWeeks(false)

    if (result.error) {
      setError(result.error)
      weeksRequested.current = false // let the next expand retry
      return
    }
    setWeeks(result.data)
  }

  async function handleDelete() {
    setLoadingDelete(true)
    setError(null)
    const result = await deletePlanAction(plan.id)
    // On success the row disappears with the revalidation; on failure the
    // button used to spin forever with the error silently discarded.
    if (result.error) {
      setError(result.error)
      setLoadingDelete(false)
      setConfirmDelete(false)
    }
  }

  // Descargar y enviar piden el mismo archivo, y la hoja de compartir nativa
  // necesita un File (no una URL), así que el Excel se envuelve en uno solo.
  async function fetchPlanFile(): Promise<File | null> {
    const res = await fetch(`/api/plans/${plan.id}/export`)
    // Without this the JSON error body from a 401/404 was wrapped in a blob
    // and saved as a .xlsx the coach could not open.
    if (!res.ok) {
      setError(
        res.status === 401
          ? 'Tu sesión expiró. Recargá la página e intentá de nuevo.'
          : 'No se pudo generar el Excel.',
      )
      return null
    }

    const blob = await res.blob()
    return new File([blob], filenameFrom(res) ?? `plan-${slugify(plan.title)}.xlsx`, {
      type: blob.type,
    })
  }

  function downloadFile(file: File) {
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    // Firefox only follows a click on a node that is in the document.
    document.body.appendChild(a)
    a.click()
    a.remove()
    // Revoking synchronously after click() can race the download starting.
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  async function handleExport() {
    setLoadingExport(true)
    setError(null)
    setNotice(null)
    try {
      const file = await fetchPlanFile()
      if (file) downloadFile(file)
    } catch {
      setError('No se pudo generar el Excel.')
    } finally {
      setLoadingExport(false)
    }
  }

  // Mandar el plan por WhatsApp tiene dos caminos, y cuál se puede depende del
  // dispositivo. La hoja de compartir nativa entrega el .xlsx como adjunto de
  // verdad — el entrenador elige WhatsApp y el contacto ahí —, pero existe en el
  // celular y sólo en algunos navegadores de escritorio. Donde no está no hay
  // forma de adjuntar un archivo a WhatsApp Web desde la página: se descarga el
  // Excel y se abre el chat del alumno para que lo arrastre.
  async function handleSend() {
    setLoadingSend(true)
    setError(null)
    setNotice(null)
    try {
      const file = await fetchPlanFile()
      if (!file) return

      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] })
          return
        } catch (err) {
          // Cerrar la hoja de compartir no es un error: el entrenador se
          // arrepintió y no hay nada que avisarle.
          if (err instanceof DOMException && err.name === 'AbortError') return
          // Cualquier otra falla cae al plan B en vez de dejarlo sin el archivo.
        }
      }

      downloadFile(file)
      if (whatsappUrl) {
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
        setNotice('Descargamos el Excel y abrimos el chat: arrastralo al chat para enviarlo.')
      } else {
        setNotice('Descargamos el Excel. Cargá el teléfono del alumno para que además se abra su chat.')
      }
    } catch {
      setError('No se pudo generar el Excel.')
    } finally {
      setLoadingSend(false)
    }
  }

  return (
    <Card className={cn('overflow-hidden', status === PLAN_STATUS.ACTIVE && 'border-blue-200')}>
      {/* En mobile los cinco botones y el título no entran en la misma línea: el
          título quedaba truncado a dos palabras. Las acciones bajan a su propio
          renglón y recién en sm vuelven al costado. */}
      <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-card-foreground">{plan.title}</h3>
            <Badge variant={meta.variant}>{meta.label}</Badge>
            <span className="text-xs text-muted-foreground">
              {plan.week_count} semana{plan.week_count !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {formatMediumDate(plan.start_date)} — {formatMediumDate(plan.end_date)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            title={expanded ? 'Cerrar' : 'Ver plan'}
            onClick={toggleExpanded}
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
            title="Enviar por WhatsApp"
            onClick={handleSend}
            disabled={loadingSend}
            className="text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600"
          >
            {loadingSend ? <Spinner className="size-4 text-emerald-600" /> : <Send />}
          </Button>

          {/* Ver ClientActions: con router.push no había ni prefetch ni
              esqueleto, y editar un plan largo dejaba el botón sin respuesta
              varios segundos. */}
          <Link
            href={withClientFilter(`/dashboard/clients/${clientId}/plans/${plan.id}/edit`, filter)}
            title="Editar"
            aria-label={`Editar ${plan.title}`}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
              'text-muted-foreground hover:bg-accent hover:text-primary',
            )}
          >
            <Pencil />
          </Link>

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

      {error && (
        <p className="flex items-center gap-2 border-t border-red-100 bg-red-50 px-5 py-2.5 text-xs text-destructive">
          <AlertCircle className="size-3.5 shrink-0" />
          {error}
        </p>
      )}

      {notice && (
        <p className="flex items-start gap-2 border-t border-blue-100 bg-accent px-5 py-2.5 text-xs text-primary">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          {notice}
        </p>
      )}

      {expanded && (
        <div className="border-t border-slate-100">
          {clientRhythmNotes && (
            <div className="border-b border-slate-100 bg-muted px-5 py-3">
              <p className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">
                Ritmos de referencia
              </p>
              <RhythmNotes notes={clientRhythmNotes} lineClassName="italic" />
            </div>
          )}

          <PlanWeeks weeks={weeks} loading={loadingWeeks} startDate={plan.start_date} />
        </div>
      )}
    </Card>
  )
}

// Three states, because the week bodies are fetched on expand rather than
// shipped with the page: still loading, loaded-but-empty, and loaded.
function PlanWeeks({
  weeks,
  loading,
  startDate,
}: {
  weeks: TrainingPlanWeek[] | null
  loading: boolean
  startDate: string
}) {
  if (loading) {
    return (
      <p className="flex items-center gap-2 px-5 py-4 text-sm text-muted-foreground">
        <Spinner className="size-4" />
        Cargando semanas...
      </p>
    )
  }

  // Null with nothing in flight means the fetch failed; the error banner above
  // already says so, so this renders nothing rather than a second message.
  if (!weeks) return null

  if (weeks.length === 0) {
    return <p className="px-5 py-4 text-sm italic text-muted-foreground">Sin semanas cargadas.</p>
  }

  return (
    <div className="divide-y divide-slate-100">
      {weeks.map((week) => (
        <WeekView key={week.week_number} week={week} startDate={startDate} />
      ))}
    </div>
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
          {formatShortDate(from)} — {formatShortDate(dates[6])}
        </span>
      </div>
      {/* Dos lecturas de la misma semana. En desktop, la grilla de 7 columnas
          que replica el calendario. En mobile no entra —arrancaba en 35rem y
          scrolleaba de costado dentro de una página que ya scrollea— así que los
          días se apilan: etiqueta a la izquierda, sesión a la derecha. */}
      <div className="md:overflow-x-auto">
        <div className="grid grid-cols-1 divide-y divide-slate-100 border-b border-slate-100 md:min-w-140 md:grid-cols-7 md:divide-x md:divide-y-0">
          {DAYS.map((day, i) => {
            const beforeStart = dates[i] < startDate
            return (
              <div
                key={day.key}
                className={cn(
                  'min-h-15',
                  // Los días previos al inicio del plan sólo existen para no
                  // desalinear la grilla del calendario: apilados no alinean
                  // nada, así que en mobile no se muestran.
                  beforeStart ? 'hidden bg-slate-50 md:block' : 'flex md:block',
                )}
              >
                <div
                  className={cn(
                    'flex w-24 shrink-0 items-center justify-center px-2 py-1 text-center text-xs font-bold text-white md:w-auto',
                    beforeStart ? 'bg-slate-300' : 'bg-red-600',
                  )}
                >
                  {day.label}
                </div>
                {!beforeStart && (
                  <p className="min-w-0 flex-1 whitespace-pre-wrap p-2 text-xs leading-relaxed text-slate-600">
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

// Mirrors the slug the export route builds, so a title with characters that are
// illegal in a filename (a slash, say) can't produce a broken download name.
function slugify(title: string) {
  return title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'entrenamiento'
}

// The route already names the file in Content-Disposition; prefer it over
// recomputing the name here so the two can't drift.
function filenameFrom(res: Response): string | null {
  const match = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')
  return match?.[1] ?? null
}

