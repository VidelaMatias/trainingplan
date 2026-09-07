'use client'

import { useMemo } from 'react'
import Link from 'next/link'

import { Pagination, usePagination } from '@/components/ui/pagination'
import { SortButton, useSort, type SortColumn } from '@/components/ui/sortable'
import { compareText } from '@/lib/text'
import { cn } from '@/lib/utils'
import { MethodSplitBar } from '@/modules/payments/components/MethodSplitBar'
import { compareCashShare, sharePercent, type ClientMethodRow } from '@/modules/payments/utils'
import {
  METHOD_BUCKETS,
  METHOD_META,
  PAYMENT_METHODS,
  type MethodBucket,
} from '@/types/constants'

// Con qué forma de pago cobra cada alumno. Llega ordenado del servidor por
// cantidad de cuotas; acá se puede reordenar por cualquier columna y se pagina,
// igual que el resto de los listados.
//
// Las columnas salen de METHOD_BUCKETS y sus etiquetas de METHOD_META: acá
// estaban escritas a mano ("Efectivo", "Transferencia") mientras la de al lado
// venía de constants, así que renombrar un método dejaba esta tabla con el
// texto viejo.

// "Reparto" no es un número propio: la barra dibuja la mezcla del alumno, y lo
// que se ordena es cuánto de esa mezcla es efectivo.
type SortKey = 'name' | MethodBucket | 'total' | 'share'

// Mismo orden que la tabla, para que los chips de mobile ofrezcan exactamente
// las columnas que el desktop deja clickear.
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Alumno' },
  ...METHOD_BUCKETS.map((bucket) => ({ key: bucket, label: METHOD_META[bucket].label })),
  { key: 'total', label: 'Total' },
  { key: 'share', label: '% efectivo' },
]

function byName(a: ClientMethodRow, b: ClientMethodRow): number {
  return compareText(a.name, b.name)
}

function cashShare(row: ClientMethodRow): number {
  return sharePercent(row[PAYMENT_METHODS.CASH], row.total)
}


export function ClientMethodsTable({ rows }: { rows: ClientMethodRow[] }) {
  // Memoizado porque useSort lo tiene en sus dependencias: un objeto nuevo por
  // render volvería a ordenar la lista cada vez.
  const columns = useMemo<Record<SortKey, SortColumn<ClientMethodRow>>>(() => {
    const byMethod = Object.fromEntries(
      METHOD_BUCKETS.map((bucket) => [
        bucket,
        { compare: (a, b) => a[bucket] - b[bucket], initial: 'desc' } satisfies SortColumn<ClientMethodRow>,
      ]),
    ) as Record<MethodBucket, SortColumn<ClientMethodRow>>

    return {
      name: { compare: byName },
      ...byMethod,
      total: { compare: (a, b) => a.total - b.total, initial: 'desc' },
      share: { compare: compareCashShare, initial: 'desc' },
    }
  }, [])

  // El nombre desempata siempre en A→Z: sin él, dos alumnos con las mismas
  // cuotas quedaban en el orden que devolviera el sort del navegador.
  const { sorted, sortKey, direction, toggle, ariaSort } = useSort(rows, columns, {
    tiebreak: byName,
  })
  const { page, pageCount, pageItems, total, from, to, setPage } = usePagination(sorted)

  // Reordenar y seguir en la página 4 no significa nada: la fila que se estaba
  // mirando ya no está ahí.
  function sortBy(key: SortKey) {
    toggle(key)
    setPage(1)
  }

  return (
    <div>
      {/* En desktop, una tabla con una columna por método. En mobile no entra:
          cada alumno pasa a ser una fila con su barra y los números debajo. */}
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium uppercase text-muted-foreground">
              <th scope="col" aria-sort={ariaSort('name')} className="pb-2 font-medium">
                <SortButton
                  active={sortKey === 'name'}
                  direction={direction}
                  onClick={() => sortBy('name')}
                >
                  Alumno
                </SortButton>
              </th>
              {METHOD_BUCKETS.map((bucket) => (
                <th
                  key={bucket}
                  scope="col"
                  aria-sort={ariaSort(bucket)}
                  className="pb-2 text-right font-medium"
                >
                  <SortButton
                    active={sortKey === bucket}
                    direction={direction}
                    onClick={() => sortBy(bucket)}
                  >
                    {METHOD_META[bucket].label}
                  </SortButton>
                </th>
              ))}
              <th scope="col" aria-sort={ariaSort('total')} className="pb-2 text-right font-medium">
                <SortButton
                  active={sortKey === 'total'}
                  direction={direction}
                  onClick={() => sortBy('total')}
                >
                  Total
                </SortButton>
              </th>
              <th scope="col" aria-sort={ariaSort('share')} className="w-40 pb-2 pl-4 font-medium">
                <SortButton
                  active={sortKey === 'share'}
                  direction={direction}
                  onClick={() => sortBy('share')}
                >
                  Reparto
                  <span className="sr-only"> (ordenar por porcentaje de efectivo)</span>
                </SortButton>
              </th>
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

      {/* Mobile no tiene encabezados que clickear, así que las mismas columnas
          vuelven como chips. */}
      <div
        role="group"
        aria-label="Ordenar la tabla"
        className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pb-3 text-xs text-muted-foreground md:hidden"
      >
        <span className="font-medium uppercase" aria-hidden>
          Ordenar
        </span>
        {SORT_OPTIONS.map((option) => (
          <SortButton
            key={option.key}
            active={sortKey === option.key}
            direction={direction}
            onClick={() => sortBy(option.key)}
            standalone
          >
            {option.label}
          </SortButton>
        ))}
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
              <span>{cashShare(row)}% efectivo</span>
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
