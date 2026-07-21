import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { ClientForm } from '@/modules/clients/components/ClientForm'
import { createClientAction } from '@/modules/clients/actions'

export default function NewClientPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/dashboard/clients"
          className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-secondary-foreground"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nuevo alumno</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Completá los datos del alumno</p>
        </div>
      </div>

      <Card className="p-6">
        <ClientForm action={createClientAction} />
      </Card>
    </div>
  )
}
