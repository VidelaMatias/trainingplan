import { DAYS, PLAN_STATUS, type PlanStatus } from '@/types/constants'
import type { TrainingPlanWeek, WeekContent } from '@/types'

// Date-only values are local. toISOString() would roll the day back for
// timezones behind UTC (Argentina is UTC-3), so format the local parts by hand.
function toISODate(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

// Reads an ISO date at local noon, well clear of any DST boundary.
function parseISODate(iso: string): Date {
  return new Date(iso + 'T12:00:00')
}

// Derives whether a plan is currently running, still upcoming, or already over,
// comparing today (local date, time stripped) against the plan's date range.
export function getPlanStatus(plan: { start_date: string; end_date: string }): PlanStatus {
  const today = new Date(new Date().toDateString())
  const start = parseISODate(plan.start_date)
  const end = parseISODate(plan.end_date)
  if (today > end) return PLAN_STATUS.EXPIRED
  if (today < start) return PLAN_STATUS.UPCOMING
  return PLAN_STATUS.ACTIVE
}

// The Monday on or after `from` — the default start offered for a new plan.
export function getNextMonday(from: Date = new Date()): string {
  const d = new Date(from)
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

// Whether a day of `weekStart` falls before the plan begins — true only for the
// leading days of a first week the coach started mid-week.
export function isBeforeStart(weekStart: string, dayIndex: number, startDate: string): boolean {
  return getWeekDates(weekStart)[dayIndex] < startDate
}

// A plan that starts mid-week has a partial first week: the days before its
// start date aren't part of it, so their cells are dropped. Applied on both
// sides — the form disables those inputs, the action refuses to store them.
export function clampWeeksToStart<T extends TrainingPlanWeek>(
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

// Whether `endDate` falls between now and `days` days from now (inclusive).
// Lives here rather than inline in the dashboard so the time read stays out of
// component render (React purity).
export function isExpiringWithin(endDate: string, days: number): boolean {
  const diff = new Date(endDate).getTime() - Date.now()
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000
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
