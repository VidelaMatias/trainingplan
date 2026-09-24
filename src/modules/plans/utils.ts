import { DAYS, EXPIRING_SOON_DAYS, PLAN_STATUS, type PlanStatus } from '@/types/constants'
import { addDays, parseISODate, toISODate, todayISO } from '@/lib/date'
import type { WeekContent } from '@/types'

// Derives whether a plan is currently running, still upcoming, or already over.
// ISO dates sort lexicographically, so plain string comparison is both correct
// and free of any Date/timezone arithmetic.
export function getPlanStatus(plan: { start_date: string; end_date: string }): PlanStatus {
  const today = todayISO()
  if (today > plan.end_date) return PLAN_STATUS.EXPIRED
  if (today < plan.start_date) return PLAN_STATUS.UPCOMING
  return PLAN_STATUS.ACTIVE
}

// The Monday on or after `from` (an ISO date, defaulting to today in the
// trainer's timezone) — the default start offered for a new plan.
export function getNextMonday(from: string = todayISO()): string {
  const d = parseISODate(from)
  const day = d.getDay()
  const diff = day === 0 ? 1 : 8 - day
  d.setDate(d.getDate() + diff)
  return toISODate(d)
}

// The Monday opening the calendar week that contains `iso`. A plan may start on
// any weekday, but every week row stays anchored to its Monday so the Mon→Sun
// grid and the day columns keep lining up with the real calendar.
export function getMondayOf(iso: string): string {
  const d = parseISODate(iso)
  const weekday = d.getDay()
  d.setDate(d.getDate() - (weekday === 0 ? 6 : weekday - 1))
  return toISODate(d)
}

// The Sunday that closes the week beginning on `monday`.
export function getSundayFrom(monday: string): string {
  const d = parseISODate(monday)
  d.setDate(d.getDate() + 6)
  return toISODate(d)
}

export function addWeeks(monday: string, n: number): string {
  const d = parseISODate(monday)
  d.setDate(d.getDate() + n * 7)
  return toISODate(d)
}

// The seven ISO dates of the week beginning on `weekStart`, Monday first — same
// order as DAYS, so index i is the date of DAYS[i].
export function getWeekDates(weekStart: string): string[] {
  const start = parseISODate(weekStart)
  return DAYS.map((_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return toISODate(d)
  })
}

// A plan that starts mid-week has a partial first week: the days before its
// start date aren't part of it, so their cells are dropped. Applied on both
// sides — the form disables those inputs, the action refuses to store them.
//
// Constrained to just the day cells and the week's start: week_number is not
// read here, and the action's payload no longer carries one (the DB derives it).
export function clampWeeksToStart<T extends WeekContent & { week_start: string }>(
  weeks: T[],
  startDate: string,
): T[] {
  return weeks.map((week) => {
    const dates = getWeekDates(week.week_start)
    const clamped = { ...week }
    DAYS.forEach((day, i) => {
      if (dates[i] < startDate) clamped[day.key] = null
    })
    return clamped
  })
}

// Whether `endDate` falls between today and `days` days from today, both
// inclusive. Compared as calendar dates in the trainer's timezone: the previous
// instant-based version parsed the bare ISO string as UTC midnight, which put a
// plan ending *today* in the past and silently dropped it from the dashboard's
// "vence esta semana" warning — the most urgent case it exists to surface.
export function isExpiringWithin(endDate: string, days: number): boolean {
  const today = todayISO()
  return endDate >= today && endDate <= addDays(today, days)
}

// The "vence esta semana" rule: a running plan ending within
// EXPIRING_SOON_DAYS. One definition for the dashboard panel that lists these
// plans and the alumnos filter its tile opens, so the two cannot drift.
export function isPlanExpiringSoon(plan: { start_date: string; end_date: string }): boolean {
  return (
    getPlanStatus(plan) === PLAN_STATUS.ACTIVE &&
    isExpiringWithin(plan.end_date, EXPIRING_SOON_DAYS)
  )
}

export function emptyWeekContent(): WeekContent {
  return {
    monday: null,
    tuesday: null,
    wednesday: null,
    thursday: null,
    friday: null,
    saturday: null,
    sunday: null,
  }
}
