export interface TrainingPlanWeek {
  id?: string
  plan_id?: string
  week_number: number
  week_start: string
  monday: string | null
  tuesday: string | null
  wednesday: string | null
  thursday: string | null
  friday: string | null
  saturday: string | null
  sunday: string | null
}

export interface TrainingPlan {
  id: string
  created_at: string
  alumno_id: string
  created_by: string
  title: string
  start_date: string
  end_date: string
  rhythm_notes: string | null
  notes: string | null
  active: boolean
  training_plan_weeks?: TrainingPlanWeek[]
}

export const DAYS = [
  { key: 'monday' as const,    label: 'Lunes' },
  { key: 'tuesday' as const,   label: 'Martes' },
  { key: 'wednesday' as const, label: 'Miércoles' },
  { key: 'thursday' as const,  label: 'Jueves' },
  { key: 'friday' as const,    label: 'Viernes' },
  { key: 'saturday' as const,  label: 'Sábado' },
  { key: 'sunday' as const,    label: 'Domingo' },
]

export type DayKey = typeof DAYS[number]['key']

export function getPlanStatus(plan: { start_date: string; end_date: string }): 'active' | 'expired' | 'upcoming' {
  const today = new Date(new Date().toDateString())
  const start = new Date(plan.start_date + 'T12:00:00')
  const end = new Date(plan.end_date + 'T12:00:00')
  if (today > end) return 'expired'
  if (today < start) return 'upcoming'
  return 'active'
}

export function getNextMonday(from: Date = new Date()): string {
  const d = new Date(from)
  const day = d.getDay()
  const diff = day === 0 ? 1 : 8 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

export function getSundayFrom(monday: string): string {
  const d = new Date(monday + 'T12:00:00')
  d.setDate(d.getDate() + 6)
  return d.toISOString().split('T')[0]
}

export function addWeeks(monday: string, n: number): string {
  const d = new Date(monday + 'T12:00:00')
  d.setDate(d.getDate() + n * 7)
  return d.toISOString().split('T')[0]
}

export function emptyWeek(weekStart: string, weekNumber: number): TrainingPlanWeek {
  return {
    week_number: weekNumber,
    week_start: weekStart,
    monday: null, tuesday: null, wednesday: null, thursday: null,
    friday: null, saturday: null, sunday: null,
  }
}
