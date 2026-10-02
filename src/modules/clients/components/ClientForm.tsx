'use client'

import Link from 'next/link'
import { startTransition, useActionState, useRef, useState } from 'react'
import { AlertCircle, Plus, Trash2 } from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import { DEFAULT_RHYTHM_NOTES, MAX_OBJECTIVES, REFERENCE_DISTANCES } from '@/types/constants'
import type { ActionResult, Client, ClientObjective } from '@/types'

interface ClientFormProps {
  action: (prev: ActionResult<null>, formData: FormData) => Promise<ActionResult<null>>
  client?: Client
  cancelHref?: string
}

const initialState: ActionResult<null> = { data: null, error: null }

// The objectives editor is the only dynamic part of this form. Rows hold an id
// purely as a React key: their values stay in the DOM (uncontrolled inputs, like
// every other field here) and are read back from FormData on submit.
interface ObjectiveRow {
  id: number
  objective: ClientObjective
}

function toRows(objectives: ClientObjective[] | undefined): ObjectiveRow[] {
  return (objectives ?? []).map((objective, i) => ({ id: i, objective }))
}

export function ClientForm({
  action,
  client,
  cancelHref = '/dashboard/clients',
}: ClientFormProps): React.JSX.Element {
  const [state, formAction, isPending] = useActionState(action, initialState)
  const [objectiveRows, setObjectiveRows] = useState<ObjectiveRow[]>(() => toRows(client?.objectives))
  const nextObjectiveId = useRef(objectiveRows.length)
  const isEdit = !!client

  function addObjective() {
    const id = nextObjectiveId.current++
    setObjectiveRows((rows) =>
      rows.length >= MAX_OBJECTIVES
        ? rows
        : [...rows, { id, objective: { name: '', target_time: null, achieved_time: null } }],
    )
  }

  function removeObjective(id: number) {
    setObjectiveRows((rows) => rows.filter((row) => row.id !== id))
  }

  // React resets every uncontrolled field after an `action` submission, whatever
  // the result — so a rejected save (a bad email, an age out of range) wiped
  // everything the coach had typed. Once hydrated, onSubmit dispatches the same
  // action by hand: React sees the prevented event and neither runs the action
  // again nor resets the form. `action` stays on the <form> for the submit that
  // lands before hydration, which would otherwise be a native GET carrying every
  // field in the URL. A successful save redirects away either way.
  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startTransition(() => formAction(formData))
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="first_name">
            Nombre <span className="text-destructive">*</span>
          </Label>
          <Input id="first_name" name="first_name" required defaultValue={client?.first_name} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="last_name">
            Apellido <span className="text-destructive">*</span>
          </Label>
          <Input id="last_name" name="last_name" required defaultValue={client?.last_name} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={client?.email ?? ''}
            placeholder="alumno@ejemplo.com"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={client?.phone ?? ''}
            placeholder="+54 11 1234-5678"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="date_of_birth">Fecha de nacimiento</Label>
          <Input id="date_of_birth" name="date_of_birth" type="date" defaultValue={client?.date_of_birth ?? ''} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="age">Edad</Label>
          <Input
            id="age"
            name="age"
            type="number"
            min={1}
            max={120}
            step={1}
            inputMode="numeric"
            defaultValue={client?.age ?? ''}
            placeholder="38"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="weight_kg">Peso (kg)</Label>
          <Input
            id="weight_kg"
            name="weight_kg"
            type="number"
            min={20}
            max={300}
            step="0.1"
            inputMode="decimal"
            defaultValue={client?.weight_kg ?? ''}
            placeholder="72.5"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="city">Ciudad</Label>
          <Input id="city" name="city" defaultValue={client?.city ?? ''} placeholder="Ej: Rosario" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="available_time">Tiempo disponible</Label>
          <Input
            id="available_time"
            name="available_time"
            defaultValue={client?.available_time ?? ''}
            placeholder="Ej: 1 hora por la mañana"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="available_medium">Medio del que dispone</Label>
        <Textarea
          id="available_medium"
          name="available_medium"
          rows={2}
          defaultValue={client?.available_medium ?? ''}
          placeholder="Ej: pista de atletismo, cinta en casa, senderos de tierra..."
          className="resize-none"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="training_days">Días que entrena</Label>
        <Textarea
          id="training_days"
          name="training_days"
          rows={2}
          defaultValue={client?.training_days ?? ''}
          placeholder="Ej: 4 días por semana — lunes, miércoles, viernes y domingo"
          className="resize-none"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="goal">Objetivo general</Label>
        <Input
          id="goal"
          name="goal"
          defaultValue={client?.goal ?? ''}
          placeholder="Ej: Bajar de peso, ganar masa muscular..."
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={client?.notes ?? ''}
          placeholder="Observaciones, lesiones, preferencias..."
          className="resize-none"
        />
      </div>

      <label
        htmlFor="is_free"
        className="flex cursor-pointer items-start gap-3 rounded-lg border border-border px-4 py-3 transition hover:bg-muted"
      >
        <input
          id="is_free"
          name="is_free"
          type="checkbox"
          defaultChecked={client?.is_free ?? false}
          className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary"
        />
        <span>
          <span className="block text-sm font-medium text-secondary-foreground">Free</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Liberado de pagar cuotas: no aparece en cuotas pendientes ni en el reporte de métodos
            de pago.
          </span>
        </span>
      </label>

      <div className="border-t border-border pt-5">
        <h2 className="text-sm font-semibold text-secondary-foreground">Marcas referenciales</h2>
        <p className="mt-1 mb-3 text-xs text-muted-foreground">
          Mejores tiempos por distancia. Dejá en blanco las que todavía no corrió.
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {REFERENCE_DISTANCES.map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={key}>{label}</Label>
              <Input id={key} name={key} defaultValue={client?.[key] ?? ''} placeholder="00:00:00" />
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-5">
        <h2 className="text-sm font-semibold text-secondary-foreground">Objetivos</h2>
        <p className="mt-1 mb-3 text-xs text-muted-foreground">
          Carreras o metas del alumno, con el tiempo deseado y el que finalmente obtuvo.
        </p>

        {objectiveRows.length === 0 ? (
          <p className="mb-3 rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            Sin objetivos cargados
          </p>
        ) : (
          <div className="mb-3 space-y-3">
            {objectiveRows.map(({ id, objective }, index) => (
              <div key={id} className="rounded-lg border border-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    Objetivo {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeObjective(id)}
                    aria-label={`Quitar objetivo ${index + 1}`}
                  >
                    <Trash2 />
                  </Button>
                </div>
                {/* The three inputs repeat the same names on every row; the action
                    zips the parallel lists back together by position. */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="space-y-1">
                    <Label htmlFor={`objective_name_${id}`} className="text-xs">
                      Objetivo
                    </Label>
                    <Input
                      id={`objective_name_${id}`}
                      name="objective_name"
                      defaultValue={objective.name}
                      placeholder="Ej: Maratón de Buenos Aires"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`objective_target_time_${id}`} className="text-xs">
                      Tiempo deseado
                    </Label>
                    <Input
                      id={`objective_target_time_${id}`}
                      name="objective_target_time"
                      defaultValue={objective.target_time ?? ''}
                      placeholder="03:30:00"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`objective_achieved_time_${id}`} className="text-xs">
                      Tiempo obtenido
                    </Label>
                    <Input
                      id={`objective_achieved_time_${id}`}
                      name="objective_achieved_time"
                      defaultValue={objective.achieved_time ?? ''}
                      placeholder="03:42:15"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addObjective}
          disabled={objectiveRows.length >= MAX_OBJECTIVES}
        >
          <Plus />
          Agregar objetivo
        </Button>
      </div>

      <div className="border-t border-border pt-5">
        <Label htmlFor="rhythm_notes">Ritmos de referencia</Label>
        <p className="mt-1 mb-2 text-xs text-muted-foreground">
          Se incluyen automáticamente en todos los planes descargados. Cada ritmo en una línea.
        </p>
        <Textarea
          id="rhythm_notes"
          name="rhythm_notes"
          rows={12}
          defaultValue={client?.rhythm_notes ?? DEFAULT_RHYTHM_NOTES}
          className="resize-y font-mono text-sm"
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
          {isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear alumno'}
        </Button>
        <Link href={cancelHref} className={cn(buttonVariants({ variant: 'secondary' }))}>
          Cancelar
        </Link>
      </div>
    </form>
  )
}
