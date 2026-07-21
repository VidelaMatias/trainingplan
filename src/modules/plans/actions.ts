'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/guards'
import { planSchema, type PlanWeekInput } from '@/types/schemas'
import { clampWeeksToStart, getMondayOf, getSundayFrom } from '@/modules/plans/utils'
import type { ActionResult } from '@/types'

// Strips client-only id/plan_id and pins each row to its plan, yielding exactly
// the columns the training_plan_weeks table expects.
function toWeekRow(week: PlanWeekInput, planId: string) {
  return {
    plan_id: planId,
    week_number: week.week_number,
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

  // The plan's own RLS only checks created_by, never that alumno_id is ours, so
  // without this the action would happily attach a plan to another trainer's
  // alumno given its id.
  const { data: alumno } = await supabase
    .from('alumnos')
    .select('id')
    .eq('id', clientId)
    .eq('created_by', auth.userId)
    .single()

  if (!alumno) return { data: null, error: 'No autorizado' }

  const { data: plan, error: planError } = await supabase
    .from('training_plans')
    .insert({
      alumno_id: clientId,
      created_by: auth.userId,
      title,
      start_date: startDate,
      end_date: endDate,
      notes,
      active: true,
    })
    .select('id')
    .single()

  if (planError || !plan) return { data: null, error: 'No se pudo crear el plan' }

  const weekRows = weeks.map((w) => toWeekRow(w, plan.id))
  const { error: weeksError } = await supabase.from('training_plan_weeks').insert(weekRows)
  if (weeksError) return { data: null, error: 'No se pudieron guardar las semanas' }

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

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('training_plans')
    .select('id')
    .eq('id', planId)
    .eq('created_by', auth.userId)
    .single()

  if (!existing) return { data: null, error: 'No autorizado' }

  const parsed = parsePlanForm(formData)
  if (!parsed.success) return { data: null, error: parsed.message }

  const { title, start_date: startDate, notes, weeks } = parsed.data
  const endDate = getSundayFrom(weeks[weeks.length - 1].week_start)

  const { error: planError } = await supabase
    .from('training_plans')
    .update({ title, start_date: startDate, end_date: endDate, notes })
    .eq('id', planId)

  if (planError) return { data: null, error: 'No se pudo actualizar el plan' }

  // Weeks are fully rewritten: drop the old set and reinsert the current one.
  await supabase.from('training_plan_weeks').delete().eq('plan_id', planId)
  const weekRows = weeks.map((w) => toWeekRow(w, planId))
  const { error: weeksError } = await supabase.from('training_plan_weeks').insert(weekRows)
  if (weeksError) return { data: null, error: 'No se pudieron guardar las semanas' }

  revalidatePath(`/dashboard/clients/${clientId}`)
  redirect(`/dashboard/clients/${clientId}`)
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

  revalidatePath(`/dashboard/clients/${clientId}`)
  return { data: null, error: null }
}
