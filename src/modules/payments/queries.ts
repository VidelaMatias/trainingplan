import { createClient } from '@/lib/supabase/server'
import { readAllRows, type PagedError } from '@/lib/supabase/paged'
import type { PaymentRecord } from '@/types'

const COLUMNS = 'alumno_id, year, month, paid, method, alumnos!inner(id)'

type PaymentRow = PaymentRecord & { alumnos: unknown }

// PostgREST says exactly what went wrong — a missing column, a rejected policy,
// a malformed embed — in `code`/`message`/`details`. The Error thrown to the UI
// only carries a Spanish line, so without logging the original first, a failure
// like `42703: column payments.method does not exist` (a migration that never
// ran) reaches the screen as an unexplained "Error al cargar los pagos".
function payloadError(error: PagedError, at: string): Error {
  console.error(`[payments] ${at} failed`, {
    code: error.code,
    message: error.message,
    details: error.details,
  })
  return new Error('Error al cargar los pagos')
}

function toRecords(data: unknown): PaymentRecord[] {
  const rows = (data ?? []) as PaymentRow[]
  return rows.map(({ alumno_id, year, month, paid, method }) => ({
    alumno_id,
    year,
    month,
    paid,
    method,
  }))
}

// The !inner join forces every payment through the alumnos policy as well, so a
// row only comes back when its alumno is visible to the caller. Defence in
// depth: an early migration shipped payments' own RLS as `using (true)`, and
// this query is otherwise unfiltered.
//
// Only for views that genuinely span every alumno (dashboard debtors, client
// list badges, payment methods report). For a single alumno use
// getPaymentsForClient.
export async function getAllPayments(): Promise<PaymentRecord[]> {
  const supabase = await createClient()

  const rows = await readAllRows(
    ({ from, to, withCount }) =>
      supabase
        .from('payments')
        .select(COLUMNS, withCount ? { count: 'exact' } : undefined)
        // Only paid rows carry information: buildPaidIndex drops the rest, and
        // unmarking a fee leaves a `paid = false` row behind.
        .eq('paid', true)
        // A free alumno is invisible to every payment view: the fees recorded
        // before they were freed stay in the table (so un-freeing restores the
        // history) but count nowhere — not in the report, not in its tile.
        .eq('alumnos.is_free', false)
        // (alumno_id, year, month) is unique, so this is a total order: paging
        // over it can neither skip nor repeat a row. Without it PostgREST
        // returned rows in heap order, and marking a fee paid rewrote that row
        // to the end of the heap — straight out of the first page, so the
        // alumno came back as deudor.
        .order('alumno_id')
        .order('year')
        .order('month')
        .range(from, to),
    // Silently returning [] here read as "nobody has paid anything", which is
    // the same screen as a real debt — the failure has to be visible.
    (error) => payloadError(error, 'getAllPayments'),
  )

  return toRecords(rows)
}

// One alumno's payments. The client detail page used to pull every payment row
// in the database — ~2,400 at 100 alumnos — to render a 24-month grid for one
// person. Served by the existing unique(alumno_id, year, month) index, and far
// below max-rows, so this one needs no paging.
export async function getPaymentsForClient(alumnoId: string): Promise<PaymentRecord[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payments')
    .select(COLUMNS)
    .eq('alumno_id', alumnoId)
    .eq('paid', true)

  if (error) throw payloadError(error, 'getPaymentsForClient')
  return toRecords(data)
}
