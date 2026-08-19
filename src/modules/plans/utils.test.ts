import assert from 'node:assert/strict'
import { afterEach, describe, it, mock } from 'node:test'

import { addDays, todayISO } from '@/lib/date'
import { PLAN_STATUS } from '@/types/constants'
import {
  addWeeks,
  clampWeeksToStart,
  emptyWeekContent,
  getMondayOf,
  getNextMonday,
  getPlanStatus,
  getSundayFrom,
  getWeekDates,
  isExpiringWithin,
} from '@/modules/plans/utils'

function freezeAt(isoInstant: string): void {
  mock.timers.enable({ apis: ['Date'], now: new Date(isoInstant).getTime() })
}

// 2026-08-19 12:00 in Argentina — safely mid-day, so the server date and the
// trainer's date agree and the assertions isolate the logic under test.
const MIDDAY = '2026-08-19T15:00:00Z'

afterEach(() => {
  mock.timers.reset()
})

describe('getPlanStatus', () => {
  it('is active between start and end inclusive', () => {
    freezeAt(MIDDAY)
    assert.equal(getPlanStatus({ start_date: '2026-08-01', end_date: '2026-08-31' }), PLAN_STATUS.ACTIVE)
    assert.equal(getPlanStatus({ start_date: '2026-08-19', end_date: '2026-08-19' }), PLAN_STATUS.ACTIVE)
  })

  it('is upcoming before the start date', () => {
    freezeAt(MIDDAY)
    assert.equal(getPlanStatus({ start_date: '2026-08-20', end_date: '2026-08-30' }), PLAN_STATUS.UPCOMING)
  })

  it('is expired only once the end date has passed', () => {
    freezeAt(MIDDAY)
    assert.equal(getPlanStatus({ start_date: '2026-08-01', end_date: '2026-08-18' }), PLAN_STATUS.EXPIRED)
  })

  it('does not expire a plan early during the UTC rollover window', () => {
    // Regression: the coach is at 2026-08-19 22:30, the UTC server is already
    // on 08-20. A plan ending today must still read as active.
    freezeAt('2026-08-20T01:30:00Z')
    assert.equal(getPlanStatus({ start_date: '2026-08-01', end_date: '2026-08-19' }), PLAN_STATUS.ACTIVE)
    assert.equal(getPlanStatus({ start_date: '2026-08-20', end_date: '2026-08-30' }), PLAN_STATUS.UPCOMING)
  })
})

describe('isExpiringWithin', () => {
  it('warns about a plan ending today', () => {
    // Regression: the old instant-based version parsed the bare ISO string as
    // UTC midnight, which put "today" in the past and dropped the single most
    // urgent case from the dashboard warning.
    freezeAt(MIDDAY)
    assert.equal(isExpiringWithin('2026-08-19', 7), true)
  })

  it('includes the far edge of the window and excludes the day after', () => {
    freezeAt(MIDDAY)
    assert.equal(isExpiringWithin('2026-08-26', 7), true)
    assert.equal(isExpiringWithin('2026-08-27', 7), false)
  })

  it('ignores plans that already ended', () => {
    freezeAt(MIDDAY)
    assert.equal(isExpiringWithin('2026-08-18', 7), false)
  })
})

describe('dashboard end_date filter', () => {
  it('never drops a plan the dashboard would have counted', () => {
    // The dashboard query narrows to `.gte('end_date', todayISO())` so years of
    // finished plans are not downloaded just to be filtered out in JS. That is
    // only safe while every non-expired plan satisfies the same predicate.
    freezeAt(MIDDAY)
    const today = todayISO()
    const violations: string[] = []

    for (let offset = -400; offset <= 400; offset += 7) {
      for (const length of [0, 1, 6, 7, 13, 28, 90]) {
        const start = addDays(today, offset)
        const end = addDays(start, length)
        const status = getPlanStatus({ start_date: start, end_date: end })
        const keptByQuery = end >= today

        if (status !== PLAN_STATUS.EXPIRED && !keptByQuery) {
          violations.push(`${start}..${end} is ${status} but the query drops it`)
        }
        if (keptByQuery && status === PLAN_STATUS.EXPIRED) {
          violations.push(`${start}..${end} is expired but the query keeps it`)
        }
      }
    }

    assert.deepEqual(violations, [])
  })
})

describe('getMondayOf', () => {
  it('anchors every weekday to the Monday that opens its week', () => {
    // 2026-08-17 is a Monday; 2026-08-23 the Sunday that closes the same week.
    const expected = '2026-08-17'
    for (const day of [
      '2026-08-17',
      '2026-08-18',
      '2026-08-19',
      '2026-08-20',
      '2026-08-21',
      '2026-08-22',
      '2026-08-23',
    ]) {
      assert.equal(getMondayOf(day), expected, `from ${day}`)
    }
  })
})

describe('getNextMonday', () => {
  it('skips to the following Monday when today is already Monday', () => {
    assert.equal(getNextMonday('2026-08-17'), '2026-08-24')
  })

  it('returns tomorrow when today is Sunday', () => {
    assert.equal(getNextMonday('2026-08-23'), '2026-08-24')
  })

  it('returns the upcoming Monday from mid-week', () => {
    assert.equal(getNextMonday('2026-08-19'), '2026-08-24')
  })

  it('defaults to the trainer-local today', () => {
    freezeAt('2026-08-20T01:30:00Z') // still 08-19 in Argentina
    assert.equal(getNextMonday(), '2026-08-24')
  })
})

describe('getSundayFrom / addWeeks / getWeekDates', () => {
  it('closes a week six days after its Monday', () => {
    assert.equal(getSundayFrom('2026-08-17'), '2026-08-23')
  })

  it('advances whole weeks across a year boundary', () => {
    assert.equal(addWeeks('2026-08-17', 2), '2026-08-31')
    assert.equal(addWeeks('2026-12-28', 1), '2027-01-04')
  })

  it('lists the seven dates of a week, Monday first', () => {
    assert.deepEqual(getWeekDates('2026-08-17'), [
      '2026-08-17',
      '2026-08-18',
      '2026-08-19',
      '2026-08-20',
      '2026-08-21',
      '2026-08-22',
      '2026-08-23',
    ])
  })

  it('does not skip or repeat a day across a DST change', () => {
    // Argentina has no DST today, but the helpers read dates at local noon so
    // this holds regardless of the timezone the server happens to run in.
    const dates = getWeekDates('2026-10-26')
    assert.equal(new Set(dates).size, 7)
    assert.equal(dates[6], '2026-11-01')
  })
})

describe('clampWeeksToStart', () => {
  const filled = () => ({
    monday: 'L',
    tuesday: 'M',
    wednesday: 'X',
    thursday: 'J',
    friday: 'V',
    saturday: 'S',
    sunday: 'D',
  })

  it('drops the days before a mid-week start', () => {
    // Plan starts Wednesday 2026-08-19; Monday and Tuesday are not part of it.
    const [week] = clampWeeksToStart([{ ...filled(), week_start: '2026-08-17' }], '2026-08-19')
    assert.equal(week.monday, null)
    assert.equal(week.tuesday, null)
    assert.equal(week.wednesday, 'X')
    assert.equal(week.sunday, 'D')
  })

  it('leaves a week that starts on its Monday untouched', () => {
    const [week] = clampWeeksToStart([{ ...filled(), week_start: '2026-08-17' }], '2026-08-17')
    assert.deepEqual({ ...week, week_start: undefined }, { ...filled(), week_start: undefined })
  })

  it('only clamps the first week, not later ones', () => {
    const weeks = clampWeeksToStart(
      [
        { ...filled(), week_start: '2026-08-17' },
        { ...filled(), week_start: '2026-08-24' },
      ],
      '2026-08-19',
    )
    assert.equal(weeks[0].monday, null)
    assert.equal(weeks[1].monday, 'L')
  })

  it('does not mutate its input', () => {
    const input = [{ ...filled(), week_start: '2026-08-17' }]
    clampWeeksToStart(input, '2026-08-19')
    assert.equal(input[0].monday, 'L')
  })
})

describe('emptyWeekContent', () => {
  it('returns all seven days as null', () => {
    assert.deepEqual(emptyWeekContent(), {
      monday: null,
      tuesday: null,
      wednesday: null,
      thursday: null,
      friday: null,
      saturday: null,
      sunday: null,
    })
  })
})
