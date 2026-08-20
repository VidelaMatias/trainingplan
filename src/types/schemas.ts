import { z } from 'zod'

import { MAX_OBJECTIVES } from '@/types/constants'

// Optional free-text field coming from FormData: '' / null / whitespace all
// normalize to null so the DB stores a clean absence instead of empty strings.
const nullableText = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null),
  z.string().nullable(),
)

// Same normalization, but validates the email format when a value is present.
const nullableEmail = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null),
  z.string().email('Email inválido').nullable(),
)

// Short optional field: marks and objective times ("21:40", "3:42:10"), never
// prose. Same normalization as nullableText plus a cap, so a pasted paragraph
// can't land in a column the UI renders as a chip.
const nullableShortText = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null),
  z.string().max(40, 'El valor ingresado es demasiado largo').nullable(),
)

// Optional number arriving as a FormData string: '' becomes null and "62,5"
// becomes 62.5, since a coach types either decimal separator. Anything that
// isn't a number is passed through untouched so Zod rejects it, rather than
// being coerced into a silent NaN.
function nullableNumber(opts: { min: number; max: number; int?: boolean; message: string }) {
  const base = opts.int ? z.number().int(opts.message) : z.number()
  return z.preprocess((v) => {
    if (typeof v !== 'string') return v ?? null
    const trimmed = v.trim()
    if (trimmed === '') return null
    const parsed = Number(trimmed.replace(',', '.'))
    return Number.isFinite(parsed) ? parsed : trimmed
  }, base.min(opts.min, opts.message).max(opts.max, opts.message).nullable())
}

// A single day cell in a plan week: empty content collapses to null.
// Whitespace is preserved (not trimmed) — coaches format sessions across lines.
// The cap is far above any real session but keeps a runaway paste out of the DB.
const dayCell = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() !== '' ? v : null),
  z.string().max(2000, 'La sesión de un día es demasiado larga').nullable(),
)

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

export const resetPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
})

export const updatePasswordSchema = z
  .object({
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

// The logged-in change also asks for the current password, unlike the reset
// flow above — that one is reached from an email link precisely because the
// user doesn't know it. Rejecting an unchanged password here saves a round trip
// to Supabase, which would refuse it anyway.
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Ingresá tu contraseña actual'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })
  .refine((d) => d.password !== d.currentPassword, {
    message: 'La nueva contraseña debe ser distinta de la actual',
    path: ['password'],
  })

// One objective of an alumno: a race or milestone plus the time aimed for and,
// once run, the time actually achieved. The form drops rows with no name before
// they get here, so the name can be required.
export const clientObjectiveSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'El objetivo necesita un nombre')
    .max(120, 'El nombre del objetivo es demasiado largo'),
  target_time: nullableShortText,
  achieved_time: nullableShortText,
})

export const clientSchema = z.object({
  first_name: z.string().trim().min(1, 'El nombre es requerido'),
  last_name: z.string().trim().min(1, 'El apellido es requerido'),
  email: nullableEmail,
  phone: nullableText,
  date_of_birth: nullableText,
  // Kept alongside date_of_birth on purpose: coaches usually know the age
  // without knowing the birthday, and the two are filled independently.
  age: nullableNumber({ min: 1, max: 120, int: true, message: 'La edad debe ser un número entero entre 1 y 120' }),
  weight_kg: nullableNumber({ min: 20, max: 300, message: 'El peso debe estar entre 20 y 300 kg' }),
  city: nullableText,
  available_medium: nullableText,
  available_time: nullableText,
  training_days: nullableText,
  pb_5k: nullableShortText,
  pb_10k: nullableShortText,
  pb_21k: nullableShortText,
  pb_42k: nullableShortText,
  // Defaulted rather than required: an alumno without objectives is normal, and
  // the create form can then submit without the field at all.
  objectives: z.array(clientObjectiveSchema).max(MAX_OBJECTIVES, 'Demasiados objetivos').default([]),
  goal: nullableText,
  notes: nullableText,
  rhythm_notes: nullableText,
})

export const planWeekSchema = z.object({
  id: z.string().uuid().optional(),
  plan_id: z.string().uuid().optional(),
  // Accepted for backwards compatibility with the form payload, but ignored:
  // the database derives week_number from array order so it can't be forged.
  week_number: z.number().int().positive().optional(),
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de semana inválida'),
  monday: dayCell,
  tuesday: dayCell,
  wednesday: dayCell,
  thursday: dayCell,
  friday: dayCell,
  saturday: dayCell,
  sunday: dayCell,
})

export const planSchema = z.object({
  title: z.string().trim().min(1, 'El título del plan es requerido'),
  // The coach picks any weekday; weeks stay Monday-anchored, so a mid-week
  // start simply makes the first week partial. Its alignment with the first
  // week is checked in the action, where the date helpers live.
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de inicio inválida'),
  notes: nullableText,
  // Two years of weeks is far beyond any real plan; the cap stops a crafted
  // payload from turning one submit into a huge batch insert.
  weeks: z
    .array(planWeekSchema)
    .min(1, 'El plan debe tener al menos una semana')
    .max(104, 'El plan tiene demasiadas semanas'),
})

// z.uuid() rather than the z.string().uuid() used elsewhere in this file: the
// chained form is deprecated in Zod v4. The older call sites still work, so
// they're left as-is rather than folded into an unrelated change.
export const planIdSchema = z.uuid('Plan inválido')

export const paymentSchema = z.object({
  alumno_id: z.string().uuid('Alumno inválido'),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  paid: z.boolean(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type ClientInput = z.infer<typeof clientSchema>
export type ClientObjectiveInput = z.infer<typeof clientObjectiveSchema>
export type PlanWeekInput = z.infer<typeof planWeekSchema>
export type PlanInput = z.infer<typeof planSchema>
export type PaymentInput = z.infer<typeof paymentSchema>
