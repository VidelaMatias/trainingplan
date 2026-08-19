'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/guards'
import { clientSchema } from '@/types/schemas'
import type { ActionResult } from '@/types'

function parseClientForm(formData: FormData) {
  return clientSchema.safeParse({
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    date_of_birth: formData.get('date_of_birth'),
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
