import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { PlanForm } from '@/modules/plans/components/PlanForm'
import { getClientById } from '@/modules/clients/queries'
import {
  readClientFilter,
  withClientFilter,
  type ClientFilterSearchParams,
} from '@/modules/clients/utils'
import { getPlan } from '@/modules/plans/queries'
import { updatePlanAction } from '@/modules/plans/actions'

interface EditPlanPageProps {
  params: Promise<{ id: string; planId: string }>
  // La vista filtrada de la lista de alumnos, para que la ficha siga volviendo a ella.
  searchParams: ClientFilterSearchParams
}

export default async function EditPlanPage({
  params,
  searchParams,
}: EditPlanPageProps): Promise<React.JSX.Element> {
  const [{ id, planId }, filter] = await Promise.all([params, readClientFilter(searchParams)])
  const [client, plan] = await Promise.all([getClientById(id), getPlan(planId)])

  // Both ids come from the URL independently: a plan of another alumno would
  // render under this one's name and rhythm notes, and back, cancel and the
  // save redirect would all land on a ficha where the plan isn't listed.
  if (!client || !plan || plan.alumno_id !== id) notFound()

  const clientHref = withClientFilter(`/dashboard/clients/${id}`, filter)

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={clientHref}
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
          action={updatePlanAction.bind(null, planId, id, filter)}
          cancelHref={clientHref}
          clientRhythmNotes={client.rhythm_notes}
          plan={plan}
        />
      </Card>
    </div>
  )
}
