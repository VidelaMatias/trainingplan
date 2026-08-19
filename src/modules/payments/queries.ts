import { createClient } from '@/lib/supabase/server'
import type { PaymentRecord } from '@/types'

const COLUMNS = 'alumno_id, year, month, paid, alumnos!inner(id)'

type PaymentRow = PaymentRecord & { alumnos: unknown }

function toRecords(data: unknown): PaymentRecord[] {
  const rows = (data ?? []) as PaymentRow[]
  return rows.map(({ alumno_id, year, month, paid }) => ({ alumno_id, year, month, paid }))
}

// The !inner join forces every payment through the alumnos policy as well, so a
// row only comes back when its alumno is visible to the caller. Defence in
// depth: an early migration shipped payments' own RLS as `using (true)`, and
// this query is otherwise unfiltered.
//
// Only for views that genuinely span every alumno (dashboard debtors, client
// list badges). For a single alumno use getPaymentsForClient.
export async function getAllPayments(): Promise<PaymentRecord[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('payments').select(COLUMNS)
  return toRecords(data)
}

// One alumno's payments. The client detail page used to pull every payment row
// in the database — ~2,400 at 100 alumnos — to render a 24-month grid for one
// person. Served by the existing unique(alumno_id, year, month) index.
export async function getPaymentsForClient(alumnoId: string): Promise<PaymentRecord[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('payments').select(COLUMNS).eq('alumno_id', alumnoId)
  return toRecords(data)
}
