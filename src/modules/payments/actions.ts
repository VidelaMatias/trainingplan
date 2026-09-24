'use server'

import { revalidateAppData } from '@/lib/revalidate'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/guards'
import { paymentSchema } from '@/types/schemas'
import type { PaymentMethod } from '@/types/constants'
import type { ActionResult } from '@/types'

export async function setPayment(
  alumnoId: string,
  year: number,
  month: number,
  paid: boolean,
  method: PaymentMethod | null,
): Promise<ActionResult<null>> {
  const auth = await requireAuth()
  if (!auth) return { data: null, error: 'No autorizado' }

  // Unmarking clears the method rather than trusting the caller to send null:
  // a fee that was not collected was not collected in any way, and the database
  // rejects the pair anyway (payments_method_requires_paid).
  const parsed = paymentSchema.safeParse({
    alumno_id: alumnoId,
    year,
    month,
    paid,
    method: paid ? method : null,
  })
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
      // Written from the validated payload, not the raw argument: that is where
      // the "unpaid clears the method" rule was applied.
      method: parsed.data.method,
      paid_at: paid ? new Date().toISOString() : null,
    },
    { onConflict: 'alumno_id,year,month' },
  )
  if (error) return { data: null, error: 'No se pudo actualizar el pago' }

  revalidateAppData()
  return { data: null, error: null }
}
