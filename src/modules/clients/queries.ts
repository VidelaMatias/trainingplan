import { createClient } from '@/lib/supabase/server'
import { readAllRows, type PagedError } from '@/lib/supabase/paged'
import { todayISO } from '@/lib/date'
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

// Just enough of a plan to derive its status badge and "vence" date, plus the
// title the dashboard's expiring-plans panel shows.
export type PlanSummary = Pick<TrainingPlan, 'id' | 'title' | 'start_date' | 'end_date'>

// `plans` is NOT the alumno's whole history: every plan still running or
// upcoming, plus the most recent one when it has already finished (see below).
// Enough for the row badge and every list filter (FilterableClient), and
// nothing else should read it as "all plans".
export type ClientWithPlans = ClientListItem & { plans: PlanSummary[] }

const PLAN_SUMMARY_COLUMNS = 'id, title, start_date, end_date'

// De cada alumno viajan sólo los planes que deciden su fila: los que siguen
// corriendo o por empezar (end_date >= hoy) —de ahí salen el badge activo o
// próximo y los filtros «con plan activo» y «vencen esta semana»— y el más
// reciente de todos, que es el badge de quien ya no tiene ninguno en curso.
//
// Antes se bajaba el historial entero de training_plans para usar a lo sumo
// dos o tres planes por alumno: un plan por semana por alumno, sin techo, que
// después de un par de temporadas eran varias páginas de 1000 filas en cada
// visita a la lista. Los dos embeds resuelven eso en la misma consulta que los
// alumnos, con el índice training_plans(alumno_id).
const LIST_WITH_PLANS_COLUMNS =
  `${LIST_COLUMNS}, ` +
  `current_plans:training_plans(${PLAN_SUMMARY_COLUMNS}), ` +
  `latest_plan:training_plans(${PLAN_SUMMARY_COLUMNS})`

type ClientWithPlansRow = ClientListItem & {
  current_plans: PlanSummary[] | null
  latest_plan: PlanSummary[] | null
}

export async function getClientsWithPlans(): Promise<ClientWithPlans[]> {
  const supabase = await createClient()
  const today = todayISO()

  const rows = await readAllRows(
    ({ from, to, withCount }) =>
      supabase
        .from('alumnos')
        .select(LIST_WITH_PLANS_COLUMNS, withCount ? { count: 'exact' } : undefined)
        // Filtra el embed, no a los alumnos: quien no tiene planes en curso
        // igual vuelve, con la lista vacía.
        .gte('current_plans.end_date', today)
        .order('start_date', { referencedTable: 'current_plans', ascending: false })
        .order('id', { referencedTable: 'current_plans' })
        .order('start_date', { referencedTable: 'latest_plan', ascending: false })
        .order('id', { referencedTable: 'latest_plan' })
        .limit(1, { referencedTable: 'latest_plan' })
        .order('created_at', { ascending: false })
        .order('id')
        .range(from, to),
    (error) => clientsError(error, 'getClientsWithPlans'),
  )

  // Mismo orden que tenía el historial completo (start_date descendente): si el
  // último plan ya venció, es el de inicio más tardío y va primero.
  return (rows as unknown as ClientWithPlansRow[]).map(
    ({ current_plans, latest_plan, ...client }) => {
      const current = current_plans ?? []
      const latest = latest_plan?.[0]
      const plans =
        latest && !current.some((plan) => plan.id === latest.id) ? [latest, ...current] : current
      return { ...client, plans }
    },
  )
}
