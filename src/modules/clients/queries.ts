import { createClient } from '@/lib/supabase/server'
import { readAllRows, type PagedError } from '@/lib/supabase/paged'
import type { Client, TrainingPlan } from '@/types'

// Read functions for Server Components. RLS scopes every row to the signed-in
// trainer, so these never take a user id — the database does the filtering.
//
// Neither list query selects `*`. `notes` and especially `rhythm_notes` are
// large free-text blocks (see DEFAULT_RHYTHM_NOTES — roughly a kilobyte each)
// that no list column renders, and every byte of them was being serialized into
// the RSC payload for all 100 alumnos on each visit. Each column list sits next
// to the type it produces so the two can't drift apart.

// Mismo tratamiento que payments: sin paginar, PostgREST corta en max-rows y no
// avisa. Acá la consecuencia es peor que una lista incompleta — totalsByClient
// descarta los pagos de los alumnos que no llegaron, así que el reporte de
// métodos de pago sumaba menos que su propio tile de total.
function clientsError(error: PagedError, at: string): Error {
  console.error(`[clients] ${at} failed`, {
    code: error.code,
    message: error.message,
    details: error.details,
  })
  return new Error('Error al cargar los alumnos')
}

const SUMMARY_COLUMNS = 'id, created_at, first_name, last_name, active'
const LIST_COLUMNS = `${SUMMARY_COLUMNS}, email, date_of_birth, goal`

// What aggregate views need: dashboard counts and the debtor list.
export type ClientSummary = Pick<
  Client,
  'id' | 'created_at' | 'first_name' | 'last_name' | 'active'
>

// The clients table additionally shows contact and goal columns.
export type ClientListItem = ClientSummary & Pick<Client, 'email' | 'date_of_birth' | 'goal'>

export async function getClients(): Promise<ClientSummary[]> {
  const supabase = await createClient()

  const rows = await readAllRows(
    ({ from, to, withCount }) =>
      supabase
        .from('alumnos')
        .select(SUMMARY_COLUMNS, withCount ? { count: 'exact' } : undefined)
        // `id` desempata: created_at puede repetirse en un alta masiva y sin un
        // orden total el paginado saltea o repite filas entre páginas.
        .order('created_at', { ascending: false })
        .order('id')
        .range(from, to),
    (error) => clientsError(error, 'getClients'),
  )

  return rows as unknown as ClientSummary[]
}

// The one place a whole alumno is genuinely needed: the detail and edit pages
// render notes, phone, goal and rhythm_notes.
export async function getClientById(id: string): Promise<Client | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('alumnos').select('*').eq('id', id).single()

  if (error) return null
  return data as Client
}

// Just enough of a plan to derive its status badge and "vence" date.
export type PlanSummary = Pick<TrainingPlan, 'id' | 'alumno_id' | 'start_date' | 'end_date'>

export type ClientWithPlans = ClientListItem & { plans: PlanSummary[] }

// Clients plus the plans that belong to each, resolved in two queries and
// stitched in memory (avoids an N+1 across the client list).
export async function getClientsWithPlans(): Promise<ClientWithPlans[]> {
  const supabase = await createClient()

  const [clientRows, plans] = await Promise.all([
    readAllRows(
      ({ from, to, withCount }) =>
        supabase
          .from('alumnos')
          .select(LIST_COLUMNS, withCount ? { count: 'exact' } : undefined)
          .order('created_at', { ascending: false })
          .order('id')
          .range(from, to),
      (error) => clientsError(error, 'getClientsWithPlans.alumnos'),
    ),
    // Only the fields the status badge and its "vence" line need. Se pagina por
    // el mismo motivo: un plan por semana por alumno cruza max-rows mucho antes
    // que la tabla de alumnos, y truncarla dejaba alumnos con plan activo
    // mostrando "Sin plan".
    readAllRows(
      ({ from, to, withCount }) =>
        supabase
          .from('training_plans')
          .select('id, alumno_id, start_date, end_date', withCount ? { count: 'exact' } : undefined)
          .order('start_date', { ascending: false })
          .order('id')
          .range(from, to),
      (error) => clientsError(error, 'getClientsWithPlans.plans'),
    ),
  ])

  const clients = clientRows as unknown as ClientListItem[]

  const plansByClient = new Map<string, PlanSummary[]>()
  for (const plan of plans as unknown as PlanSummary[]) {
    const arr = plansByClient.get(plan.alumno_id) ?? []
    arr.push(plan)
    plansByClient.set(plan.alumno_id, arr)
  }

  return clients.map((c) => ({ ...c, plans: plansByClient.get(c.id) ?? [] }))
}
