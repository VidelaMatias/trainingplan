'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Pencil, Power, Trash2 } from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import { deleteClientAction, toggleClientActive } from '@/modules/clients/actions'
import type { Client } from '@/types'

// Only the two fields this component actually reads, so the client list can
// keep fetching a narrow row instead of every column of `alumnos`.
type ClientActionsTarget = Pick<Client, 'id' | 'active'>

export function ClientActions({ client }: { client: ClientActionsTarget }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [togglePending, startToggle] = useTransition()
  const [deletePending, startDelete] = useTransition()

  function handleToggle() {
    setError(null)
    startToggle(async () => {
      const result = await toggleClientActive(client.id, !client.active)
      if (result.error) setError(result.error)
    })
  }

  function handleDelete() {
    setError(null)
    startDelete(async () => {
      const result = await deleteClientAction(client.id)
      if (result.error) setError(result.error)
      else setConfirmDelete(false)
    })
  }

  return (
    <div className="relative flex items-center gap-1">
      {error && (
        <span
          role="alert"
          className="absolute right-0 top-full z-10 mt-1 whitespace-nowrap rounded-md bg-destructive px-2 py-1 text-xs text-white shadow-lg"
        >
          {error}
        </span>
      )}
      {/* Un Link y no un router.push: éste prefetchea la ruta y su loading.tsx,
          así el esqueleto del formulario aparece apenas se hace click. Con el
          push no había prefetch ni fallback y el botón quedaba mudo hasta que
          llegaba la página entera. De paso vuelven a funcionar cmd+click y
          "abrir en una pestaña nueva". */}
      <Link
        href={`/dashboard/clients/${client.id}/edit`}
        title="Editar"
        aria-label="Editar alumno"
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
          'text-muted-foreground hover:bg-accent hover:text-primary',
        )}
      >
        <Pencil />
      </Link>

      <Button
        variant="ghost"
        size="icon-sm"
        title={client.active ? 'Desactivar' : 'Activar'}
        onClick={handleToggle}
        disabled={togglePending}
        className={cn(
          client.active
            ? 'text-green-600 hover:bg-green-50'
            : 'text-muted-foreground hover:bg-muted',
        )}
      >
        {togglePending ? <Spinner className="size-3.5" /> : <Power />}
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
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deletePending}>
            {deletePending && <Spinner className="size-3.5" />}
            {deletePending ? 'Borrando' : 'Sí'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setConfirmDelete(false)}
            disabled={deletePending}
          >
            No
          </Button>
        </div>
      )}
    </div>
  )
}
