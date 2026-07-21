'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { AlertCircle } from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import { DEFAULT_RHYTHM_NOTES } from '@/types/constants'
import type { ActionResult, Client } from '@/types'

interface ClientFormProps {
  action: (prev: ActionResult<null>, formData: FormData) => Promise<ActionResult<null>>
  client?: Client
}

const initialState: ActionResult<null> = { data: null, error: null }

export function ClientForm({ action, client }: ClientFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState)
  const isEdit = !!client

  return (
    <form action={formAction} className="space-y-5">
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

      <div className="space-y-1">
        <Label htmlFor="date_of_birth">Fecha de nacimiento</Label>
        <Input id="date_of_birth" name="date_of_birth" type="date" defaultValue={client?.date_of_birth ?? ''} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="goal">Objetivo</Label>
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
        <Link href="/dashboard/clients" className={cn(buttonVariants({ variant: 'secondary' }))}>
          Cancelar
        </Link>
      </div>
    </form>
  )
}
