import { createClient } from '@/lib/supabase/server'
import type { Client, TrainingPlan } from '@/types'

// Read functions for Server Components. RLS scopes every row to the signed-in
// trainer, so these never take a user id — the database does the filtering.

export async function getClients(): Promise<Client[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('alumnos')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error('Error al cargar los alumnos')
  return (data ?? []) as Client[]
}

export async function getClientById(id: string): Promise<Client | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('alumnos').select('*').eq('id', id).single()

  if (error) return null
  return data as Client
}

export type ClientWithPlans = Client & { plans: TrainingPlan[] }

// Clients plus the plans that belong to each, resolved in two queries and
// stitched in memory (avoids an N+1 across the client list).
export async function getClientsWithPlans(): Promise<ClientWithPlans[]> {
  const supabase = await createClient()

  const [clients, { data: plans }] = await Promise.all([
    getClients(),
    supabase
      .from('training_plans')
      .select('id, alumno_id, start_date, end_date, title, active, created_at, created_by, notes')
      .order('start_date', { ascending: false }),
  ])

  const plansByClient = new Map<string, TrainingPlan[]>()
  for (const plan of plans ?? []) {
    const arr = plansByClient.get(plan.alumno_id as string) ?? []
    arr.push(plan as unknown as TrainingPlan)
    plansByClient.set(plan.alumno_id as string, arr)
  }

  return clients.map((c) => ({ ...c, plans: plansByClient.get(c.id) ?? [] }))
}
