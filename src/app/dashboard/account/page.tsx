import { redirect } from 'next/navigation'
import { Mail } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCurrentUser } from '@/lib/auth/guards'
import { ChangePasswordForm } from '@/modules/auth/components/ChangePasswordForm'

export default async function AccountPage() {
  // The dashboard layout already guards this route; the check here narrows the
  // nullable user for TypeScript and costs nothing (getCurrentUser is cached
  // per request).
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Mi cuenta</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Tus datos de acceso</p>
      </div>

      <Card className="mb-6">
        <CardHeader className="border-b border-border">
          <CardTitle>Email</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-sm text-secondary-foreground">
          <Mail className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{user.email}</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle>Cambiar contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  )
}
