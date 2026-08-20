'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/guards'
import { clientSchema } from '@/types/schemas'
import type { ActionResult } from '@/types'

// The objectives editor repeats the same three input names once per row, so the
// three lists come back parallel: index i of each belongs to the same row. Rows
// left without a name are dropped rather than rejected — an empty row the coach
// added and never filled in shouldn't fail the whole submit.
function parseObjectives(formData: FormData): unknown[] {
  const names = formData.getAll('objective_name')
  const targets = formData.getAll('objective_target_time')
  const achieved = formData.getAll('objective_achieved_time')

  return names
    .map((name, i) => ({
      name,
      target_time: targets[i] ?? null,
      achieved_time: achieved[i] ?? null,
    }))
    .filter((o) => typeof o.name === 'string' && o.name.trim() !== '')
}

function parseClientForm(formData: FormData) {
  return clientSchema.safeParse({
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    date_of_birth: formData.get('date_of_birth'),
    age: formData.get('age'),
    weight_kg: formData.get('weight_kg'),
    city: formData.get('city'),
    available_medium: formData.get('available_medium'),
    available_time: formData.get('available_time'),
    training_days: formData.get('training_days'),
    pb_5k: formData.get('pb_5k'),
    pb_10k: formData.get('pb_10k'),
    pb_21k: formData.get('pb_21k'),
    pb_42k: formData.get('pb_42k'),
    objectives: parseObjectives(formData),
    goal: formData.get('goal'),
    notes: formData.get('notes'),
    rhythm_notes: formData.get('rhythm_notes'),
  })
}

export async function createClientAction(
  _prev: ActionResult<null>,
  formData: FormData,
): Promise<ActionResult<null>> {
  const auth = await requireAuth()
  if (!auth) return { data: null, error: 'No autorizado' }

  const parsed = parseClientForm(formData)
  if (!parsed.success) return { data: null, error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase
    .from('alumnos')
    .insert({ ...parsed.data, active: true, created_by: auth.userId })

  if (error) return { data: null, error: 'No se pudo crear el alumno' }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/clients')
  redirect('/dashboard/clients')
}

export async function updateClientAction(
  id: string,
  _prev: ActionResult<null>,
  formData: FormData,
): Promise<ActionResult<null>> {
  const auth = await requireAuth()
  if (!auth) return { data: null, error: 'No autorizado' }

  const parsed = parseClientForm(formData)
  if (!parsed.success) return { data: null, error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('alumnos')
    .select('id')
    .eq('id', id)
    .eq('created_by', auth.userId)
    .single()

  if (!existing) return { data: null, error: 'No autorizado' }

  const { error } = await supabase.from('alumnos').update(parsed.data).eq('id', id)
  if (error) return { data: null, error: 'No se pudo actualizar el alumno' }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/clients')
  revalidatePath(`/dashboard/clients/${id}`)
  redirect('/dashboard/clients')
}

export async function toggleClientActive(
  id: string,
  active: boolean,
): Promise<ActionResult<null>> {
  const auth = await requireAuth()
  if (!auth) return { data: null, error: 'No autorizado' }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('alumnos')
    .select('id')
    .eq('id', id)
    .eq('created_by', auth.userId)
    .single()

  if (!existing) return { data: null, error: 'No autorizado' }

  const { error } = await supabase.from('alumnos').update({ active }).eq('id', id)
  if (error) return { data: null, error: 'No se pudo actualizar el alumno' }

  // The dashboard counts only active alumnos and derives debtors from them, so
  // it goes stale on this toggle just as much as the list does.
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/clients')
  revalidatePath(`/dashboard/clients/${id}`)
  return { data: null, error: null }
}

export async function deleteClientAction(id: string): Promise<ActionResult<null>> {
  const auth = await requireAuth()
  if (!auth) return { data: null, error: 'No autorizado' }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('alumnos')
    .select('id')
    .eq('id', id)
    .eq('created_by', auth.userId)
    .single()

  if (!existing) return { data: null, error: 'No autorizado' }

  const { error } = await supabase.from('alumnos').delete().eq('id', id)
  if (error) return { data: null, error: 'No se pudo eliminar el alumno' }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/clients')
  return { data: null, error: null }
}
