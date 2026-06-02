'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteClientAction, toggleClientActive } from '@/app/dashboard/clients/actions'
import { Client } from '@/types/client'

interface ClientActionsProps {
  client: Client
}

export default function ClientActions({ client }: ClientActionsProps) {
  const router = useRouter()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    await deleteClientAction(client.id)
    setLoading(false)
    setConfirmDelete(false)
  }

  async function handleToggle() {
    setLoading(true)
    await toggleClientActive(client.id, !client.active)
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => router.push(`/dashboard/clients/${client.id}/edit`)}
        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
        title="Editar"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>

      <button
        onClick={handleToggle}
        disabled={loading}
        className={`p-1.5 rounded-lg transition ${
          client.active
            ? 'text-green-600 hover:bg-green-50'
            : 'text-slate-400 hover:bg-slate-100'
        }`}
        title={client.active ? 'Desactivar' : 'Activar'}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {!confirmDelete ? (
        <button
          onClick={() => setConfirmDelete(true)}
          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
          title="Eliminar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      ) : (
        <div className="flex items-center gap-1">
          <button
            onClick={handleDelete}
            disabled={loading}
            className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
          >
            {loading ? '...' : 'Sí'}
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="px-2 py-1 text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition"
          >
            No
          </button>
        </div>
      )}
    </div>
  )
}
