// Shared domain types. Module-specific derived types live in each module's
// own `types.ts` / `queries.ts`; only cross-cutting shapes belong here.

import type { PaymentMethod } from '@/types/constants'

// Every Server Action returns this discriminated union — it never throws to the
// client. The UI always handles both branches.
export type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: string }

// A race or milestone the alumno is training for. Stored as a jsonb array on
// `alumnos` rather than its own table: objectives are only ever read and
// written together with the alumno, through the same form.
export interface ClientObjective {
  name: string
  target_time: string | null
  achieved_time: string | null
}

export interface Client {
  id: string
  created_at: string
  created_by: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  date_of_birth: string | null
  age: number | null
  weight_kg: number | null
  city: string | null
  // Free text on purpose — "cinta y plaza del barrio" is as valid an answer as
  // "pista de atletismo", and the coach reads these, no code branches on them.
  available_medium: string | null
  available_time: string | null
  training_days: string | null
  // Marcas referenciales: best known times per distance, as the coach writes
  // them ("21:40", "1h58"). See REFERENCE_DISTANCES for the display order.
  pb_5k: string | null
  pb_10k: string | null
  pb_21k: string | null
  pb_42k: string | null
  objectives: ClientObjective[]
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
  // Null on a fee recorded before the method column existed, and on every
  // unpaid row — the database enforces the second case.
  method: PaymentMethod | null
}
