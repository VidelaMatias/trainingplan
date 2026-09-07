import { APP_TIMEZONE } from '@/types/constants'

// Calendar-date primitives shared by the plans and payments modules.
//
// Everything the domain calls a "date" (plan start/end, a fee's month) is a
// calendar date in the trainer's timezone, not an instant. The server runs in
// UTC, so deriving today from the process clock is wrong for the three hours
// each night when UTC has rolled over and Argentina has not.

// en-CA formats as YYYY-MM-DD — exactly the shape every date column uses.
// Built once: constructing an Intl formatter is expensive and this runs per
// plan and per client on the dashboard.
const isoInAppTz = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

// Today as a calendar date in the trainer's timezone. The single source of
// "now" for the whole domain.
export function todayISO(): string {
  return isoInAppTz.format(new Date())
}

// The calendar date an instant fell on in the trainer's timezone. Used for
// timestamptz columns like alumnos.created_at: slicing the raw UTC string would
// put a signup made at 02:00 UTC into the wrong month, since locally it was
// still 21:00 the previous day.
export function instantToISODate(timestamp: string): string {
  const d = new Date(timestamp)
  return Number.isNaN(d.getTime()) ? '' : isoInAppTz.format(d)
}

// Formats a Date's local parts by hand. toISOString() would roll the day back
// for timezones behind UTC.
export function toISODate(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

// Reads an ISO date at local noon, well clear of any DST boundary.
export function parseISODate(iso: string): Date {
  return new Date(iso + 'T12:00:00')
}

// `days` calendar days after an ISO date.
export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

// The year and 1-based month of an ISO date, without going through Date.
// Malformed input yields NaN rather than 0 — Number('') is 0, which would read
// as "year zero" and send a month-by-month walk through two millennia.
export function yearMonthOf(iso: string): { year: number; month: number } {
  if (!/^\d{4}-\d{2}/.test(iso)) return { year: NaN, month: NaN }
  return { year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)) }
}

// ── Formato para la UI ──────────────────────────────────────────────────────
// El español escribe meses y días de la semana en minúscula, pero esta app los
// muestra con inicial mayúscula en todos lados (ver MONTH_NAMES y DAYS). Intl no
// lo hace, así que hay que corregirlo al formatear.
//
// Hasta acá cada componente armaba su propio `new Date(iso + 'T12:00:00')
// .toLocaleDateString('es-AR', …)`: cinco copias de la misma línea, y por eso la
// tabla de alumnos decía «vence 12 sept» mientras la celda de al lado decía
// «Septiembre». Estas cuatro formas son las únicas que la UI usa.

function capitalizeFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

// Lo que se muestra cuando la fecha no se puede leer. El guión largo es el mismo
// hueco que la tabla de alumnos ya usa para un email o un objetivo vacío.
const INVALID_DATE = '—'

// Intl tira RangeError sobre un Date inválido, a diferencia de
// toLocaleDateString, que devolvía «Invalid Date». Sin este guard, vaciar el
// campo de fecha del formulario de planes rompía la pantalla entera: getMondayOf('')
// devuelve «NaN-NaN-NaN» y el encabezado de cada semana lo formatea.
function formatSafely(iso: string, render: (date: Date) => string): string {
  const date = parseISODate(iso)
  return Number.isNaN(date.getTime()) ? INVALID_DATE : render(date)
}

// Por partes y no sobre el string armado: en «12 sept» el mes no es la primera
// letra, y dónde cae dentro del patrón lo decide el locale, no nosotros.
function formatParts(formatter: Intl.DateTimeFormat, iso: string): string {
  return formatSafely(iso, (date) =>
    formatter
      .formatToParts(date)
      .map((part) =>
        part.type === 'month' || part.type === 'weekday'
          ? capitalizeFirst(part.value)
          : part.value,
      )
      .join(''),
  )
}

const shortFormatter = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' })
const mediumFormatter = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const weekdayFormatter = new Intl.DateTimeFormat('es-AR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})
// Sin nombre de mes: no hay nada que capitalizar, así que no pasa por formatParts.
const numericFormatter = new Intl.DateTimeFormat('es-AR')

/** «12 Sept» */
export function formatShortDate(iso: string): string {
  return formatParts(shortFormatter, iso)
}

/** «12 de Sept de 2026» */
export function formatMediumDate(iso: string): string {
  return formatParts(mediumFormatter, iso)
}

/** «Vie, 12 Sept» */
export function formatWeekdayDate(iso: string): string {
  return formatParts(weekdayFormatter, iso)
}

/** «12/9/2026» */
export function formatNumericDate(iso: string): string {
  return formatSafely(iso, (date) => numericFormatter.format(date))
}
