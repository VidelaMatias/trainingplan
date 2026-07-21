import { createClient } from '@/lib/supabase/server'
import type { PlanWithWeeks } from '@/types'

export async function getClientPlans(clientId: string): Promise<PlanWithWeeks[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('training_plans')
    .select('*, training_plan_weeks(*)')
    .eq('alumno_id', clientId)
    .order('start_date', { ascending: false })

  if (error) throw new Error('Error al cargar los planes')
  return (data ?? []) as PlanWithWeeks[]
}

export async function getPlan(planId: string): Promise<PlanWithWeeks | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('training_plans')
    .select('*, training_plan_weeks(*)')
    .eq('id', planId)
    .single()

  if (error) return null
  return data as PlanWithWeeks
}

export interface PlanForExport extends PlanWithWeeks {
  // Null when the plan points at an alumno the caller cannot see: the embed is
  // filtered by the alumnos policy independently of the plan's own.
  alumnos: { first_name: string; last_name: string; rhythm_notes: string | null } | null
}

// Plan joined with its owning alumno, scoped to the given trainer. Used by the
// Excel export route handler, which distinguishes 401 (no session) from 404.
export async function getPlanForExport(
  planId: string,
  userId: string,
): Promise<PlanForExport | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('training_plans')
    .select('*, alumnos(first_name, last_name, rhythm_notes), training_plan_weeks(*)')
    .eq('id', planId)
    .eq('created_by', userId)
    .single()

  if (error || !data) return null
  return data as unknown as PlanForExport
}
