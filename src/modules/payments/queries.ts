import { createClient } from '@/lib/supabase/server'
import type { PaymentRecord } from '@/types'

// The !inner join forces every payment through the alumnos policy as well, so a
// row only comes back when its alumno is visible to the caller. Defence in
// depth: an early migration shipped payments' own RLS as `using (true)`, and
// this query is otherwise unfiltered.
export async function getAllPayments(): Promise<PaymentRecord[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('payments')
    .select('alumno_id, year, month, paid, alumnos!inner(id)')

  const rows = (data ?? []) as (PaymentRecord & { alumnos: unknown })[]
  return rows.map(({ alumno_id, year, month, paid }) => ({ alumno_id, year, month, paid }))
}
