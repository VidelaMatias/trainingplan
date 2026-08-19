'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/guards'
import { planIdSchema, planSchema, type PlanWeekInput } from '@/types/schemas'
import { addWeeks, clampWeeksToStart, getMondayOf, getSundayFrom } from '@/modules/plans/utils'
import type { ActionResult, TrainingPlanWeek } from '@/types'

// The week payload handed to the RPCs. week_number is deliberately absent: the
// database derives it from array order, so a crafted payload can't produce
// duplicate or out-of-order week numbers.
function toWeekRow(week: PlanWeekInput) {
  return {
    week_start: week.week_start,
    monday: week.monday,
    tuesday: week.tuesday,
    wednesday: week.wednesday,
    thursday: week.thursday,
    friday: week.friday,
    saturday: week.saturday,
    sunday: week.sunday,
  }
}

function parsePlanForm(formData: FormData) {
  let weeks: unknown
  try {
    weeks = JSON.parse((formData.get('weeks') as string) ?? '')
  } catch {
    return { success: false as const, message: 'Datos de semanas inválidos' }
  }

  const parsed = planSchema.safeParse({
    title: formData.get('title'),
    start_date: formData.get('start_date'),
    notes: formData.get('notes'),
    weeks,
  })

  if (!parsed.success) {
    return { success: false as const, message: parsed.error.issues[0].message }
  }

  const { start_date, weeks: parsedWeeks } = parsed.data

  // The start date has to sit inside the first week, otherwise the plan's range
  // and its week grid describe different things.
  if (getMondayOf(start_date) !== parsedWeeks[0].week_start) {
    return { success: false as const, message: 'La fecha de inicio no coincide con la primera semana' }
  }

  // Weeks must run strictly forward, one Monday apart. Without this the client
  // could send duplicate or backwards week_starts and derive an end_date that
  // lands before the start — a plan permanently stuck on "Vencido".
  const expected = parsedWeeks.map((_, i) => addWeeks(parsedWeeks[0].week_start, i))
  if (parsedWeeks.some((w, i) => w.week_start !== expected[i])) {
    return { success: false as const, message: 'Las semanas del plan no son consecutivas' }
  }

  return {
    success: true as const,
    data: { ...parsed.data, weeks: clampWeeksToStart(parsedWeeks, start_date) },
  }
}

export async function createPlanAction(
  clientId: string,
  _prev: ActionResult<null>,
  formData: FormData,
): Promise<ActionResult<null>> {
  const auth = await requireAuth()
  if (!auth) return { data: null, error: 'No autorizado' }

  const parsed = parsePlanForm(formData)
  if (!parsed.success) return { data: null, error: parsed.message }

  const { title, start_date: startDate, notes, weeks } = parsed.data
  const endDate = getSundayFrom(weeks[weeks.length - 1].week_start)

  const supabase = await createClient()

  // Plan and weeks land in one transaction. The RPC also re-checks that the
  // alumno belongs to the caller — training_plans' own RLS only looks at
  // created_by, so without that check a plan could be attached to another
  // trainer's alumno given its id.
  const { error } = await supabase.rpc('create_plan_with_weeks', {
    p_alumno_id: clientId,
    p_title: title,
    p_start_date: startDate,
    p_end_date: endDate,
    p_notes: notes,
    p_weeks: weeks.map(toWeekRow),
  })

  if (error) {
    return {
      data: null,
      error: error.code === '42501' ? 'No autorizado' : 'No se pudo crear el plan',
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/clients')
  revalidatePath(`/dashboard/clients/${clientId}`)
  redirect(`/dashboard/clients/${clientId}`)
}

export async function updatePlanAction(
  planId: string,
  clientId: string,
  _prev: ActionResult<null>,
  formData: FormData,
): Promise<ActionResult<null>> {
  const auth = await requireAuth()
  if (!auth) return { data: null, error: 'No autorizado' }

  const parsed = parsePlanForm(formData)
  if (!parsed.success) return { data: null, error: parsed.message }

  const { title, start_date: startDate, notes, weeks } = parsed.data
  const endDate = getSundayFrom(weeks[weeks.length - 1].week_start)

  const supabase = await createClient()

  // Update + full week rewrite in one transaction. This used to be a delete
  // followed by a separate insert: when the insert failed, the delete had
  // already committed and the plan lost every week irrecoverably. The RPC also
  // re-checks ownership, which folds the old existence query into the same
  // round trip.
  const { error } = await supabase.rpc('update_plan_with_weeks', {
    p_plan_id: planId,
    p_title: title,
    p_start_date: startDate,
    p_end_date: endDate,
    p_notes: notes,
    p_weeks: weeks.map(toWeekRow),
  })

  if (error) {
    return {
      data: null,
      error: error.code === '42501' ? 'No autorizado' : 'No se pudo actualizar el plan',
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/clients')
  revalidatePath(`/dashboard/clients/${clientId}`)
  redirect(`/dashboard/clients/${clientId}`)
}

// Loads one plan's week bodies on demand.
//
// Lives here rather than in queries.ts because the caller is a Client Component
// (PlanCard, when the coach expands a card) and a Server Action is the only way
// it can reach the database. Read-only, so it revalidates nothing.
//
// No ownership check is needed beyond the auth guard: training_plan_weeks' RLS
// admits a row only when its parent plan is `created_by` the caller, so another
// trainer's planId simply comes back empty.
export async function fetchPlanWeeks(planId: string): Promise<ActionResult<TrainingPlanWeek[]>> {
  const auth = await requireAuth()
  if (!auth) return { data: null, error: 'No autorizado' }

  const parsed = planIdSchema.safeParse(planId)
  if (!parsed.success) return { data: null, error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('training_plan_weeks')
    .select('week_number, week_start, monday, tuesday, wednesday, thursday, friday, saturday, sunday')
    .eq('plan_id', parsed.data)
    .order('week_number', { ascending: true })

  if (error) return { data: null, error: 'No se pudieron cargar las semanas' }
  return { data: (data ?? []) as unknown as TrainingPlanWeek[], error: null }
}

export async function deletePlanAction(
  planId: string,
  clientId: string,
): Promise<ActionResult<null>> {
  const auth = await requireAuth()
  if (!auth) return { data: null, error: 'No autorizado' }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('training_plans')
    .select('id')
    .eq('id', planId)
    .eq('created_by', auth.userId)
    .single()

  if (!existing) return { data: null, error: 'No autorizado' }

  const { error } = await supabase.from('training_plans').delete().eq('id', planId)
  if (error) return { data: null, error: 'No se pudo eliminar el plan' }

  // The dashboard's plan tiles read from every plan, so they go stale too.
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/clients')
  revalidatePath(`/dashboard/clients/${clientId}`)
  return { data: null, error: null }
}
