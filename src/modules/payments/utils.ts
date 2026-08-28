import {
  METHOD_BUCKETS,
  METHOD_REPORT_MONTHS,
  MONTH_NAMES,
  UNSPECIFIED_METHOD,
  type MethodBucket,
  type PaymentMethod,
} from '@/types/constants'
import { instantToISODate, todayISO, yearMonthOf } from '@/lib/date'
import type { PaymentRecord } from '@/types'

export interface OwedMonth {
  year: number
  month: number
  label: string
}

export interface MonthStatus extends OwedMonth {
  paid: boolean
  // Null on an unpaid month, and also on a paid one recorded before the method
  // column existed.
  method: PaymentMethod | null
}

// Paid months grouped by alumno: "year-month" → how it was collected.
//
// Built once per render and shared across every client. The previous shape
// re-filtered the whole payments array inside each call, so the clients list
// was O(clients × payments) — ~240k comparisons at 100 alumnos.
//
// A Map rather than a Set because the value now carries the method: presence is
// still the "paid" test, so `has` and `get` answer different questions and a
// `get` returning null must not be read as unpaid.
export type PaidIndex = ReadonlyMap<string, ReadonlyMap<string, PaymentMethod | null>>

export function buildPaidIndex(payments: PaymentRecord[]): PaidIndex {
  const index = new Map<string, Map<string, PaymentMethod | null>>()
  for (const p of payments) {
    if (!p.paid) continue
    let months = index.get(p.alumno_id)
    if (!months) {
      months = new Map()
      index.set(p.alumno_id, months)
    }
    months.set(`${p.year}-${p.month}`, p.method)
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
    const key = `${year}-${month}`
    result.push({
      year,
      month,
      label: monthLabel(year, month, nowYear),
      paid: paidMonths?.has(key) ?? false,
      method: paidMonths?.get(key) ?? null,
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

// ---------------------------------------------------------------------------
// Reporte de métodos de pago
//
// Todo cuenta CUOTAS, no dinero: el dominio no guarda el importe de la cuota en
// ningún lado, así que "efectivo vs transferencia" es cuántas cuotas se
// cobraron de cada forma, no cuánto se cobró.
// ---------------------------------------------------------------------------

// Una cuota por columna del reporte, más el total. Las claves salen de
// METHOD_BUCKETS, así que sumar un método a PAYMENT_METHODS le da su contador
// solo, y olvidarse de dibujarlo se vuelve un error de tipos en METHOD_META en
// vez de un número que no cierra.
export type MethodTotals = Record<MethodBucket, number> & { total: number }

function emptyTotals(): MethodTotals {
  const totals = { total: 0 } as MethodTotals
  for (const bucket of METHOD_BUCKETS) totals[bucket] = 0
  return totals
}

function addTo(totals: MethodTotals, method: PaymentMethod | null): void {
  // `null` es una cuota cobrada antes de que existiera la columna. Un valor no
  // nulo que no esté en METHOD_BUCKETS sólo puede venir de una fila escrita por
  // fuera de la app (la columna tiene un check): cae en el mismo balde antes
  // que desaparecer del total y dejar las columnas sin sumar al tile.
  const bucket = method !== null && method in totals ? method : UNSPECIFIED_METHOD
  totals[bucket] += 1
  totals.total += 1
}

// Las filas impagas se ignoran en todo el reporte. getAllPayments ya las filtra
// en la base, pero estas funciones son puras y se testean con listas armadas a
// mano, así que no dan por sentado que el llamador lo hizo.
function isCollected(p: PaymentRecord): boolean {
  return p.paid
}

// Suma varias filas del desglose en una sola — la leyenda debajo del bloque
// mensual describe esos 12 meses, no todo el historial.
export function sumTotals(rows: MethodTotals[]): MethodTotals {
  const totals = emptyTotals()
  for (const row of rows) {
    for (const bucket of METHOD_BUCKETS) totals[bucket] += row[bucket]
    totals.total += row.total
  }
  return totals
}

export function totalsByMethod(payments: PaymentRecord[]): MethodTotals {
  const totals = emptyTotals()
  for (const p of payments) {
    if (isCollected(p)) addTo(totals, p.method)
  }
  return totals
}

export interface MonthlyMethodRow extends MethodTotals {
  year: number
  month: number
  label: string
}

// Los últimos `months` meses calendario terminando en el actual, más reciente
// primero. Los meses sin cobros aparecen en cero: un hueco en la serie se lee
// como "no pasó nada", que es justamente el dato.
export function totalsByMonth(
  payments: PaymentRecord[],
  months: number = METHOD_REPORT_MONTHS,
): MonthlyMethodRow[] {
  const { year: nowYear, month: nowMonth } = yearMonthOf(todayISO())
  if (Number.isNaN(nowYear)) return []

  const rows = new Map<string, MonthlyMethodRow>()
  let year = nowYear
  let month = nowMonth

  for (let i = 0; i < months; i += 1) {
    rows.set(`${year}-${month}`, {
      year,
      month,
      label: monthLabel(year, month, nowYear),
      ...emptyTotals(),
    })
    if (month === 1) {
      year -= 1
      month = 12
    } else {
      month -= 1
    }
  }

  for (const p of payments) {
    if (!isCollected(p)) continue
    const row = rows.get(`${p.year}-${p.month}`)
    // Fuera de la ventana: no es un error, simplemente no entra en el desglose.
    if (row) addTo(row, p.method)
  }

  return [...rows.values()]
}

export interface ClientMethodRow extends MethodTotals {
  id: string
  name: string
}

export interface ClientName {
  id: string
  first_name: string
  last_name: string
}

// Un renglón por alumno con al menos una cuota cobrada, ordenado por total
// descendente y después por nombre, para que el orden no dependa del orden en
// que la base devolvió los pagos.
export function totalsByClient(
  payments: PaymentRecord[],
  clients: ClientName[],
): ClientMethodRow[] {
  const byId = new Map(clients.map((c) => [c.id, c]))
  const rows = new Map<string, ClientMethodRow>()

  for (const p of payments) {
    if (!isCollected(p)) continue
    const client = byId.get(p.alumno_id)
    // Un pago cuyo alumno no está en la lista quedaría como una fila sin
    // nombre: se descarta en vez de mostrarse en blanco.
    if (!client) continue

    let row = rows.get(p.alumno_id)
    if (!row) {
      row = {
        id: client.id,
        name: `${client.first_name} ${client.last_name}`.trim(),
        ...emptyTotals(),
      }
      rows.set(p.alumno_id, row)
    }
    addTo(row, p.method)
  }

  return [...rows.values()].sort(
    (a, b) => b.total - a.total || a.name.localeCompare(b.name, 'es'),
  )
}

// Porcentaje entero sobre el total, con 0 cuando no hay nada cobrado — evita
// el 0/0 = NaN que se colaba en el ancho de las barras.
export function sharePercent(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}
