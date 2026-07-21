'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/guards'
import { paymentSchema } from '@/types/schemas'
import type { ActionResult } from '@/types'

export async function setPayment(
  alumnoId: string,
  year: number,
  month: number,
  paid: boolean,
): Promise<ActionResult<null>> {
  const auth = await requireAuth()
  if (!auth) return { data: null, error: 'No autorizado' }

  const parsed = paymentSchema.safeParse({ alumno_id: alumnoId, year, month, paid })
  if (!parsed.success) return { data: null, error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('alumnos')
    .select('id')
    .eq('id', alumnoId)
    .eq('created_by', auth.userId)
    .single()

  if (!existing) return { data: null, error: 'No autorizado' }

  const { error } = await supabase.from('payments').upsert(
    {
      alumno_id: alumnoId,
      year,
      month,
      paid,
      paid_at: paid ? new Date().toISOString() : null,
    },
    { onConflict: 'alumno_id,year,month' },
  )
  if (error) return { data: null, error: 'No se pudo actualizar el pago' }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/clients')
  revalidatePath(`/dashboard/clients/${alumnoId}`)
  return { data: null, error: null }
}
