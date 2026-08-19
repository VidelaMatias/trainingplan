import { createClient } from '@/lib/supabase/server'
import type { PlanWithWeeks } from '@/types'

// A plan as the client detail list shows it: the header fields plus how many
// weeks it holds, but none of the day cells.
//
// PlanCard renders the week grid only once the coach expands a card, yet the
// full text of every week of every plan used to be serialized into the page's
// RSC payload regardless. For a long-standing client that is hundreds of
// kilobytes nobody reads. The bodies now load on expand via fetchPlanWeeks.
export interface PlanListItem {
  id: string
  title: string
  start_date: string
  end_date: string
  week_count: number
}

// Shape PostgREST returns for the embedded aggregate: `child(count)` comes back
// as a one-element array holding the count.
interface PlanCountRow {
  id: string
  title: string
  start_date: string
  end_date: string
  training_plan_weeks: { count: number }[] | null
}

export async function getClientPlans(clientId: string): Promise<PlanListItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('training_plans')
    .select('id, title, start_date, end_date, training_plan_weeks(count)')
    .eq('alumno_id', clientId)
    .order('start_date', { ascending: false })

  if (error) throw new Error('Error al cargar los planes')

  return ((data ?? []) as unknown as PlanCountRow[]).map((plan) => ({
    id: plan.id,
    title: plan.title,
    start_date: plan.start_date,
    end_date: plan.end_date,
    week_count: plan.training_plan_weeks?.[0]?.count ?? 0,
  }))
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
