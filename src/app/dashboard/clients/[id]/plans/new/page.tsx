import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { PlanForm } from '@/modules/plans/components/PlanForm'
import { getClientById } from '@/modules/clients/queries'
import { createPlanAction } from '@/modules/plans/actions'

interface NewPlanPageProps {
  params: Promise<{ id: string }>
}

export default async function NewPlanPage({ params }: NewPlanPageProps) {
  const { id } = await params
  const client = await getClientById(id)
  if (!client) notFound()

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/dashboard/clients/${id}`}
          className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-secondary-foreground"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nuevo plan</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {client.first_name} {client.last_name}
          </p>
        </div>
      </div>

      <Card className="p-6">
        <PlanForm
          action={createPlanAction.bind(null, id)}
          cancelHref={`/dashboard/clients/${id}`}
          clientRhythmNotes={client.rhythm_notes}
        />
      </Card>
    </div>
  )
}
