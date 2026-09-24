import { NextRequest, NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth/guards'
import { getPlanForExport } from '@/modules/plans/queries'
import { buildPlanWorkbook, planFilename } from '@/modules/plans/export'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
): Promise<NextResponse> {
  const { planId } = await params

  // A read: the local session check is enough (see requireAuth).
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const plan = await getPlanForExport(planId, user.id)
  if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // The alumnos embed is filtered by its own RLS: it comes back null when the
  // plan points at someone else's alumno. Treat that as not-found rather than
  // dereferencing null further down.
  if (!plan.alumnos) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const uint8 = await buildPlanWorkbook({
    title: plan.title,
    start_date: plan.start_date,
    end_date: plan.end_date,
    clientName: `${plan.alumnos.first_name} ${plan.alumnos.last_name}`,
    rhythmNotes: plan.alumnos.rhythm_notes,
    weeks: plan.training_plan_weeks ?? [],
  })

  return new NextResponse(uint8, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${planFilename(plan.title)}"`,
    },
  })
}
