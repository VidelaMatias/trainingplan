'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createIsolatedClient } from '@/lib/supabase/isolated'
import { getFreshUser } from '@/lib/auth/guards'
import { changePasswordSchema, loginSchema, resetPasswordSchema } from '@/types/schemas'
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

  // Falling back to localhost in production would mail the trainer a reset link
  // they cannot open — and locking the sole user out is unrecoverable from
  // inside the app. Fail loudly instead.
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.NODE_ENV === 'production' ? null : 'http://localhost:3000')

  if (!siteUrl) {
    return { data: null, error: 'La app no está configurada para enviar emails. Contactá al administrador.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/reset-password`,
  })
  if (error) return { data: null, error: 'No se pudo enviar el email. Verificá la dirección.' }

  return { data: true, error: null }
}

// Spanish copy for the auth errors a password change can realistically hit.
// Anything else falls back to a generic message rather than surfacing the raw
// English text Supabase returns.
const CHANGE_PASSWORD_ERRORS: Record<string, string> = {
  same_password: 'La nueva contraseña debe ser distinta de la actual.',
  weak_password: 'La contraseña es demasiado débil. Elegí una más larga.',
  reauthentication_needed: 'Por seguridad, cerrá sesión y volvé a entrar antes de cambiarla.',
  session_expired: 'Tu sesión expiró. Volvé a iniciar sesión.',
  session_not_found: 'Tu sesión expiró. Volvé a iniciar sesión.',
}

// Password change for the already-authenticated trainer. Same `data === true`
// convention as forgotPassword: it separates a completed change from the
// initial (never-submitted, data === false) state without a second field.
export async function changePassword(
  _prev: ActionResult<boolean>,
  formData: FormData,
): Promise<ActionResult<boolean>> {
  // Fresh from the Auth server: the JWT's email can lag a change made outside
  // the app, and signing in with it would reject a correct password.
  const user = await getFreshUser()
  if (!user?.email) return { data: null, error: 'Tu sesión expiró. Volvé a iniciar sesión.' }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })
  if (!parsed.success) return { data: null, error: parsed.error.issues[0].message }

  // Supabase's updateUser() does not ask for the current password, so an open
  // session on an unlocked machine would be enough to lock the trainer out of
  // their own account. Verify it first by signing in on an isolated client:
  // doing it on the request-scoped server client would overwrite the live
  // session cookies.
  const verifier = createIsolatedClient()
  const { error: signInError } = await verifier.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  })
  // Revoke the throwaway session this check just created. 'local' is essential:
  // the default 'global' scope would sign the trainer out everywhere.
  await verifier.auth.signOut({ scope: 'local' })
  if (signInError) return { data: null, error: 'La contraseña actual no es correcta.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) {
    return {
      data: null,
      error:
        CHANGE_PASSWORD_ERRORS[error.code ?? ''] ??
        'No se pudo actualizar la contraseña. Intentá de nuevo.',
    }
  }

  // updateUser rotates the session cookies; refresh the shell so it renders
  // against the new session instead of the cached one.
  revalidatePath('/', 'layout')
  return { data: true, error: null }
}

export async function logout(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
