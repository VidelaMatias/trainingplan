import assert from 'node:assert/strict'
import { afterEach, describe, it, mock } from 'node:test'

import {
  buildPaidIndex,
  getAllMonthsWithStatus,
  getOwedMonths,
  monthLabel,
} from '@/modules/payments/utils'
import type { PaymentRecord } from '@/types'

function freezeAt(isoInstant: string): void {
  mock.timers.enable({ apis: ['Date'], now: new Date(isoInstant).getTime() })
}

// 2026-08-19 12:00 in Argentina.
const MIDDAY = '2026-08-19T15:00:00Z'

const paid = (alumno_id: string, year: number, month: number): PaymentRecord => ({
  alumno_id,
  year,
  month,
  paid: true,
})

const key = (m: { year: number; month: number }) => `${m.year}-${m.month}`

afterEach(() => {
  mock.timers.reset()
})

describe('buildPaidIndex', () => {
  it('groups paid months per alumno', () => {
    const index = buildPaidIndex([paid('a', 2026, 6), paid('a', 2026, 7), paid('b', 2026, 6)])
    assert.deepEqual([...(index.get('a') ?? [])], ['2026-6', '2026-7'])
    assert.deepEqual([...(index.get('b') ?? [])], ['2026-6'])
  })

  it('ignores rows recorded as unpaid', () => {
    const index = buildPaidIndex([{ alumno_id: 'a', year: 2026, month: 6, paid: false }])
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
