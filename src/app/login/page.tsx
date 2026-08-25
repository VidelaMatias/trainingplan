'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { AlertCircle, Zap } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { Spinner } from '@/components/ui/Spinner'
import { login } from '@/modules/auth/actions'
import type { ActionResult } from '@/types'

const initialState: ActionResult<null> = { data: null, error: null }

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, initialState)

  return (
    <div className="flex min-h-dvh items-center justify-center bg-linear-to-br from-slate-900 to-slate-800">
      <div className="w-full max-w-md rounded-2xl bg-white px-8 py-10 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex size-16 items-center justify-center rounded-2xl bg-primary">
            <Zap className="size-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Training Planner</h1>
          <p className="mt-1 text-sm text-muted-foreground">Diego Simon Trail Run</p>
        </div>

        <form action={formAction} className="space-y-5">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" placeholder="profesor@ejemplo.com" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">Contraseña</Label>
            <PasswordInput id="password" name="password" required autoComplete="current-password" placeholder="••••••••" />
          </div>

          {state.error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {state.error}
            </div>
          )}

          <div className="text-right">
            <Link href="/forgot-password" className="text-sm text-primary hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending && <Spinner />}
            {isPending ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>
      </div>
    </div>
  )
}
