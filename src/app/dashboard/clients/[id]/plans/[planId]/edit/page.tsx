import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { PlanForm } from '@/modules/plans/components/PlanForm'
import { getClientById } from '@/modules/clients/queries'
import { getPlan } from '@/modules/plans/queries'
import { updatePlanAction } from '@/modules/plans/actions'

interface EditPlanPageProps {
  params: Promise<{ id: string; planId: string }>
}

export default async function EditPlanPage({ params }: EditPlanPageProps) {
  const { id, planId } = await params
  const [client, plan] = await Promise.all([getClientById(id), getPlan(planId)])

  if (!client || !plan) notFound()

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
          <h1 className="text-2xl font-bold text-slate-900">Editar plan</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {client.first_name} {client.last_name} · {plan.title}
          </p>
        </div>
      </div>

      <Card className="p-6">
        <PlanForm
          action={updatePlanAction.bind(null, planId, id)}
          cancelHref={`/dashboard/clients/${id}`}
          clientRhythmNotes={client.rhythm_notes}
          plan={plan}
        />
      </Card>
    </div>
  )
}
