import assert from 'node:assert/strict'
import { afterEach, describe, it, mock } from 'node:test'

import {
  buildPaidIndex,
  getAllMonthsWithStatus,
  getOwedMonths,
  monthLabel,
  sharePercent,
  sumTotals,
  totalsByClient,
  totalsByMethod,
  totalsByMonth,
} from '@/modules/payments/utils'
import { PAYMENT_METHODS, type PaymentMethod } from '@/types/constants'
import type { PaymentRecord } from '@/types'

function freezeAt(isoInstant: string): void {
  mock.timers.enable({ apis: ['Date'], now: new Date(isoInstant).getTime() })
}

// 2026-08-19 12:00 in Argentina.
const MIDDAY = '2026-08-19T15:00:00Z'

const paid = (
  alumno_id: string,
  year: number,
  month: number,
  method: PaymentMethod | null = PAYMENT_METHODS.CASH,
): PaymentRecord => ({
  alumno_id,
  year,
  month,
  paid: true,
  method,
})

const cash = PAYMENT_METHODS.CASH
const transfer = PAYMENT_METHODS.TRANSFER

const key = (m: { year: number; month: number }) => `${m.year}-${m.month}`

afterEach(() => {
  mock.timers.reset()
})

describe('buildPaidIndex', () => {
  it('groups paid months per alumno', () => {
    const index = buildPaidIndex([paid('a', 2026, 6), paid('a', 2026, 7), paid('b', 2026, 6)])
    assert.deepEqual([...(index.get('a')?.keys() ?? [])], ['2026-6', '2026-7'])
    assert.deepEqual([...(index.get('b')?.keys() ?? [])], ['2026-6'])
  })

  it('keeps the method each month was collected with', () => {
    const index = buildPaidIndex([paid('a', 2026, 6, transfer), paid('a', 2026, 7, null)])
    assert.equal(index.get('a')?.get('2026-6'), transfer)
    // Cobrada antes de que existiera la columna: paga, pero sin método. `has`
    // y `get` responden preguntas distintas y el null no puede leerse como impaga.
    assert.equal(index.get('a')?.has('2026-7'), true)
    assert.equal(index.get('a')?.get('2026-7'), null)
  })

  it('ignores rows recorded as unpaid', () => {
    const index = buildPaidIndex([{ alumno_id: 'a', year: 2026, month: 6, paid: false, method: null }])
    assert.equal(index.get('a'), undefined)
  })

  it('returns an empty index for no payments', () => {
    assert.equal(buildPaidIndex([]).size, 0)
  })
})

describe('getOwedMonths', () => {
  it('spans signup month through the current month', () => {
    freezeAt(MIDDAY)
    const owed = getOwedMonths('2026-06-10T12:00:00Z', 'a', buildPaidIndex([]))
    assert.deepEqual(owed.map(key), ['2026-6', '2026-7', '2026-8'])
  })

  it('skips months that were paid', () => {
    freezeAt(MIDDAY)
    const index = buildPaidIndex([paid('a', 2026, 6)])
    assert.deepEqual(getOwedMonths('2026-06-10T12:00:00Z', 'a', index).map(key), ['2026-7', '2026-8'])
  })

  it('does not let one alumno see another one payments', () => {
    freezeAt(MIDDAY)
    const index = buildPaidIndex([paid('a', 2026, 6), paid('a', 2026, 7)])
    assert.deepEqual(getOwedMonths('2026-06-10T12:00:00Z', 'b', index).map(key), [
      '2026-6',
      '2026-7',
      '2026-8',
    ])
  })

  it('crosses a year boundary', () => {
    freezeAt('2027-02-15T15:00:00Z')
    const owed = getOwedMonths('2026-11-01T12:00:00Z', 'a', buildPaidIndex([]))
    assert.deepEqual(owed.map(key), ['2026-11', '2026-12', '2027-1', '2027-2'])
  })

  it('does not bill the next month early on 31 December', () => {
    // 2026-12-31 22:00 in Argentina is already 2027-01-01 in UTC. Reading the
    // server clock here would add a January fee a day before it is owed.
    freezeAt('2027-01-01T01:00:00Z')
    const owed = getOwedMonths('2026-12-01T12:00:00Z', 'a', buildPaidIndex([]))
    assert.deepEqual(owed.map(key), ['2026-12'])
  })

  it('uses the signup month as seen locally, not in UTC', () => {
    // 02:00 UTC on 1 December is 23:00 on 30 November in Argentina, so the
    // alumno signed up in November and owes that month too.
    freezeAt('2026-12-15T15:00:00Z')
    const owed = getOwedMonths('2026-12-01T02:00:00Z', 'a', buildPaidIndex([]))
    assert.deepEqual(owed.map(key), ['2026-11', '2026-12'])
  })

  it('owes nothing before any month has elapsed', () => {
    freezeAt(MIDDAY)
    const index = buildPaidIndex([paid('a', 2026, 8)])
    assert.deepEqual(getOwedMonths('2026-08-01T12:00:00Z', 'a', index), [])
  })

  it('returns an empty timeline for an unparseable signup date', () => {
    // Number('') is 0, so a malformed date used to walk from year zero to now.
    freezeAt(MIDDAY)
    assert.deepEqual(getOwedMonths('not-a-date', 'a', buildPaidIndex([])), [])
  })
})

describe('getAllMonthsWithStatus', () => {
  it('runs most recent first and carries the paid flag', () => {
    freezeAt(MIDDAY)
    const index = buildPaidIndex([paid('a', 2026, 7)])
    const months = getAllMonthsWithStatus('2026-06-10T12:00:00Z', 'a', index)

    assert.deepEqual(months.map(key), ['2026-8', '2026-7', '2026-6'])
    assert.deepEqual(
      months.map((m) => m.paid),
      [false, true, false],
    )
  })
})

describe('monthLabel', () => {
  it('omits the year for the current year', () => {
    assert.equal(monthLabel(2026, 8, 2026), 'agosto')
  })

  it('includes the year for any other year', () => {
    assert.equal(monthLabel(2025, 12, 2026), 'diciembre 2025')
  })
})

describe('totalsByMethod', () => {
  it('counts fees per method and totals them', () => {
    const totals = totalsByMethod([
      paid('a', 2026, 6, cash),
      paid('a', 2026, 7, transfer),
      paid('b', 2026, 6, cash),
      paid('b', 2026, 7, null),
    ])
    assert.deepEqual(totals, { cash: 2, transfer: 1, unspecified: 1, total: 4 })
  })

  it('leaves unpaid rows out of the report', () => {
    const totals = totalsByMethod([
      paid('a', 2026, 6, cash),
      { alumno_id: 'a', year: 2026, month: 7, paid: false, method: null },
    ])
    assert.deepEqual(totals, { cash: 1, transfer: 0, unspecified: 0, total: 1 })
  })

  it('is all zeros with nothing collected', () => {
    assert.deepEqual(totalsByMethod([]), { cash: 0, transfer: 0, unspecified: 0, total: 0 })
  })
})

describe('totalsByMonth', () => {
  it('runs most-recent-first from the current month', () => {
    freezeAt(MIDDAY)
    const rows = totalsByMonth([], 3)
    assert.deepEqual(
      rows.map((r) => `${r.year}-${r.month}`),
      ['2026-8', '2026-7', '2026-6'],
    )
  })

  it('shows months with no collection as zero instead of dropping them', () => {
    freezeAt(MIDDAY)
    const rows = totalsByMonth([paid('a', 2026, 8, cash)], 3)
    assert.deepEqual(rows.map((r) => r.total), [1, 0, 0])
  })

  it('ignores fees outside the window', () => {
    freezeAt(MIDDAY)
    const rows = totalsByMonth([paid('a', 2025, 1, cash), paid('a', 2026, 8, transfer)], 3)
    assert.deepEqual(rows[0], {
      year: 2026, month: 8, label: 'agosto', cash: 0, transfer: 1, unspecified: 0, total: 1,
    })
    assert.equal(rows.reduce((n, r) => n + r.total, 0), 1)
  })

  it('crosses the year boundary backwards', () => {
    freezeAt('2026-01-15T15:00:00Z')
    const rows = totalsByMonth([], 3)
    assert.deepEqual(
      rows.map((r) => `${r.year}-${r.month}`),
      ['2026-1', '2025-12', '2025-11'],
    )
    // El año se muestra en las etiquetas de meses que no son del año actual.
    assert.deepEqual(rows.map((r) => r.label), ['enero', 'diciembre 2025', 'noviembre 2025'])
  })
})

describe('totalsByClient', () => {
  const clients = [
    { id: 'a', first_name: 'Ana', last_name: 'Diaz' },
    { id: 'b', first_name: 'Beto', last_name: 'Cruz' },
  ]

  it('sorts by fees collected, then by name', () => {
    const rows = totalsByClient(
      [paid('b', 2026, 6, cash), paid('a', 2026, 6, cash), paid('a', 2026, 7, transfer)],
      clients,
    )
    assert.deepEqual(rows.map((r) => [r.name, r.total]), [['Ana Diaz', 2], ['Beto Cruz', 1]])
    assert.deepEqual(rows[0], {
      id: 'a', name: 'Ana Diaz', cash: 1, transfer: 1, unspecified: 0, total: 2,
    })
  })

  it('leaves out alumnos with nothing collected', () => {
    const rows = totalsByClient([paid('a', 2026, 6, cash)], clients)
    assert.deepEqual(rows.map((r) => r.id), ['a'])
  })

  it('drops payments whose alumno is not in the list', () => {
    // Si no, la fila saldría con el nombre en blanco.
    assert.deepEqual(totalsByClient([paid('zz', 2026, 6, cash)], clients), [])
  })
})

describe('sharePercent', () => {
  it('rounds to a whole percent', () => {
    assert.equal(sharePercent(1, 3), 33)
    assert.equal(sharePercent(2, 3), 67)
  })

  it('is 0 rather than NaN when nothing was collected', () => {
    assert.equal(sharePercent(0, 0), 0)
  })
})

describe('sumTotals', () => {
  it('folds the monthly rows into the legend that sits under them', () => {
    freezeAt(MIDDAY)
    // La leyenda del bloque mensual recibía los totales de TODO el historial,
    // así que las barras sumaban una cosa y el renglón de abajo otra.
    const payments = [
      paid('a', 2026, 8, cash),
      paid('a', 2026, 7, transfer),
      paid('a', 2020, 1, cash), // fuera de la ventana de 12 meses
    ]
    const monthly = totalsByMonth(payments, 12)
    assert.deepEqual(sumTotals(monthly), { cash: 1, transfer: 1, unspecified: 0, total: 2 })
    // El total de todo el historial sí incluye la de 2020: son números distintos
    // a propósito, y por eso no se pueden intercambiar.
    assert.equal(totalsByMethod(payments).total, 3)
  })

  it('is all zeros for no rows', () => {
    assert.deepEqual(sumTotals([]), { cash: 0, transfer: 0, unspecified: 0, total: 0 })
  })
})

describe('totalsByMethod con datos fuera de contrato', () => {
  it('does not lose a fee whose method the app does not know', () => {
    // Sólo puede venir de una fila escrita por fuera de la app. Cae en
    // "Sin especificar", pero no puede desaparecer del total: si no, las
    // columnas del reporte dejan de sumar al tile que está arriba.
    const rogue = { alumno_id: 'a', year: 2026, month: 6, paid: true, method: 'crypto' }
    const totals = totalsByMethod([rogue as unknown as PaymentRecord, paid('a', 2026, 7, cash)])
    assert.equal(totals.total, 2)
    assert.equal(totals.cash + totals.transfer + totals.unspecified, totals.total)
    assert.equal(totals.unspecified, 1)
  })
})
