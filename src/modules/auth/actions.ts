'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loginSchema, resetPasswordSchema } from '@/types/schemas'
import type { ActionResult } from '@/types'

export async function login(
  _prev: ActionResult<null>,
  formData: FormData,
): Promise<ActionResult<null>> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { data: null, error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) {
    return { data: null, error: 'Credenciales incorrectas. Verificá tu email y contraseña.' }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

// data === true signals a completed request, letting the form distinguish
// success from its initial (never-submitted, data === false) state.
export async function forgotPassword(
  _prev: ActionResult<boolean>,
  formData: FormData,
): Promise<ActionResult<boolean>> {
  const parsed = resetPasswordSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) return { data: null, error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/reset-password`,
  })
  if (error) return { data: null, error: 'No se pudo enviar el email. Verificá la dirección.' }

  return { data: true, error: null }
}

export async function logout(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
