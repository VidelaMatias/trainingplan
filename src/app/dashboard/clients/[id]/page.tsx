import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays, ChevronLeft, CircleDollarSign, Pencil, Plus, Target, Timer } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { whatsappChatUrl } from '@/lib/whatsapp'
import { getClientById } from '@/modules/clients/queries'
import { getClientPlans } from '@/modules/plans/queries'
import { getPlanStatus } from '@/modules/plans/utils'
import { getPaymentsForClient } from '@/modules/payments/queries'
import { buildPaidIndex, getAllMonthsWithStatus } from '@/modules/payments/utils'
import { PaymentToggle } from '@/modules/payments/components/PaymentToggle'
import { PlansList } from '@/modules/plans/components/PlansList'
import { PLAN_STATUS, REFERENCE_DISTANCES } from '@/types/constants'

interface ClientDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = await params

  // All three reads are independent — awaiting the client first cost an extra
  // round trip of pure dead time on every visit.
  const [client, plans, payments] = await Promise.all([
    getClientById(id),
    getClientPlans(id),
    getPaymentsForClient(id),
  ])
  if (!client) notFound()

  const activePlan = plans.find((p) => getPlanStatus(p) === PLAN_STATUS.ACTIVE)
  const monthsWithStatus = getAllMonthsWithStatus(client.created_at, id, buildPaidIndex(payments))
  const marks = REFERENCE_DISTANCES.filter(({ key }) => client[key])
  const objectives = client.objectives ?? []
  // Normalizado acá y no en cada tarjeta: es el mismo alumno para todos los planes.
  const whatsappUrl = whatsappChatUrl(client.phone)

  return (
    // Sin tope de ancho: esta pantalla usa todo el espacio que le deja el
    // sidebar. La columna de datos se queda en 20rem y todo lo que sobra se lo
    // lleva la de planes, que es la que gana con el ancho (la grilla de la
    // semana deja de scrollear horizontal).
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/clients"
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-secondary-foreground"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">
                {client.first_name} {client.last_name}
              </h1>
              <Badge variant={client.active ? 'success' : 'neutral'}>
                {client.active ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
            {client.email && <p className="mt-0.5 text-sm text-muted-foreground">{client.email}</p>}
          </div>
        </div>
        <Link
          href={`/dashboard/clients/${id}/edit`}
          className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}
        >
          <Pencil />
          Editar alumno
        </Link>
      </div>

      {/* En pantallas anchas la ficha se parte en dos: a la izquierda los planes,
          que es donde el entrenador trabaja, y a la derecha los datos del alumno
          como referencia mientras arma la semana. Debajo de xl no entran dos
          columnas útiles, así que todo vuelve a apilarse. */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900">Planes de entrenamiento</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {plans.length === 0
                  ? 'Sin planes aún'
                  : `${plans.length} plan${plans.length !== 1 ? 'es' : ''} · ${activePlan ? '1 activo' : 'ninguno activo'}`}
              </p>
            </div>
            <Link
              href={`/dashboard/clients/${id}/plans/new`}
              className={cn(buttonVariants(), 'shrink-0')}
            >
              <Plus />
              Nuevo plan
            </Link>
          </div>

          {plans.length === 0 ? (
            <Card className="py-16 text-center">
              <CalendarDays className="mx-auto mb-3 size-10 text-slate-300" />
              <p className="font-medium text-muted-foreground">Sin planes de entrenamiento</p>
              <Link
                href={`/dashboard/clients/${id}/plans/new`}
                className={cn(buttonVariants({ size: 'sm' }), 'mt-4')}
              >
                Crear primer plan
              </Link>
            </Card>
          ) : (
            <PlansList
              plans={plans}
              clientId={id}
              clientRhythmNotes={client.rhythm_notes}
              whatsappUrl={whatsappUrl}
            />
          )}
        </section>

        {/* Los grids de esta columna vuelven a dos columnas en xl: ahí dejan de
            ocupar el ancho de la pantalla y pasan a vivir en 20rem. */}
        <div className="space-y-6">
          <Card className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 xl:grid-cols-2">
            <Field label="Teléfono" value={client.phone} />
            <Field label="Nacimiento" value={formatBirthDate(client.date_of_birth)} />
            <Field label="Edad" value={client.age === null ? null : `${client.age} años`} />
            <Field label="Peso" value={client.weight_kg === null ? null : `${client.weight_kg} kg`} />
            <Field label="Ciudad" value={client.city} />
            <Field label="Tiempo disponible" value={client.available_time} />
            <Field label="Medio disponible" value={client.available_medium} wide />
            <Field label="Días que entrena" value={client.training_days} wide />
            <Field label="Objetivo general" value={client.goal} wide />
            <Field label="Notas" value={client.notes} wide />
          </Card>

          {marks.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-secondary-foreground">
                <Timer className="size-4 text-muted-foreground" />
                Marcas referenciales
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2">
                {marks.map(({ key, label }) => (
                  <div key={key} className="rounded-lg border border-border px-3 py-2">
                    <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
                    <p className="mt-0.5 text-sm font-semibold text-secondary-foreground">
                      {client[key]}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {objectives.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-secondary-foreground">
                <Target className="size-4 text-muted-foreground" />
                Objetivos
              </h2>
              <ul className="space-y-2">
                {objectives.map((objective, i) => (
                  <li
                    key={`${objective.name}-${i}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lg border border-border px-3 py-2"
                  >
                    <span className="text-sm font-medium text-secondary-foreground">
                      {objective.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Deseado: {objective.target_time ?? '—'} · Obtenido:{' '}
                      {objective.achieved_time ?? '—'}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-secondary-foreground">
              <CircleDollarSign className="size-4 text-muted-foreground" />
              Historial de cuotas
            </h2>
            {/* Un mes por alumno desde el alta: con los años la grilla crece sin
                techo, así que en desktop scrollea dentro de la tarjeta. En
                mobile se deja fluir: la página ya scrollea. */}
            <div className="flex flex-wrap gap-2 md:max-h-56 md:overflow-y-auto md:overflow-x-hidden md:pr-1">
              {monthsWithStatus.map(({ year, month, label, paid, method }) => (
                <PaymentToggle
                  key={`${year}-${month}`}
                  alumnoId={id}
                  year={year}
                  month={month}
                  paid={paid}
                  method={method}
                  monthLabel={label}
                />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Every fact in the profile card renders the same way, and an empty one is
// simply left out — the grid closes up around it.
function Field({ label, value, wide }: { label: string; value: string | null; wide?: boolean }) {
  if (!value) return null
  return (
    <div className={wide ? 'col-span-2 sm:col-span-3 xl:col-span-2' : undefined}>
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm whitespace-pre-line text-secondary-foreground">{value}</p>
    </div>
  )
}

// Read at local noon like every other date in the app: parsing the bare ISO
// string gives UTC midnight, which renders as the previous day in Argentina.
function formatBirthDate(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-AR')
}
