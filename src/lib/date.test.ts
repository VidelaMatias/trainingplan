import assert from 'node:assert/strict'
import { afterEach, describe, it, mock } from 'node:test'

import {
  addDays,
  formatMediumDate,
  formatNumericDate,
  formatShortDate,
  formatWeekdayDate,
  instantToISODate,
  parseISODate,
  toISODate,
  todayISO,
  yearMonthOf,
} from '@/lib/date'

// Freezes the wall clock at a real instant. Only `new Date()` with no arguments
// is affected — parsing a date string keeps working normally, which is what the
// helpers under test rely on.
function freezeAt(isoInstant: string): void {
  mock.timers.enable({ apis: ['Date'], now: new Date(isoInstant).getTime() })
}

afterEach(() => {
  mock.timers.reset()
})

describe('todayISO', () => {
  it('returns the calendar date in the trainer timezone, not the server one', () => {
    // 2026-08-19 22:30 in Argentina is already 2026-08-20 in UTC. The server
    // runs in UTC; the coach does not. This three-hour window each night is the
    // bug that made running plans display as "Vencido" a day early.
    freezeAt('2026-08-20T01:30:00Z')
    assert.equal(todayISO(), '2026-08-19')
  })

  it('agrees with the server date outside that window', () => {
    freezeAt('2026-08-19T15:00:00Z')
    assert.equal(todayISO(), '2026-08-19')
  })

  it('does not roll the year over early on 31 December', () => {
    freezeAt('2027-01-01T01:00:00Z') // 2026-12-31 22:00 in Argentina
    assert.equal(todayISO(), '2026-12-31')
  })
})

describe('instantToISODate', () => {
  it('maps a timestamp to the calendar date it fell on locally', () => {
    // 02:00 UTC is still 23:00 the previous day in Argentina.
    assert.equal(instantToISODate('2026-12-01T02:00:00Z'), '2026-11-30')
  })

  it('returns an empty string for an unparseable timestamp', () => {
    assert.equal(instantToISODate('not-a-date'), '')
  })
})

describe('yearMonthOf', () => {
  it('reads the year and 1-based month', () => {
    assert.deepEqual(yearMonthOf('2026-08-19'), { year: 2026, month: 8 })
  })

  it('yields NaN rather than zero for malformed input', () => {
    // Number('') is 0, not NaN. Returning zero here would read as "year 0" and
    // send the payment timeline walking month by month through two millennia.
    for (const bad of ['', 'nope', '20-26-08']) {
      const { year, month } = yearMonthOf(bad)
      assert.ok(Number.isNaN(year), `year for ${JSON.stringify(bad)}`)
      assert.ok(Number.isNaN(month), `month for ${JSON.stringify(bad)}`)
    }
  })
})

describe('addDays', () => {
  it('advances within a month', () => {
    assert.equal(addDays('2026-08-19', 7), '2026-08-26')
  })

  it('crosses month and year boundaries', () => {
    assert.equal(addDays('2026-08-28', 7), '2026-09-04')
    assert.equal(addDays('2026-12-28', 7), '2027-01-04')
  })

  it('handles a leap day', () => {
    assert.equal(addDays('2028-02-28', 1), '2028-02-29')
    assert.equal(addDays('2028-02-28', 2), '2028-03-01')
  })

  it('accepts a negative offset', () => {
    assert.equal(addDays('2026-01-01', -1), '2025-12-31')
  })
})

describe('parseISODate / toISODate', () => {
  it('round-trips without drifting a day', () => {
    // Reading at local noon keeps the date clear of any DST boundary; the naive
    // toISOString() version rolled the day back for timezones behind UTC.
    for (const iso of ['2026-01-01', '2026-08-19', '2026-12-31', '2028-02-29']) {
      assert.equal(toISODate(parseISODate(iso)), iso)
    }
  })
})

// La app escribe meses y días de la semana con inicial mayúscula (MONTH_NAMES,
// DAYS), pero Intl los devuelve en minúscula para es-AR.
//
// Estos casos no fijan la abreviatura —«sep» o «sept» según la versión de CLDR, y
// en un Node con small-icu es-AR cae a en-US—, sino las dos propiedades que sí
// son nuestras: que el mes quede capitalizado y que no se agregue ni se pierda
// nada del texto que arma Intl.
describe('formato de fechas para la UI', () => {
  function partsOf(options: Intl.DateTimeFormatOptions, iso: string) {
    return new Intl.DateTimeFormat('es-AR', options).formatToParts(parseISODate(iso))
  }

  function capitalized(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1)
  }

  it('capitaliza el mes, que no siempre es la primera letra del texto', () => {
    const parts = partsOf({ day: 'numeric', month: 'short' }, '2026-09-12')
    const month = parts.find((p) => p.type === 'month')!.value
    const formatted = formatShortDate('2026-09-12')

    assert.ok(
      formatted.includes(capitalized(month)),
      `«${formatted}» debería contener «${capitalized(month)}»`,
    )
    // Mismo contenido que Intl: sólo cambia la caja de una letra.
    assert.equal(formatted.toLowerCase(), parts.map((p) => p.value).join('').toLowerCase())
  })

  it('capitaliza también el día de la semana', () => {
    const parts = partsOf({ weekday: 'short', day: 'numeric', month: 'short' }, '2026-09-12')
    const weekday = parts.find((p) => p.type === 'weekday')!.value

    assert.ok(formatWeekdayDate('2026-09-12').startsWith(capitalized(weekday)))
  })

  it('deja la forma con año igual que Intl salvo la caja del mes', () => {
    const parts = partsOf({ day: 'numeric', month: 'short', year: 'numeric' }, '2026-09-12')

    assert.equal(
      formatMediumDate('2026-09-12').toLowerCase(),
      parts.map((p) => p.value).join('').toLowerCase(),
    )
  })

  it('no toca la forma numérica — no hay nombre de mes que corregir', () => {
    assert.equal(
      formatNumericDate('2026-09-12'),
      new Intl.DateTimeFormat('es-AR').format(parseISODate('2026-09-12')),
    )
  })

  // Intl tira RangeError sobre un Date inválido, a diferencia del
  // toLocaleDateString que estas funciones reemplazaron. Vaciar el campo de
  // fecha del formulario de planes llega hasta acá con «NaN-NaN-NaN».
  it('devuelve un hueco en vez de tirar cuando la fecha no se puede leer', () => {
    for (const bad of ['', 'NaN-NaN-NaN', 'no es una fecha']) {
      assert.equal(formatShortDate(bad), '—')
      assert.equal(formatMediumDate(bad), '—')
      assert.equal(formatWeekdayDate(bad), '—')
      assert.equal(formatNumericDate(bad), '—')
    }
  })
})
