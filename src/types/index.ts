// Shared domain types. Module-specific derived types live in each module's
// own `types.ts` / `queries.ts`; only cross-cutting shapes belong here.

// Every Server Action returns this discriminated union — it never throws to the
// client. The UI always handles both branches.
export type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: string }

export interface Client {
  id: string
  created_at: string
  created_by: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  date_of_birth: string | null
  goal: string | null
  notes: string | null
  rhythm_notes: string | null
  active: boolean
}

export type ClientInsert = Omit<Client, 'id' | 'created_at'>
export type ClientUpdate = Partial<Omit<ClientInsert, 'created_by'>>

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

// The editable half of a week: only the seven day cells. Identity and dates are
// derived from the plan's start date, so the form never holds them in state.
export type WeekContent = Omit<TrainingPlanWeek, 'id' | 'plan_id' | 'week_number' | 'week_start'>

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

export type PlanWithWeeks = TrainingPlan & { training_plan_weeks?: TrainingPlanWeek[] }

export interface PaymentRecord {
  alumno_id: string
  year: number
  month: number
  paid: boolean
}
