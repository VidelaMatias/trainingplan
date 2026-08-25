'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { Spinner } from '@/components/ui/Spinner'
import { updatePasswordSchema } from '@/types/schemas'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const parsed = updatePasswordSchema.safeParse({ password, confirmPassword: confirm })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }

    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError('No se pudo actualizar la contraseña. Intentá pedir un nuevo enlace.')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-linear-to-br from-slate-900 to-slate-800">
        <div className="w-full max-w-md rounded-2xl bg-white px-8 py-10 text-center shadow-2xl">
          <div className="mb-4 inline-flex size-16 items-center justify-center rounded-2xl bg-blue-100">
            <Spinner className="size-8 text-primary" />
          </div>
          <p className="text-muted-foreground">Verificando enlace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-linear-to-br from-slate-900 to-slate-800">
      <div className="w-full max-w-md rounded-2xl bg-white px-8 py-10 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex size-16 items-center justify-center rounded-2xl bg-primary">
            <Lock className="size-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Nueva contraseña</h1>
          <p className="mt-1 text-sm text-muted-foreground">Elegí una contraseña segura</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <Label htmlFor="password">Nueva contraseña</Label>
            <PasswordInput
              id="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="confirm">Confirmar contraseña</Label>
            <PasswordInput
              id="confirm"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Spinner />}
            {loading ? 'Guardando...' : 'Guardar contraseña'}
          </Button>
        </form>
      </div>
    </div>
  )
}
