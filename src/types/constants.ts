// Central catalog of enum-like values and their Spanish UI metadata. Never use
// raw strings like 'active' in logic — reference these instead.

import { ArrowLeftRight, Banknote, HelpCircle, type LucideIcon } from 'lucide-react'

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

// Con mayúscula inicial: la app los muestra así en todos lados (etiquetas de
// cuota, resúmenes de deuda) y los formateadores de lib/date capitalizan los que
// arma Intl, así que las dos fuentes de nombres de mes coinciden.
export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const

// Ventana de "vence esta semana": la usan el contador del panel y la lista que
// ese contador abre, así que vive acá para que no puedan desincronizarse.
export const EXPIRING_SOON_DAYS = 7

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

// Orden de la columna «Plan»: primero lo que reclama atención hoy (un plan
// activo), después lo que viene, y al fondo lo que ya no corre. Es un orden de
// urgencia, no alfabético, así que vive acá junto a las etiquetas.
export const PLAN_SORT_ORDER: Record<PlanStatus | 'none', number> = {
  [PLAN_STATUS.ACTIVE]: 0,
  [PLAN_STATUS.UPCOMING]: 1,
  [PLAN_STATUS.EXPIRED]: 2,
  none: 3,
}

// Vistas filtradas de la lista de alumnos. Cada tile del panel enlaza a una de
// ellas con ?filter=…, así que la key viaja en la URL y es parte del contrato:
// renombrarla rompe los links guardados.
export const CLIENT_FILTERS = {
  ACTIVE: 'active',
  WITH_ACTIVE_PLAN: 'with-active-plan',
  EXPIRING: 'expiring',
  DEBTORS: 'debtors',
} as const

export type ClientFilter = (typeof CLIENT_FILTERS)[keyof typeof CLIENT_FILTERS]

// Título de la vista filtrada y qué decir cuando no queda ningún alumno en ella.
export const CLIENT_FILTER_META: Record<ClientFilter, { title: string; empty: string }> = {
  [CLIENT_FILTERS.ACTIVE]: {
    title: 'Alumnos activos',
    empty: 'No hay alumnos activos',
  },
  [CLIENT_FILTERS.WITH_ACTIVE_PLAN]: {
    title: 'Alumnos con plan activo',
    empty: 'Ningún alumno tiene un plan activo',
  },
  [CLIENT_FILTERS.EXPIRING]: {
    title: 'Alumnos con planes que vencen esta semana',
    empty: 'Ningún plan vence esta semana',
  },
  [CLIENT_FILTERS.DEBTORS]: {
    title: 'Alumnos con cuotas pendientes',
    empty: 'Todos los alumnos están al día',
  },
}

// Cómo se cobró una cuota. Las keys son los valores que viajan a la columna
// `payments.method` (ver add_payment_method.sql), así que renombrarlas obliga a
// migrar los datos.
export const PAYMENT_METHODS = {
  CASH: 'cash',
  TRANSFER: 'transfer',
} as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS]

// El orden es el de los botones al marcar una cuota como pagada.
export const PAYMENT_METHOD_LIST: PaymentMethod[] = [
  PAYMENT_METHODS.CASH,
  PAYMENT_METHODS.TRANSFER,
]

// `unspecified` no es una forma de cobrar: es el resto. Cae acá una cuota
// cobrada antes de que existiera la columna y, por defensa en runtime, una con
// un método que esta versión no conoce — la columna tiene un check, pero una
// fila escrita por fuera de la app no puede desaparecer del total.
export const UNSPECIFIED_METHOD = 'unspecified'

// Las columnas del reporte: los métodos reales y, al final, el resto. Agregar
// un método a PAYMENT_METHODS lo suma acá y rompe METHOD_META hasta que se le
// dé etiqueta y color, que es exactamente el recordatorio que se quiere.
export type MethodBucket = PaymentMethod | typeof UNSPECIFIED_METHOD

export const METHOD_BUCKETS: MethodBucket[] = [...PAYMENT_METHOD_LIST, UNSPECIFIED_METHOD]

// Etiqueta y colores de cada columna del reporte. Un solo lugar: antes el gris
// de "Sin especificar" estaba escrito a mano en la barra y otra vez en su punto
// de la leyenda, y cambiar uno dejaba la leyenda nombrando un color que ya no
// existía en el gráfico.
export const METHOD_META: Record<
  MethodBucket,
  { label: string; icon: LucideIcon; barClassName: string; textClassName: string }
> = {
  [PAYMENT_METHODS.CASH]: {
    label: 'Efectivo',
    icon: Banknote,
    barClassName: 'bg-green-500',
    textClassName: 'text-green-700',
  },
  [PAYMENT_METHODS.TRANSFER]: {
    label: 'Transferencia',
    icon: ArrowLeftRight,
    barClassName: 'bg-blue-500',
    textClassName: 'text-blue-700',
  },
  [UNSPECIFIED_METHOD]: {
    label: 'Sin especificar',
    icon: HelpCircle,
    barClassName: 'bg-slate-300',
    textClassName: 'text-muted-foreground',
  },
}

// Colores del chip al elegir cómo se cobró. Separado de METHOD_META porque sólo
// aplica a los métodos reales — no hay un botón "Sin especificar".
export const PAYMENT_METHOD_CHIP: Record<PaymentMethod, string> = {
  [PAYMENT_METHODS.CASH]: 'bg-green-100 text-green-700 hover:bg-green-200',
  [PAYMENT_METHODS.TRANSFER]: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
}

// Meses que abarca el desglose mensual del reporte de métodos de pago.
export const METHOD_REPORT_MONTHS = 12

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

// Marcas referenciales del alumno: las cuatro distancias de ruta que el
// formulario y la ficha muestran en este orden. La `key` es la columna en
// `alumnos`, así que la lista es la única fuente de verdad de ese mapeo.
export const REFERENCE_DISTANCES = [
  { key: 'pb_5k' as const, label: '5K' },
  { key: 'pb_10k' as const, label: '10K' },
  { key: 'pb_21k' as const, label: '21K' },
  { key: 'pb_42k' as const, label: '42K' },
]

export type ReferenceDistanceKey = (typeof REFERENCE_DISTANCES)[number]['key']

// Tope de objetivos por alumno. Muy por encima de cualquier caso real, pero
// evita que un payload armado a mano infle la fila con un array gigante.
export const MAX_OBJECTIVES = 20

// Filas por página en todos los listados (alumnos, planes, deudores).
export const PAGE_SIZE = 10

// Cuántos meses adeudados se nombran en la celda «Cuota» del listado antes de
// resumir el resto en «+N más». Un alumno viejo que nunca pagó puede deber
// decenas de meses, y enumerarlos todos estiraba su fila hasta empujar al resto
// de la tabla fuera de la pantalla. El detalle completo se despliega al tocarlo,
// y en el panel de cuotas pendientes cada mes es un botón.
export const OWED_PREVIEW_MONTHS = 3
