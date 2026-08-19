import { MONTH_NAMES } from '@/types/constants'
import { instantToISODate, todayISO, yearMonthOf } from '@/lib/date'
import type { PaymentRecord } from '@/types'

export interface OwedMonth {
  year: number
  month: number
  label: string
}

export interface MonthStatus extends OwedMonth {
  paid: boolean
}

// Paid months grouped by alumno, as a set of "year-month" keys.
//
// Built once per render and shared across every client. The previous shape
// re-filtered the whole payments array inside each call, so the clients list
// was O(clients × payments) — ~240k comparisons at 100 alumnos.
export type PaidIndex = ReadonlyMap<string, ReadonlySet<string>>

export function buildPaidIndex(payments: PaymentRecord[]): PaidIndex {
  const index = new Map<string, Set<string>>()
  for (const p of payments) {
    if (!p.paid) continue
    let months = index.get(p.alumno_id)
    if (!months) {
      months = new Set()
      index.set(p.alumno_id, months)
    }
    months.add(`${p.year}-${p.month}`)
  }
  return index
}

export function monthLabel(year: number, month: number, currentYear: number): string {
  const name = MONTH_NAMES[month - 1]
  return year !== currentYear ? `${name} ${year}` : name
}

// Walks every month from the client's signup month through the current month,
// yielding the ones with no recorded payment. Shared by the dashboard debtor
// list and the per-client "al día / debe N meses" badges.
export function getOwedMonths(
  createdAt: string,
  alumnoId: string,
  paid: PaidIndex,
): OwedMonth[] {
  return buildMonthTimeline(createdAt, alumnoId, paid).filter((m) => !m.paid)
}

// Same timeline as getOwedMonths, but every month carries its paid flag and the
// list runs most-recent-first — drives the per-client payment history grid.
export function getAllMonthsWithStatus(
  createdAt: string,
  alumnoId: string,
  paid: PaidIndex,
): MonthStatus[] {
  return buildMonthTimeline(createdAt, alumnoId, paid).reverse()
}

function buildMonthTimeline(
  createdAt: string,
  alumnoId: string,
  paid: PaidIndex,
): MonthStatus[] {
  const paidMonths = paid.get(alumnoId)

  // "Now" comes from the trainer's timezone, not the server's clock: on a UTC
  // server the last hours of Dec 31 already read as the next year, which would
  // bill an extra month a day early.
  const { year: nowYear, month: nowMonth } = yearMonthOf(todayISO())

  // An unparseable created_at yields NaN, and every comparison against NaN is
  // false — so the loop never runs and the timeline comes back empty.
  const { year: startYear, month: startMonth } = yearMonthOf(instantToISODate(createdAt))
  if (Number.isNaN(startYear)) return []

  const result: MonthStatus[] = []
  let year = startYear
  let month = startMonth

  // Plain integer arithmetic — no Date allocation per month, and no DST or
  // month-length edge cases to get wrong.
  while (year < nowYear || (year === nowYear && month <= nowMonth)) {
    result.push({
      year,
      month,
      label: monthLabel(year, month, nowYear),
      paid: paidMonths?.has(`${year}-${month}`) ?? false,
    })
    if (month === 12) {
      year += 1
      month = 1
    } else {
      month += 1
    }
  }

  return result
}
