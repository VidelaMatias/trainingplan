'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PAGE_SIZE } from '@/types/constants'

export interface PaginationState<T> {
  /** Clamped page number, 1-based. */
  page: number
  pageCount: number
  pageItems: T[]
  total: number
  /** 1-based index of the first item on screen (0 when the list is empty). */
  from: number
  to: number
  setPage: (page: number) => void
}

// Client-side pagination over an already-loaded list: the lists in this app are
// small enough that the server sends them whole, so slicing here avoids a round
// trip per page.
export function usePagination<T>(items: T[], pageSize: number = PAGE_SIZE): PaginationState<T> {
  const [page, setPage] = useState(1)

  const total = items.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  // Searching or filtering can shrink the list under the current page — clamp
  // instead of rendering an empty page.
  const current = Math.min(page, pageCount)

  const pageItems = useMemo(
    () => items.slice((current - 1) * pageSize, current * pageSize),
    [items, current, pageSize],
  )

  return {
    page: current,
    pageCount,
    pageItems,
    total,
    from: total === 0 ? 0 : (current - 1) * pageSize + 1,
    to: Math.min(current * pageSize, total),
    setPage,
  }
}

interface PaginationProps {
  page: number
  pageCount: number
  total: number
  from: number
  to: number
  onPageChange: (page: number) => void
  /** Plural noun for the counter, e.g. "alumnos". */
  label?: string
  className?: string
}

export function Pagination({
  page,
  pageCount,
  total,
  from,
  to,
  onPageChange,
  label = 'resultados',
  className,
}: PaginationProps) {
  // A single page needs no controls: the counter alone would just be noise.
  if (pageCount <= 1) return null

  return (
    <nav
      aria-label="Paginación"
      className={cn('mt-3 flex flex-wrap items-center justify-between gap-2', className)}
    >
      <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
        {from}–{to} de {total} {label}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Página anterior"
        >
          <ChevronLeft />
        </Button>
        <span className="px-2 text-xs font-medium text-secondary-foreground">
          {page} / {pageCount}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Página siguiente"
        >
          <ChevronRight />
        </Button>
      </div>
    </nav>
  )
}
