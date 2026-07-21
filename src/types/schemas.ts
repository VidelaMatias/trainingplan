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
const dayCell = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() !== '' ? v : null),
  z.string().nullable(),
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
  week_number: z.number().int().positive(),
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
  weeks: z.array(planWeekSchema).min(1, 'El plan debe tener al menos una semana'),
})

export const paymentSchema = z.object({
  alumno_id: z.string().uuid('Alumno inválido'),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  paid: z.boolean(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>
export type ClientInput = z.infer<typeof clientSchema>
export type PlanWeekInput = z.infer<typeof planWeekSchema>
export type PlanInput = z.infer<typeof planSchema>
export type PaymentInput = z.infer<typeof paymentSchema>
