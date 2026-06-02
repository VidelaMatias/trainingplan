'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ClientInsert } from '@/types/client'

export async function getClients() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('alumnos')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function createClientAction(formData: FormData) {
  const supabase = await createClient()

  const payload: ClientInsert = {
    first_name: formData.get('first_name') as string,
    last_name: formData.get('last_name') as string,
    email: (formData.get('email') as string) || null,
    phone: (formData.get('phone') as string) || null,
    date_of_birth: (formData.get('date_of_birth') as string) || null,
    goal: (formData.get('goal') as string) || null,
    notes: (formData.get('notes') as string) || null,
    rhythm_notes: (formData.get('rhythm_notes') as string) || null,
    active: true,
  }

  const { error } = await supabase.from('alumnos').insert(payload)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/clients')
  return { success: true }
}

export async function updateClientAction(id: string, formData: FormData) {
  const supabase = await createClient()

  const payload = {
    first_name: formData.get('first_name') as string,
    last_name: formData.get('last_name') as string,
    email: (formData.get('email') as string) || null,
    phone: (formData.get('phone') as string) || null,
    date_of_birth: (formData.get('date_of_birth') as string) || null,
    goal: (formData.get('goal') as string) || null,
    notes: (formData.get('notes') as string) || null,
    rhythm_notes: (formData.get('rhythm_notes') as string) || null,
  }

  const { error } = await supabase.from('alumnos').update(payload).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/clients')
  return { success: true }
}

export async function toggleClientActive(id: string, active: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('alumnos').update({ active }).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/clients')
  return { success: true }
}

export async function deleteClientAction(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('alumnos').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/clients')
  return { success: true }
}

export async function setPayment(alumnoId: string, year: number, month: number, paid: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('payments')
    .upsert(
      { alumno_id: alumnoId, year, month, paid, paid_at: paid ? new Date().toISOString() : null },
      { onConflict: 'alumno_id,year,month' }
    )
  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/clients')
  revalidatePath(`/dashboard/clients/${alumnoId}`)
  return { success: true }
}

export async function getAllPayments() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('payments')
    .select('alumno_id, year, month, paid')
  return (data ?? []) as { alumno_id: string; year: number; month: number; paid: boolean }[]
}
