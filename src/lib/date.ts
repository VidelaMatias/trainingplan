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
