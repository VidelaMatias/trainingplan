import { z } from 'zod'

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

export const clientSchema = z.object({
  first_name: z.string().trim().min(1, 'El nombre es requerido'),
  last_name: z.string().trim().min(1, 'El apellido es requerido'),
  email: nullableEmail,
  phone: nullableText,
  date_of_birth: nullableText,
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
export type PlanWeekInput = z.infer<typeof planWeekSchema>
export type PlanInput = z.infer<typeof planSchema>
export type PaymentInput = z.infer<typeof paymentSchema>
