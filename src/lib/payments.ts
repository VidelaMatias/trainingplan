export interface PaymentRecord {
  alumno_id: string
  year: number
  month: number
  paid: boolean
}

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

export function monthLabel(year: number, month: number): string {
  const name = MONTH_NAMES[month - 1]
  const now = new Date()
  return year !== now.getFullYear() ? `${name} ${year}` : name
}

export function getOwedMonths(
  createdAt: string,
  alumnoId: string,
  payments: PaymentRecord[],
): { year: number; month: number; label: string }[] {
  const now = new Date()
  const paidSet = new Set(
    payments
      .filter((p) => p.alumno_id === alumnoId && p.paid)
      .map((p) => `${p.year}-${p.month}`),
  )

  const start = new Date(createdAt)
  start.setDate(1)
  start.setHours(0, 0, 0, 0)

  const owed: { year: number; month: number; label: string }[] = []
  const cursor = new Date(start)

  while (
    cursor.getFullYear() < now.getFullYear() ||
    (cursor.getFullYear() === now.getFullYear() && cursor.getMonth() <= now.getMonth())
  ) {
    const y = cursor.getFullYear()
    const m = cursor.getMonth() + 1
    if (!paidSet.has(`${y}-${m}`)) {
      owed.push({ year: y, month: m, label: monthLabel(y, m) })
    }
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return owed
}

export function getAllMonthsWithStatus(
  createdAt: string,
  alumnoId: string,
  payments: PaymentRecord[],
): { year: number; month: number; label: string; paid: boolean }[] {
  const now = new Date()
  const paidSet = new Set(
    payments
      .filter((p) => p.alumno_id === alumnoId && p.paid)
      .map((p) => `${p.year}-${p.month}`),
  )

  const start = new Date(createdAt)
  start.setDate(1)
  start.setHours(0, 0, 0, 0)

  const result: { year: number; month: number; label: string; paid: boolean }[] = []
  const cursor = new Date(start)

  while (
    cursor.getFullYear() < now.getFullYear() ||
    (cursor.getFullYear() === now.getFullYear() && cursor.getMonth() <= now.getMonth())
  ) {
    const y = cursor.getFullYear()
    const m = cursor.getMonth() + 1
    result.push({ year: y, month: m, label: monthLabel(y, m), paid: paidSet.has(`${y}-${m}`) })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return result.reverse() // más reciente primero
}
