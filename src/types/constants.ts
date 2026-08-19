// Central catalog of enum-like values and their Spanish UI metadata. Never use
// raw strings like 'active' in logic — reference these instead.

import type { BadgeVariant } from '@/components/ui/badge'

// Todas las fechas del dominio (inicio/fin de plan, meses de cuota) son fechas
// de calendario en la zona del entrenador, no instantes. El servidor corre en
// UTC, así que "hoy" SIEMPRE se deriva de esta zona y nunca del reloj local del
// proceso — si no, entre las 21:00 y las 24:00 de Argentina el servidor ya pasó
// de día y los planes vigentes se muestran vencidos.
export const APP_TIMEZONE = 'America/Argentina/Buenos_Aires'

export const DAYS = [
  { key: 'monday' as const, label: 'Lunes' },
  { key: 'tuesday' as const, label: 'Martes' },
  { key: 'wednesday' as const, label: 'Miércoles' },
  { key: 'thursday' as const, label: 'Jueves' },
  { key: 'friday' as const, label: 'Viernes' },
  { key: 'saturday' as const, label: 'Sábado' },
  { key: 'sunday' as const, label: 'Domingo' },
]

export type DayKey = (typeof DAYS)[number]['key']

export const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const

export const PLAN_STATUS = {
  ACTIVE: 'active',
  UPCOMING: 'upcoming',
  EXPIRED: 'expired',
} as const

export type PlanStatus = (typeof PLAN_STATUS)[keyof typeof PLAN_STATUS]

// Label + badge variant shown on a plan's own card.
export const PLAN_STATUS_META: Record<PlanStatus, { label: string; variant: BadgeVariant }> = {
  [PLAN_STATUS.ACTIVE]: { label: 'Activo', variant: 'success' },
  [PLAN_STATUS.UPCOMING]: { label: 'Próximo', variant: 'info' },
  [PLAN_STATUS.EXPIRED]: { label: 'Vencido', variant: 'neutral' },
}

// Label + badge variant used in the client list "Plan" column, where a client
// may also have no plan at all.
export const PLAN_LIST_BADGE: Record<PlanStatus | 'none', { label: string; variant: BadgeVariant }> = {
  [PLAN_STATUS.ACTIVE]: { label: 'Plan activo', variant: 'info' },
  [PLAN_STATUS.UPCOMING]: { label: 'Plan próximo', variant: 'warning' },
  [PLAN_STATUS.EXPIRED]: { label: 'Plan vencido', variant: 'danger' },
  none: { label: 'Sin plan', variant: 'neutral' },
}

export const DEFAULT_RHYTHM_NOTES = `Ritmo U (Umbral de lactato): 3:15 a 3:20 x mil
Ritmo S/L (Suave/Largo): 4:30 a 5:10 x mil (si estás muy agotado ó fondo de semana POST DÍA INTENSO mas despacio)

Ritmo I (Intervalado): 3 a 3:12 X MIL
Ritmo M (Maratón): 3:35 A 3:40 X MIL

A/D (Aceleración/Desaceleración): 15 SEG RÁPIDOS X 45 SEG TROTE SUAVE

Ritmo R (Repetición): 200 MTS: 31/34 SEG  300 MTS: 51/55 SEG  400 MTS: 71/75 SEG

Fartlek Corto (Cambios de ritmo): (3 min- 2 min- 1 min) a ritmo medio, siempre recup 2 min trote. Sería: 3 min medio- 2 min suave- 2 min medio- 2 min S-1 min medio- 2 min S Y volver a comenzar con 3 min medio- 2 min S….
Fartlek Largo (Cambios de ritmo): (6 MIN- 4 MIN - 2 MIN) siempre recup 2 min trote suave

Ritmo Medio: Escala de percepción de esfuerzo de 8 puntos sobre 10. En llano, ritmo cercano al U.

Fartlek Activación (Cambios de ritmo): 1 min ritmo medio x 1 min trote suave.`
