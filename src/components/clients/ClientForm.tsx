'use client'

const DEFAULT_RHYTHM_NOTES = `Ritmo U (Umbral de lactato): 3:15 a 3:20 x mil
Ritmo S/L (Suave/Largo): 4:30 a 5:10 x mil (si estás muy agotado ó fondo de semana POST DÍA INTENSO mas despacio)

Ritmo I (Intervalado): 3 a 3:12 X MIL
Ritmo M (Maratón): 3:35 A 3:40 X MIL

A/D (Aceleración/Desaceleración): 15 SEG RÁPIDOS X 45 SEG TROTE SUAVE

Ritmo R (Repetición): 200 MTS: 31/34 SEG  300 MTS: 51/55 SEG  400 MTS: 71/75 SEG

Fartlek Corto (Cambios de ritmo): (3 min- 2 min- 1 min) a ritmo medio, siempre recup 2 min trote. Sería: 3 min medio- 2 min suave- 2 min medio- 2 min S-1 min medio- 2 min S Y volver a comenzar con 3 min medio- 2 min S….
Fartlek Largo (Cambios de ritmo): (6 MIN- 4 MIN - 2 MIN) siempre recup 2 min trote suave

Ritmo Medio: Escala de percepción de esfuerzo de 8 puntos sobre 10. En llano, ritmo cercano al U.

Fartlek Activación (Cambios de ritmo): 1 min ritmo medio x 1 min trote suave.`

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Client } from '@/types/client'
import { createClientAction, updateClientAction } from '@/app/dashboard/clients/actions'
import Spinner from '@/components/ui/Spinner'

interface ClientFormProps {
  client?: Client
}

export default function ClientForm({ client }: ClientFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isEdit = !!client

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    const result = isEdit
      ? await updateClientAction(client.id, formData)
      : await createClientAction(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.push('/dashboard/clients')
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            name="first_name"
            type="text"
            required
            defaultValue={client?.first_name}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Apellido <span className="text-red-500">*</span>
          </label>
          <input
            name="last_name"
            type="text"
            required
            defaultValue={client?.last_name}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            name="email"
            type="email"
            defaultValue={client?.email ?? ''}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            placeholder="alumno@ejemplo.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
          <input
            name="phone"
            type="tel"
            defaultValue={client?.phone ?? ''}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            placeholder="+54 11 1234-5678"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de nacimiento</label>
        <input
          name="date_of_birth"
          type="date"
          defaultValue={client?.date_of_birth ?? ''}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Objetivo</label>
        <input
          name="goal"
          type="text"
          defaultValue={client?.goal ?? ''}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          placeholder="Ej: Bajar de peso, ganar masa muscular..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={client?.notes ?? ''}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
          placeholder="Observaciones, lesiones, preferencias..."
        />
      </div>

      <div className="border-t border-slate-200 pt-5">
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Ritmos de referencia
        </label>
        <p className="text-xs text-slate-400 mb-2">
          Se incluyen automáticamente en todos los planes descargados. Cada ritmo en una línea.
        </p>
        <textarea
          name="rhythm_notes"
          rows={12}
          defaultValue={client?.rhythm_notes ?? DEFAULT_RHYTHM_NOTES}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-y"
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
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {loading && <Spinner />}
          {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear alumno'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/dashboard/clients')}
          className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
