'use client'

import { useCallback, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

import { cn } from '@/lib/utils'

export type SortDirection = 'asc' | 'desc'

export interface SortColumn<T> {
  /** Comparador ascendente; el descendente sale de invertirlo. */
  compare: (a: T, b: T) => number
  /** Dirección del primer clic. Los números se leen mejor de mayor a menor. */
  initial?: SortDirection
  /**
   * Filas sin dato en esta columna. Van al fondo en las dos direcciones: si
   * entraran en el comparador, ordenar por email A→Z arrancaría con la tanda de
   * alumnos sin email, que es justo lo que nadie está buscando.
   */
  isBlank?: (row: T) => boolean
}

export interface SortOptions<T, K extends string> {
  /**
   * Se aplica cuando la columna empata, siempre en el mismo sentido: si el
   * desempate viviera dentro de `compare`, invertir la dirección lo invertiría
   * también y dos filas iguales saltarían de lugar al cambiar de orden.
   */
  tiebreak?: (a: T, b: T) => number
  /**
   * Columna con la que abre la vista, en su dirección inicial. Sigue siendo
   * estado del usuario: el primer clic sobre esa misma columna la invierte y el
   * segundo vuelve al orden del servidor, igual que cualquier otra.
   */
  initialKey?: K
}

export interface SortState<T, K extends string> {
  sorted: T[]
  /** null = el orden con el que llegó la lista. */
  sortKey: K | null
  direction: SortDirection
  toggle: (key: K) => void
  ariaSort: (key: K) => 'ascending' | 'descending' | 'none'
}

// Ordenamiento en cliente sobre una lista ya cargada — hermano de usePagination
// y por el mismo motivo: los listados de esta app llegan enteros del servidor,
// así que ordenar acá evita una vuelta más.
//
// El ciclo de cada columna es inicial → contraria → sin orden, para poder volver
// al orden que armó el servidor, que no es arbitrario (los alumnos vienen por
// cantidad de cuotas cobradas).
//
// `columns` entra en las dependencias del memo: pasarlo memoizado desde el
// llamador, o la lista se reordena en cada render.
export function useSort<T, K extends string>(
  items: T[],
  columns: Record<K, SortColumn<T>>,
  { tiebreak, initialKey }: SortOptions<T, K> = {},
): SortState<T, K> {
  const [sort, setSort] = useState<{ key: K; direction: SortDirection } | null>(() =>
    initialKey ? { key: initialKey, direction: columns[initialKey].initial ?? 'asc' } : null,
  )

  const sorted = useMemo(() => {
    if (!sort) return items
    const { compare, isBlank } = columns[sort.key]
    // Copia: `items` es la lista del padre y ordenar in place la mutaría.
    return [...items].sort((a, b) => {
      const blankA = isBlank?.(a) ?? false
      const blankB = isBlank?.(b) ?? false
      if (blankA !== blankB) return blankA ? 1 : -1
      // Dos vacíos no tienen nada que comparar, pero sí un orden entre sí.
      const primary = blankA ? 0 : sort.direction === 'asc' ? compare(a, b) : compare(b, a)
      return primary || (tiebreak ? tiebreak(a, b) : 0)
    })
  }, [items, sort, columns, tiebreak])

  const toggle = useCallback(
    (key: K) => {
      setSort((current) => {
        const initial = columns[key].initial ?? 'asc'
        if (!current || current.key !== key) return { key, direction: initial }
        if (current.direction === initial) {
          return { key, direction: initial === 'asc' ? 'desc' : 'asc' }
        }
        return null
      })
    },
    [columns],
  )

  const ariaSort = useCallback(
    (key: K): 'ascending' | 'descending' | 'none' => {
      if (!sort || sort.key !== key) return 'none'
      return sort.direction === 'asc' ? 'ascending' : 'descending'
    },
    [sort],
  )

  return {
    sorted,
    sortKey: sort?.key ?? null,
    direction: sort?.direction ?? 'asc',
    toggle,
    ariaSort,
  }
}

interface SortButtonProps {
  active: boolean
  direction: SortDirection
  onClick: () => void
  children: React.ReactNode
  className?: string
  /**
   * Fuera de una tabla. Dentro de un `<th>` el estado del orden lo lleva
   * `aria-sort`; suelto —los chips de mobile— no hay dónde ponerlo, y sin esto
   * un lector de pantalla oye cuatro botones idénticos sin saber cuál está
   * ordenando ni en qué sentido: la flecha es aria-hidden y el color no se lee.
   */
  standalone?: boolean
}

const DIRECTION_LABEL: Record<SortDirection, string> = {
  asc: 'orden ascendente',
  desc: 'orden descendente',
}

// Encabezado clickeable. La flecha doble en gris marca "se puede ordenar por
// acá" sin gritar tanto como la columna que efectivamente ordena.
export function SortButton({
  active,
  direction,
  onClick,
  children,
  className,
  standalone,
}: SortButtonProps) {
  const Icon = !active ? ArrowUpDown : direction === 'asc' ? ArrowUp : ArrowDown

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active && 'text-primary',
        className,
      )}
    >
      {children}
      {standalone && (
        <span className="sr-only">
          {active ? `, ${DIRECTION_LABEL[direction]}` : ', sin ordenar'}
        </span>
      )}
      <Icon className={cn('size-3', active ? 'opacity-100' : 'opacity-40')} aria-hidden />
    </button>
  )
}
