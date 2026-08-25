'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { AlertCircle, CheckCircle2, KeyRound } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/Spinner'
import { forgotPassword } from '@/modules/auth/actions'
import type { ActionResult } from '@/types'

const initialState: ActionResult<boolean> = { data: false, error: null }

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(forgotPassword, initialState)
  const sent = state.data === true

  return (
    <div className="flex min-h-dvh items-center justify-center bg-linear-to-br from-slate-900 to-slate-800">
      <div className="w-full max-w-md rounded-2xl bg-white px-8 py-10 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex size-16 items-center justify-center rounded-2xl bg-primary">
            <KeyRound className="size-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Recuperar contraseña</h1>
          <p className="mt-1 text-sm text-muted-foreground">Te enviamos un enlace al email</p>
        </div>

        {sent ? (
          <div className="space-y-4 text-center">
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              <CheckCircle2 className="size-4 shrink-0" />
              Revisá tu email para continuar.
            </div>
            <Link href="/login" className="block text-sm text-primary hover:underline">
              Volver al login
            </Link>
          </div>
        ) : (
          <form action={formAction} className="space-y-5">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" placeholder="profesor@ejemplo.com" />
            </div>

            {state.error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                {state.error}
              </div>
            )}

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending && <Spinner />}
              {isPending ? 'Enviando...' : 'Enviar enlace'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="text-primary hover:underline">
                Volver al login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
