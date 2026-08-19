import { createClient } from '@/lib/supabase/server'
import type { Client, TrainingPlan } from '@/types'

// Read functions for Server Components. RLS scopes every row to the signed-in
// trainer, so these never take a user id — the database does the filtering.
//
// Neither list query selects `*`. `notes` and especially `rhythm_notes` are
// large free-text blocks (see DEFAULT_RHYTHM_NOTES — roughly a kilobyte each)
// that no list column renders, and every byte of them was being serialized into
// the RSC payload for all 100 alumnos on each visit. Each column list sits next
// to the type it produces so the two can't drift apart.

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
  const { data, error } = await supabase
    .from('alumnos')
    .select(SUMMARY_COLUMNS)
    .order('created_at', { ascending: false })

  if (error) throw new Error('Error al cargar los alumnos')
  return (data ?? []) as unknown as ClientSummary[]
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

  const [{ data: clientRows }, { data: plans }] = await Promise.all([
    supabase.from('alumnos').select(LIST_COLUMNS).order('created_at', { ascending: false }),
    // Only the fields the status badge and its "vence" line need.
    supabase
      .from('training_plans')
      .select('id, alumno_id, start_date, end_date')
      .order('start_date', { ascending: false }),
  ])

  const clients = (clientRows ?? []) as unknown as ClientListItem[]

  const plansByClient = new Map<string, PlanSummary[]>()
  for (const plan of (plans ?? []) as PlanSummary[]) {
    const arr = plansByClient.get(plan.alumno_id) ?? []
    arr.push(plan)
    plansByClient.set(plan.alumno_id, arr)
  }

  return clients.map((c) => ({ ...c, plans: plansByClient.get(c.id) ?? [] }))
}
