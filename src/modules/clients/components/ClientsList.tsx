'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowDown, ArrowUp, ArrowUpDown, Check, Search, Users, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { ClientActions } from '@/modules/clients/components/ClientActions'
import {
  compareByName,
  matchesTokens,
  nameHaystack,
  searchTokens,
} from '@/modules/clients/utils'
import { PLAN_LIST_BADGE } from '@/types/constants'

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

type SortDirection = 'asc' | 'desc'

export function ClientsList({ rows }: { rows: ClientRow[] }) {
  const [query, setQuery] = useState('')
  // null keeps the order the server sent (newest first).
  const [sort, setSort] = useState<SortDirection | null>(null)

  // Names are normalized once for the whole list, not on every keystroke.
  const indexed = useMemo(
    () => rows.map((row) => ({ row, haystack: nameHaystack(row) })),
    [rows],
  )

  const visible = useMemo(() => {
    const tokens = searchTokens(query)
    const matched = tokens.length
      ? indexed.filter(({ haystack }) => matchesTokens(haystack, tokens))
      : indexed

    // Always a fresh array (map), so sorting in place is safe.
    const result = matched.map(({ row }) => row)
    if (!sort) return result

    return result.sort((a, b) => (sort === 'asc' ? compareByName(a, b) : compareByName(b, a)))
  }, [indexed, query, sort])

  // none → A-Z → Z-A → none, so the coach can get the original order back.
  function cycleSort() {
    setSort((current) => (current === null ? 'asc' : current === 'asc' ? 'desc' : null))
  }

  const searching = query.trim() !== ''

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre o apellido..."
            aria-label="Buscar alumno por nombre o apellido"
            // The native search affordance is suppressed in favour of the
            // button below, so there is only ever one clear control.
            className="pl-9 pr-9 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {searching && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-secondary-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <Button variant="outline" onClick={cycleSort} className="shrink-0 justify-start sm:justify-center">
          <SortIcon sort={sort} />
          {sort === null ? 'Ordenar por nombre' : sort === 'asc' ? 'Nombre: A → Z' : 'Nombre: Z → A'}
        </Button>
      </div>

      {searching && (
        <p className="mb-3 text-sm text-muted-foreground" role="status" aria-live="polite">
          {visible.length === 0
            ? 'Sin resultados'
            : `${visible.length} de ${rows.length} ${rows.length === 1 ? 'alumno' : 'alumnos'}`}
        </p>
      )}

      {visible.length === 0 ? (
        <Card className="py-16 text-center">
          <Users className="mx-auto mb-3 size-10 text-slate-300" />
          <p className="font-medium text-muted-foreground">No se encontraron alumnos</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ninguno coincide con «{query.trim()}»
          </p>
          <Button variant="secondary" size="sm" onClick={() => setQuery('')} className="mt-4">
            Limpiar búsqueda
          </Button>
        </Card>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="space-y-3 md:hidden">
            {visible.map((row) => {
              const planBadge = PLAN_LIST_BADGE[row.planKey]
              return (
                <Card key={row.id} className="p-4">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <Link
                      href={`/dashboard/clients/${row.id}`}
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
                    <p className="mt-1.5 text-xs text-red-400">{row.owedLabels.join(', ')}</p>
                  )}
                </Card>
              )
            })}
          </div>

          {/* Desktop: table */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-muted">
                  <th
                    scope="col"
                    aria-sort={
                      sort === 'asc' ? 'ascending' : sort === 'desc' ? 'descending' : 'none'
                    }
                    className="px-5 py-3 text-left font-semibold text-secondary-foreground"
                  >
                    <button
                      type="button"
                      onClick={cycleSort}
                      className="inline-flex items-center gap-1.5 rounded transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Nombre
                      <SortIcon sort={sort} className="size-3.5" />
                    </button>
                  </th>
                  <th scope="col" className="px-5 py-3 text-left font-semibold text-secondary-foreground">
                    Email
                  </th>
                  <th
                    scope="col"
                    className="hidden px-5 py-3 text-left font-semibold text-secondary-foreground lg:table-cell"
                  >
                    Objetivo
                  </th>
                  <th scope="col" className="px-5 py-3 text-left font-semibold text-secondary-foreground">
                    Plan
                  </th>
                  <th scope="col" className="px-5 py-3 text-left font-semibold text-secondary-foreground">
                    Estado
                  </th>
                  <th scope="col" className="px-5 py-3 text-left font-semibold text-secondary-foreground">
                    Cuota
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((row) => {
                  const planBadge = PLAN_LIST_BADGE[row.planKey]
                  return (
                    <tr key={row.id} className="transition hover:bg-muted">
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/dashboard/clients/${row.id}`}
                          className="font-medium text-slate-900 transition hover:text-primary"
                        >
                          {row.first_name} {row.last_name}
                        </Link>
                        {row.date_of_birth && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {fmtDate(row.date_of_birth)}
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
                            vence {fmtShort(row.planEndDate)}
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
                            <p className="mt-0.5 max-w-40 text-xs leading-tight text-red-400">
                              {row.owedLabels.join(', ')}
                            </p>
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
          </Card>
        </>
      )}
    </div>
  )
}

function SortIcon({ sort, className }: { sort: SortDirection | null; className?: string }) {
  const Icon = sort === null ? ArrowUpDown : sort === 'asc' ? ArrowUp : ArrowDown
  return <Icon className={cn(className)} aria-hidden />
}

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-AR')
}

function fmtShort(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  })
}
