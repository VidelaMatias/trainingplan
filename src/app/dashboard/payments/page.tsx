import Link from 'next/link'
import { ChevronLeft, Wallet } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { StatTile } from '@/components/ui/stat-tile'
import { cn } from '@/lib/utils'
import { getClients } from '@/modules/clients/queries'
import { getAllPayments } from '@/modules/payments/queries'
import {
  sharePercent,
  sumTotals,
  totalsByClient,
  totalsByMethod,
  totalsByMonth,
  type MethodTotals,
} from '@/modules/payments/utils'
import { ClientMethodsTable } from '@/modules/payments/components/ClientMethodsTable'
import { MethodSplitBar } from '@/modules/payments/components/MethodSplitBar'
import {
  METHOD_BUCKETS,
  METHOD_META,
  METHOD_REPORT_MONTHS,
  PAYMENT_METHOD_LIST,
  UNSPECIFIED_METHOD,
} from '@/types/constants'

// Reporte de cómo se cobraron las cuotas. Reusa las dos lecturas que ya hace el
// panel —alumnos y pagos—, así que no agrega consultas propias: getAllPayments
// devuelve sólo las cuotas cobradas, que es exactamente el universo del reporte.
export default async function PaymentMethodsPage() {
  const [clients, payments] = await Promise.all([getClients(), getAllPayments()])

  const totals = totalsByMethod(payments)
  const monthly = totalsByMonth(payments)
  const byClient = totalsByClient(payments, clients)
  // La leyenda del bloque mensual describe esos 12 meses, no todo el historial:
  // pasarle `totals` hacía que las barras sumaran 8 cuotas y el renglón de abajo
  // dijera 180, dos números contradictorios en la misma tarjeta.
  const monthlyTotals = sumTotals(monthly)
  // El pico del período fija la escala de las barras del desglose mensual: sin
  // un máximo común, un mes de 2 cuotas y otro de 30 se dibujaban igual.
  const monthlyPeak = Math.max(...monthly.map((m) => m.total), 0)

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-secondary-foreground"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Métodos de pago</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Cuotas cobradas según cómo se cobraron
          </p>
        </div>
      </div>

      {totals.total === 0 ? (
        <Card className="p-8 text-center">
          <Wallet className="mx-auto mb-3 size-8 text-slate-300" />
          <p className="text-sm font-medium text-secondary-foreground">
            Todavía no hay cuotas cobradas
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Marcá una cuota como pagada desde la ficha de un alumno y elegí si fue en efectivo o
            por transferencia.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
            {PAYMENT_METHOD_LIST.map((method) => (
              <StatTile
                key={method}
                label={METHOD_META[method].label}
                value={totals[method]}
                suffix={`${sharePercent(totals[method], totals.total)}%`}
                icon={METHOD_META[method].icon}
                valueClassName={METHOD_META[method].textClassName}
                iconClassName={METHOD_META[method].textClassName}
              />
            ))}
            {/* Sólo aparece cuando hay cuotas viejas sin método: en una base ya
                migrada del todo esta columna es siempre cero, y un tile con un
                cero permanente sólo suma ruido. */}
            {totals[UNSPECIFIED_METHOD] > 0 && (
              <StatTile
                label={METHOD_META[UNSPECIFIED_METHOD].label}
                value={totals[UNSPECIFIED_METHOD]}
                suffix={`${sharePercent(totals[UNSPECIFIED_METHOD], totals.total)}%`}
                icon={METHOD_META[UNSPECIFIED_METHOD].icon}
                valueClassName="text-muted-foreground"
              />
            )}
            <StatTile label="Total cobrado" value={totals.total} icon={Wallet} />
          </div>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-secondary-foreground">
              Reparto general
            </h2>
            <MethodSplitBar totals={totals} className="mb-3" />
            <Legend totals={totals} />
          </Card>

          <Card className="p-5">
            <h2 className="mb-1 text-sm font-semibold text-secondary-foreground">
              Últimos {METHOD_REPORT_MONTHS} meses
            </h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Cuotas cobradas por el mes al que corresponden, no por la fecha en que se registraron.
            </p>
            <ul className="space-y-2.5">
              {monthly.map((row) => (
                <li key={`${row.year}-${row.month}`} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-xs text-muted-foreground">
                    {row.label}
                  </span>
                  {/* El ancho del riel es proporcional al pico del período, y
                      dentro de él la barra apilada reparte ese mes. Así se leen
                      dos cosas a la vez: cuánto se cobró y de qué forma. */}
                  <div className="min-w-0 flex-1">
                    <div
                      style={{ width: monthlyPeak > 0 ? `${(row.total / monthlyPeak) * 100}%` : '0%' }}
                      className="min-w-0.5"
                    >
                      <MethodSplitBar totals={row} />
                    </div>
                  </div>
                  <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums text-secondary-foreground">
                    {row.total}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-border pt-3">
              <Legend totals={monthlyTotals} />
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-1 text-sm font-semibold text-secondary-foreground">Por alumno</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Sólo los alumnos con al menos una cuota cobrada.
            </p>
            <ClientMethodsTable rows={byClient} />
          </Card>
        </div>
      )}
    </div>
  )
}

// Misma referencia de color para todas las barras de la pantalla: sin ella, los
// segmentos verde y azul no dicen qué son. Recorre METHOD_BUCKETS para que un
// método nuevo aparezca acá sin tocar este archivo.
function Legend({ totals }: { totals: MethodTotals }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {METHOD_BUCKETS.map((bucket) =>
        // "Sin especificar" en cero no se muestra; los métodos reales sí, porque
        // un cero ahí es información ("este mes nadie pagó en efectivo").
        bucket === UNSPECIFIED_METHOD && totals[bucket] === 0 ? null : (
          <span key={bucket} className="inline-flex items-center gap-1.5">
            <span
              className={cn('size-2.5 shrink-0 rounded-full', METHOD_META[bucket].barClassName)}
              aria-hidden
            />
            {METHOD_META[bucket].label}
            <span className="font-semibold tabular-nums text-secondary-foreground">
              {totals[bucket]}
            </span>
            <span className="tabular-nums">({sharePercent(totals[bucket], totals.total)}%)</span>
          </span>
        ),
      )}
    </div>
  )
}
