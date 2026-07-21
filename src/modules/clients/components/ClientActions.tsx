'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Power, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import { deleteClientAction, toggleClientActive } from '@/modules/clients/actions'
import type { Client } from '@/types'

export function ClientActions({ client }: { client: Client }) {
  const router = useRouter()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [togglePending, startToggle] = useTransition()
  const [deletePending, startDelete] = useTransition()

  function handleToggle() {
    startToggle(async () => {
      await toggleClientActive(client.id, !client.active)
    })
  }

  function handleDelete() {
    startDelete(async () => {
      const result = await deleteClientAction(client.id)
      if (!result.error) setConfirmDelete(false)
    })
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        title="Editar"
        onClick={() => router.push(`/dashboard/clients/${client.id}/edit`)}
        className="text-muted-foreground hover:bg-accent hover:text-primary"
      >
        <Pencil />
      </Button>

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
