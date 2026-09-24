import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { ClientForm } from '@/modules/clients/components/ClientForm'
import { createClientAction } from '@/modules/clients/actions'
import {
  readClientFilter,
  withClientFilter,
  type ClientFilterSearchParams,
} from '@/modules/clients/utils'

interface NewClientPageProps {
  // La vista filtrada de la lista desde la que se llegó, para volver a ella.
  searchParams: ClientFilterSearchParams
}

export default async function NewClientPage({
  searchParams,
}: NewClientPageProps): Promise<React.JSX.Element> {
  const filter = await readClientFilter(searchParams)
  const listHref = withClientFilter('/dashboard/clients', filter)

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={listHref}
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
        <ClientForm action={createClientAction.bind(null, filter)} cancelHref={listHref} />
      </Card>
    </div>
  )
}
