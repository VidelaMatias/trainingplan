'use client'

import { useActionState, useEffect, useRef } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { Spinner } from '@/components/ui/Spinner'
import { changePassword } from '@/modules/auth/actions'
import type { ActionResult } from '@/types'

// data === false is the initial, never-submitted state; true means the last
// submit actually changed the password.
const initialState: ActionResult<boolean> = { data: false, error: null }

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(changePassword, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  // The fields are uncontrolled, so they keep their values after a successful
  // submit — clear them instead of leaving the new password sitting in the DOM.
  useEffect(() => {
    if (state.data) formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      <div className="space-y-1">
        <Label htmlFor="currentPassword">
          Contraseña actual <span className="text-destructive">*</span>
        </Label>
        <PasswordInput
          id="currentPassword"
          name="currentPassword"
          required
          autoComplete="current-password"
          placeholder="••••••••"
        />
      </div>

      <div className="space-y-1 border-t border-border pt-5">
        <Label htmlFor="password">
          Nueva contraseña <span className="text-destructive">*</span>
        </Label>
        <PasswordInput
          id="password"
          name="password"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="••••••••"
        />
        <p className="text-xs text-muted-foreground">Al menos 6 caracteres.</p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="confirmPassword">
          Confirmar contraseña <span className="text-destructive">*</span>
        </Label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="••••••••"
        />
      </div>

      {state.error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {state.error}
        </div>
      )}

      {state.data && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="size-4 shrink-0" />
          Contraseña actualizada correctamente.
        </div>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending && <Spinner />}
        {isPending ? 'Guardando...' : 'Cambiar contraseña'}
      </Button>
    </form>
  )
}
