'use client'

import Link from 'next/link'

import { Pagination, usePagination } from '@/components/ui/pagination'
import { cn } from '@/lib/utils'
import { MethodSplitBar } from '@/modules/payments/components/MethodSplitBar'
import { sharePercent, type ClientMethodRow } from '@/modules/payments/utils'
import { METHOD_BUCKETS, METHOD_META, PAYMENT_METHODS } from '@/types/constants'

// Con qué forma de pago cobra cada alumno. Ordenado en el servidor por cantidad
// de cuotas; acá sólo se pagina, igual que el resto de los listados.
//
// Las columnas salen de METHOD_BUCKETS y sus etiquetas de METHOD_META: acá
// estaban escritas a mano ("Efectivo", "Transferencia") mientras la de al lado
// venía de constants, así que renombrar un método dejaba esta tabla con el
// texto viejo.
export function ClientMethodsTable({ rows }: { rows: ClientMethodRow[] }) {
  const { page, pageCount, pageItems, total, from, to, setPage } = usePagination(rows)

  return (
    <div>
      {/* En desktop, una tabla con una columna por método. En mobile no entra:
          cada alumno pasa a ser una fila con su barra y los números debajo. */}
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium uppercase text-muted-foreground">
              <th className="pb-2 font-medium">Alumno</th>
              {METHOD_BUCKETS.map((bucket) => (
                <th key={bucket} className="pb-2 text-right font-medium">
                  {METHOD_META[bucket].label}
                </th>
              ))}
              <th className="pb-2 text-right font-medium">Total</th>
              <th className="w-40 pb-2 pl-4 font-medium">Reparto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pageItems.map((row) => (
              <tr key={row.id}>
                <td className="py-2 pr-3">
                  <Link
                    href={`/dashboard/clients/${row.id}`}
                    className="font-medium text-secondary-foreground hover:text-primary hover:underline"
                  >
                    {row.name}
                  </Link>
                </td>
                {METHOD_BUCKETS.map((bucket) => (
                  <td
                    key={bucket}
                    className={cn('py-2 text-right tabular-nums', METHOD_META[bucket].textClassName)}
                  >
                    {row[bucket]}
                  </td>
                ))}
                <td className="py-2 text-right font-semibold tabular-nums text-secondary-foreground">
                  {row.total}
                </td>
                <td className="py-2 pl-4">
                  <MethodSplitBar totals={row} size="sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border md:hidden">
        {pageItems.map((row) => (
          <li key={row.id} className="py-3">
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <Link
                href={`/dashboard/clients/${row.id}`}
                className="min-w-0 truncate text-sm font-medium text-secondary-foreground hover:text-primary"
              >
                {row.name}
              </Link>
              <span className="shrink-0 text-xs text-muted-foreground">
                {row.total} cuota{row.total !== 1 ? 's' : ''}
              </span>
            </div>
            <MethodSplitBar totals={row} size="sm" className="mb-1.5" />
            <p className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
              {METHOD_BUCKETS.map((bucket) =>
                // En mobile el renglón es angosto: un método en cero no aporta.
                row[bucket] === 0 ? null : (
                  <span key={bucket} className={METHOD_META[bucket].textClassName}>
                    {METHOD_META[bucket].label} {row[bucket]}
                  </span>
                ),
              )}
              <span>{sharePercent(row[PAYMENT_METHODS.CASH], row.total)}% efectivo</span>
            </p>
          </li>
        ))}
      </ul>

      <Pagination
        page={page}
        pageCount={pageCount}
        total={total}
        from={from}
        to={to}
        onPageChange={setPage}
        label="alumnos"
        className="border-t border-border pt-3"
      />
    </div>
  )
}
