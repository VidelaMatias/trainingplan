'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, Search, Users, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Pagination, usePagination } from '@/components/ui/pagination'
import { SortButton, useSort, type SortColumn } from '@/components/ui/sortable'
import { formatNumericDate, formatShortDate } from '@/lib/date'
import { compareText } from '@/lib/text'
import { cn } from '@/lib/utils'
import { ClientActions } from '@/modules/clients/components/ClientActions'
import {
  compareByName,
  matchesTokens,
  nameHaystack,
  searchTokens,
  withClientFilter,
} from '@/modules/clients/utils'
import { owedSummary } from '@/modules/payments/utils'
import { useClientFilter } from '@/modules/clients/useClientFilter'
import { PLAN_LIST_BADGE, PLAN_SORT_ORDER } from '@/types/constants'

// Flat view model built on the server. Everything the two layouts render is
// already derived, so this component only filters and orders.
export interface ClientRow {
  id: string
  first_name: string
  last_name: string
  email: string | null
  date_of_birth: string | null
  goal: string | null
  active: boolean
  planKey: keyof typeof PLAN_LIST_BADGE
  planEndDate: string | null
  owedLabels: string[]
}

type SortKey = 'name' | 'email' | 'goal' | 'plan' | 'status' | 'owed'

// Las tarjetas de mobile no tienen encabezados que clickear, así que las mismas
// columnas vuelven como chips — sólo las que la tarjeta muestra: email y
// objetivo no se dibujan ahí, y ofrecer ordenar por algo invisible no ayuda.
const MOBILE_SORTS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Nombre' },
  { key: 'plan', label: 'Plan' },
  { key: 'status', label: 'Estado' },
  { key: 'owed', label: 'Cuota' },
]

// Las fechas son ISO (YYYY-MM-DD) con ceros a la izquierda, así que comparar los
// strings byte a byte ya es comparar cronológicamente. Nada de localeCompare:
// paga colación Unicode completa por lo que es un `<`, y cómo ordena el guión
// separador lo define la tabla de colación, que cambia entre versiones de ICU.
function compareIso(a: string | null, b: string | null): number {
  const left = a ?? ''
  const right = b ?? ''
  return left < right ? -1 : left > right ? 1 : 0
}

interface ClientsListProps {
  rows: ClientRow[]
  /**
   * Columna con la que abre la lista. La vista de cuotas pendientes la usa para
   * arrancar por deuda: ahí todos deben al menos un mes, y lo que se necesita
   * saber es quién debe más de uno.
   */
  initialSort?: SortKey
}

export function ClientsList({ rows, initialSort }: ClientsListProps): React.JSX.Element {
  // Vista filtrada en la que se abrió la lista: la ficha y la edición la llevan
  // en su URL para volver a ella.
  const filter = useClientFilter()
  const [query, setQuery] = useState('')

  // Names are normalized once for the whole list, not on every keystroke.
  const indexed = useMemo(
    () => rows.map((row) => ({ row, haystack: nameHaystack(row) })),
    [rows],
  )

  const filtered = useMemo(() => {
    const tokens = searchTokens(query)
    const matched = tokens.length
      ? indexed.filter(({ haystack }) => matchesTokens(haystack, tokens))
      : indexed
    return matched.map(({ row }) => row)
  }, [indexed, query])

  // Memoizado porque useSort lo tiene en sus dependencias: un objeto nuevo por
  // render volvería a ordenar la lista entera cada vez.
  const columns = useMemo<Record<SortKey, SortColumn<ClientRow>>>(
    () => ({
      name: { compare: compareByName },
      // Sin email y sin objetivo no son "el string vacío": se hunden al fondo
      // en las dos direcciones (ver isBlank) en vez de encabezar el A→Z.
      email: {
        compare: (a, b) => compareText(a.email ?? '', b.email ?? ''),
        isBlank: (row) => !row.email,
      },
      goal: {
        compare: (a, b) => compareText(a.goal ?? '', b.goal ?? ''),
        isBlank: (row) => !row.goal,
      },
      // Por urgencia (activo → próximo → vencido → sin plan) y, dentro de cada
      // grupo, por fecha de vencimiento: entre dos planes activos el que vence
      // antes es el que hay que renovar primero.
      plan: {
        compare: (a, b) =>
          PLAN_SORT_ORDER[a.planKey] - PLAN_SORT_ORDER[b.planKey] ||
          compareIso(a.planEndDate, b.planEndDate),
      },
      // Ascendente sobre el booleano es "inactivos primero", así que el primer
      // clic va al revés: quien está entrenando encabeza la lista.
      status: { compare: (a, b) => Number(a.active) - Number(b.active), initial: 'desc' },
      // Meses adeudados, del que más debe al que está al día.
      owed: {
        compare: (a, b) => a.owedLabels.length - b.owedLabels.length,
        initial: 'desc',
      },
    }),
    [],
  )

  // El nombre desempata siempre en A→Z: sin él, los treinta alumnos "Al día"
  // quedaban en el orden que devolviera el sort del navegador.
  const { sorted, sortKey, direction, toggle, ariaSort } = useSort(filtered, columns, {
    tiebreak: compareByName,
    initialKey: initialSort,
  })
  const { page, pageCount, pageItems, total, from, to, setPage } = usePagination(sorted)

  // Cualquier cambio de búsqueda u orden vuelve a la primera página: seguir en
  // la 4 de un listado que se acaba de reordenar no significa nada.
  function sortBy(key: SortKey) {
    toggle(key)
    setPage(1)
  }

  function search(value: string) {
    setQuery(value)
    setPage(1)
  }

  const searching = query.trim() !== ''

  return (
    <div>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(event) => search(event.target.value)}
          placeholder="Buscar por nombre o apellido..."
          aria-label="Buscar alumno por nombre o apellido"
          // The native search affordance is suppressed in favour of the
          // button below, so there is only ever one clear control.
          className="pl-9 pr-9 [&::-webkit-search-cancel-button]:appearance-none"
        />
        {searching && (
          <button
            type="button"
            onClick={() => search('')}
            aria-label="Limpiar búsqueda"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-secondary-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {searching && (
        <p className="mb-3 text-sm text-muted-foreground" role="status" aria-live="polite">
          {filtered.length === 0
            ? 'Sin resultados'
            : `${filtered.length} de ${rows.length} ${rows.length === 1 ? 'alumno' : 'alumnos'}`}
        </p>
      )}

      {filtered.length === 0 ? (
        <Card className="py-16 text-center">
          <Users className="mx-auto mb-3 size-10 text-slate-300" />
          <p className="font-medium text-muted-foreground">No se encontraron alumnos</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ninguno coincide con «{query.trim()}»
          </p>
          <Button variant="secondary" size="sm" onClick={() => search('')} className="mt-4">
            Limpiar búsqueda
          </Button>
        </Card>
      ) : (
        <>
          <div
            role="group"
            aria-label="Ordenar la lista"
            className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground md:hidden"
          >
            <span className="font-medium uppercase" aria-hidden>
              Ordenar
            </span>
            {MOBILE_SORTS.map((option) => (
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

          {/* Mobile: card list. Sin tope de alto a propósito — el paginado ya
              deja 10 tarjetas, y encerrarlas en su propio scroll obliga a
              scrollear dentro de una página que ya scrollea. */}
          <div className="space-y-3 md:hidden">
            {pageItems.map((row) => {
              const planBadge = PLAN_LIST_BADGE[row.planKey]
              return (
                <Card key={row.id} className="p-4">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <Link
                      href={withClientFilter(`/dashboard/clients/${row.id}`, filter)}
                      className="font-semibold leading-tight text-slate-900 transition hover:text-primary"
                    >
                      {row.first_name} {row.last_name}
                    </Link>
                    <ClientActions client={{ id: row.id, active: row.active }} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={planBadge.variant}>{planBadge.label}</Badge>
                    <Badge variant={row.active ? 'success' : 'neutral'}>
                      {row.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                    {row.owedLabels.length === 0 ? (
                      <Badge variant="success">Al día</Badge>
                    ) : (
                      <Badge variant="danger">
                        Debe {row.owedLabels.length}{' '}
                        {row.owedLabels.length === 1 ? 'mes' : 'meses'}
                      </Badge>
                    )}
                  </div>
                  {row.owedLabels.length > 0 && (
                    <OwedMonths labels={row.owedLabels} className="mt-1.5 text-xs text-red-400" />
                  )}
                </Card>
              )
            })}
          </div>

          {/* Desktop: table. El alto está topeado y el encabezado queda fijo,
              así la fila que se está mirando siempre tiene sus columnas a la vista. */}
          <Card className="hidden overflow-hidden md:block">
            <div className="max-h-[70vh] overflow-y-auto overflow-x-hidden">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-muted">
                  <tr className="border-b border-slate-100">
                    <th
                      scope="col"
                      aria-sort={ariaSort('name')}
                      className="px-5 py-3 text-left font-semibold text-secondary-foreground"
                    >
                      <SortButton
                        active={sortKey === 'name'}
                        direction={direction}
                        onClick={() => sortBy('name')}
                      >
                        Nombre
                      </SortButton>
                    </th>
                    <th
                      scope="col"
                      aria-sort={ariaSort('email')}
                      className="px-5 py-3 text-left font-semibold text-secondary-foreground"
                    >
                      <SortButton
                        active={sortKey === 'email'}
                        direction={direction}
                        onClick={() => sortBy('email')}
                      >
                        Email
                      </SortButton>
                    </th>
                    <th
                      scope="col"
                      aria-sort={ariaSort('goal')}
                      className="hidden px-5 py-3 text-left font-semibold text-secondary-foreground lg:table-cell"
                    >
                      <SortButton
                        active={sortKey === 'goal'}
                        direction={direction}
                        onClick={() => sortBy('goal')}
                      >
                        Objetivo
                      </SortButton>
                    </th>
                    <th
                      scope="col"
                      aria-sort={ariaSort('plan')}
                      className="px-5 py-3 text-left font-semibold text-secondary-foreground"
                    >
                      <SortButton
                        active={sortKey === 'plan'}
                        direction={direction}
                        onClick={() => sortBy('plan')}
                      >
                        Plan
                      </SortButton>
                    </th>
                    <th
                      scope="col"
                      aria-sort={ariaSort('status')}
                      className="px-5 py-3 text-left font-semibold text-secondary-foreground"
                    >
                      <SortButton
                        active={sortKey === 'status'}
                        direction={direction}
                        onClick={() => sortBy('status')}
                      >
                        Estado
                      </SortButton>
                    </th>
                    <th
                      scope="col"
                      aria-sort={ariaSort('owed')}
                      className="px-5 py-3 text-left font-semibold text-secondary-foreground"
                    >
                      <SortButton
                        active={sortKey === 'owed'}
                        direction={direction}
                        onClick={() => sortBy('owed')}
                      >
                        Cuota
                      </SortButton>
                    </th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageItems.map((row) => {
                    const planBadge = PLAN_LIST_BADGE[row.planKey]
                    return (
                      <tr key={row.id} className="transition hover:bg-muted">
                        <td className="px-5 py-3.5">
                          <Link
                            href={withClientFilter(`/dashboard/clients/${row.id}`, filter)}
                            className="font-medium text-slate-900 transition hover:text-primary"
                          >
                            {row.first_name} {row.last_name}
                          </Link>
                          {row.date_of_birth && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {formatNumericDate(row.date_of_birth)}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-secondary-foreground">
                          {row.email ?? <span className="text-slate-300">—</span>}
                        </td>
                        <td className="hidden max-w-xs truncate px-5 py-3.5 text-secondary-foreground lg:table-cell">
                          {row.goal ?? <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={planBadge.variant}>{planBadge.label}</Badge>
                          {row.planEndDate && row.planKey !== 'none' && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              vence {formatShortDate(row.planEndDate)}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={row.active ? 'success' : 'neutral'}>
                            {row.active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          {row.owedLabels.length === 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                              <Check className="size-3" />
                              Al día
                            </span>
                          ) : (
                            <div>
                              <span className="text-xs font-semibold text-destructive">
                                Debe {row.owedLabels.length}{' '}
                                {row.owedLabels.length === 1 ? 'mes' : 'meses'}
                              </span>
                              <OwedMonths
                                labels={row.owedLabels}
                                className="mt-0.5 max-w-40 text-xs leading-tight text-red-400"
                              />
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <ClientActions client={{ id: row.id, active: row.active }} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Pagination
            page={page}
            pageCount={pageCount}
            total={total}
            from={from}
            to={to}
            onPageChange={setPage}
            label="alumnos"
          />
        </>
      )}
    </div>
  )
}

// Los meses adeudados: resumidos, y desplegables cuando el resumen deja algunos
// afuera. El detalle no puede vivir en un `title` — la tarjeta que lo muestra es
// md:hidden y en un teléfono no hay hover, así que ahí era inalcanzable. Como
// botón funciona en las dos vistas, y la fila de la tabla sólo crece si el
// entrenador lo pide.
function OwedMonths({ labels, className }: { labels: string[]; className?: string }) {
  const [expanded, setExpanded] = useState(false)

  const summary = owedSummary(labels)
  const full = labels.join(', ')
  // Cuando el resumen ya los nombra a todos no hay nada que desplegar: un botón
  // que no cambia nada al tocarlo es peor que un texto.
  if (summary === full) return <p className={className}>{full}</p>

  return (
    <button
      type="button"
      onClick={() => setExpanded((current) => !current)}
      aria-expanded={expanded}
      className={cn(
        'block text-left underline decoration-dotted underline-offset-2 transition hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      {expanded ? full : summary}
    </button>
  )
}
