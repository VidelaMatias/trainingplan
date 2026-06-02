'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSundayFrom, TrainingPlanWeek } from '@/types/training-plan'

export async function getClientPlans(clientId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('training_plans')
    .select('*, training_plan_weeks(*)')
    .eq('alumno_id', clientId)
    .order('start_date', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getPlan(planId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('training_plans')
    .select('*, training_plan_weeks(*)')
    .eq('id', planId)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function createPlanAction(clientId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const weeks: TrainingPlanWeek[] = JSON.parse(formData.get('weeks') as string)
  if (!weeks.length) return { error: 'El plan debe tener al menos una semana' }

  const startDate = weeks[0].week_start
  const endDate = getSundayFrom(weeks[weeks.length - 1].week_start)

  const { data: plan, error: planError } = await supabase
    .from('training_plans')
    .insert({
      alumno_id: clientId,
      created_by: user.id,
      title: formData.get('title') as string,
      start_date: startDate,
      end_date: endDate,
      notes: (formData.get('notes') as string) || null,
      active: true,
    })
    .select()
    .single()

  if (planError || !plan) return { error: planError?.message ?? 'Error al crear el plan' }

  const weekRows = weeks.map((w) => ({ ...w, plan_id: plan.id }))
  const { error: weeksError } = await supabase.from('training_plan_weeks').insert(weekRows)
  if (weeksError) return { error: weeksError.message }

  revalidatePath(`/dashboard/clients/${clientId}`)
  return { success: true }
}

export async function updatePlanAction(planId: string, clientId: string, formData: FormData) {
  const supabase = await createClient()

  const weeks: TrainingPlanWeek[] = JSON.parse(formData.get('weeks') as string)
  if (!weeks.length) return { error: 'El plan debe tener al menos una semana' }

  const startDate = weeks[0].week_start
  const endDate = getSundayFrom(weeks[weeks.length - 1].week_start)

  const { error: planError } = await supabase
    .from('training_plans')
    .update({
      title: formData.get('title') as string,
      start_date: startDate,
      end_date: endDate,
      notes: (formData.get('notes') as string) || null,
    })
    .eq('id', planId)

  if (planError) return { error: planError.message }

  // Replace all weeks
  await supabase.from('training_plan_weeks').delete().eq('plan_id', planId)
  const weekRows = weeks.map(({ id: _id, plan_id: _pid, ...rest }) => ({ ...rest, plan_id: planId }))
  const { error: weeksError } = await supabase.from('training_plan_weeks').insert(weekRows)
  if (weeksError) return { error: weeksError.message }

  revalidatePath(`/dashboard/clients/${clientId}`)
  return { success: true }
}

export async function deletePlanAction(planId: string, clientId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('training_plans').delete().eq('id', planId)
  if (error) return { error: error.message }

  revalidatePath(`/dashboard/clients/${clientId}`)
  return { success: true }
}
