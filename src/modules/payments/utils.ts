import { MONTH_NAMES } from '@/types/constants'
import type { PaymentRecord } from '@/types'

export interface OwedMonth {
  year: number
  month: number
  label: string
}

export interface MonthStatus extends OwedMonth {
  paid: boolean
}

export function monthLabel(year: number, month: number): string {
  const name = MONTH_NAMES[month - 1]
  const now = new Date()
  return year !== now.getFullYear() ? `${name} ${year}` : name
}

// Walks every month from the client's signup month through the current month,
// yielding the ones with no recorded payment. Shared by the dashboard debtor
// list and the per-client "al día / debe N meses" badges.
export function getOwedMonths(
  createdAt: string,
  alumnoId: string,
  payments: PaymentRecord[],
): OwedMonth[] {
  return buildMonthTimeline(createdAt, alumnoId, payments).filter((m) => !m.paid)
}

// Same timeline as getOwedMonths, but every month carries its paid flag and the
// list runs most-recent-first — drives the per-client payment history grid.
export function getAllMonthsWithStatus(
  createdAt: string,
  alumnoId: string,
  payments: PaymentRecord[],
): MonthStatus[] {
  return buildMonthTimeline(createdAt, alumnoId, payments).reverse()
}

function buildMonthTimeline(
  createdAt: string,
  alumnoId: string,
  payments: PaymentRecord[],
): MonthStatus[] {
  const now = new Date()
  const paidSet = new Set(
    payments
      .filter((p) => p.alumno_id === alumnoId && p.paid)
      .map((p) => `${p.year}-${p.month}`),
  )

  const cursor = new Date(createdAt)
  cursor.setDate(1)
  cursor.setHours(0, 0, 0, 0)

  const result: MonthStatus[] = []
  while (
    cursor.getFullYear() < now.getFullYear() ||
    (cursor.getFullYear() === now.getFullYear() && cursor.getMonth() <= now.getMonth())
  ) {
    const y = cursor.getFullYear()
    const m = cursor.getMonth() + 1
    result.push({ year: y, month: m, label: monthLabel(y, m), paid: paidSet.has(`${y}-${m}`) })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return result
}
