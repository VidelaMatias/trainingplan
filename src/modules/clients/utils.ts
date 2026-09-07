// Pure helpers behind the client list's search box, name ordering and the
// filtered views the dashboard links to. They live here rather than inside the
// component so the interesting behaviour — accent folding, multi-word queries,
// Spanish collation, what each dashboard tile means — is testable on its own.

import {
  CLIENT_FILTERS,
  EXPIRING_SOON_DAYS,
  PLAN_STATUS,
  type ClientFilter,
} from '@/types/constants'
import { compareText } from '@/lib/text'
import { getPlanStatus, isExpiringWithin } from '@/modules/plans/utils'

export interface SearchableClient {
  first_name: string
  last_name: string
}

// Case- and accent-insensitive. Decomposing to NFD and dropping the combining
// marks makes "perez" match "Pérez"; it also folds ñ to n, so "nunez" finds
// "Núñez" — what a coach typing quickly on a phone, without accents, expects.
export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

// The normalized "first last" string a query is matched against.
export function nameHaystack(client: SearchableClient): string {
  return normalizeName(`${client.first_name} ${client.last_name}`)
}

// Splits a raw query into normalized words. Empty when the query is blank, in
// which case nothing should be filtered out.
export function searchTokens(query: string): string[] {
  return normalizeName(query).split(/\s+/).filter(Boolean)
}

// Every token has to appear somewhere in the name, so "perez juan" matches
// "Juan Pérez" no matter which order the words were typed in.
export function matchesTokens(haystack: string, tokens: string[]): boolean {
  return tokens.every((token) => haystack.includes(token))
}

// Ordena por «nombre apellido» con la colación española compartida (ver
// lib/text): el mismo par de alumnos queda en el mismo orden acá y en el
// reporte de métodos de pago, que ordena los mismos nombres.
export function compareByName(a: SearchableClient, b: SearchableClient): number {
  return compareText(`${a.first_name} ${a.last_name}`, `${b.first_name} ${b.last_name}`)
}

// ── Ritmos de referencia ────────────────────────────────────────────────────
// Cada línea del bloque es «etiqueta: valor» (por ejemplo «Ritmo U (Umbral de
// lactato): 3:15 a 3:20 x mil»). La app y el Excel exportado la pintan igual:
// la etiqueta en rojo subrayado y el valor en azul, así que dónde termina una y
// empieza el otro se decide una sola vez acá.

export interface RhythmLine {
  /** Texto anterior a los dos puntos, ya con el «:» incluido. Null si no hay. */
  label: string | null
  value: string
}

export function parseRhythmLine(line: string): RhythmLine {
  // Sólo el primer «:»: el valor suele traer más («200 MTS: 31/34 SEG», horarios
  // como «3:15»), y partir por todos rompería la etiqueta en pedazos.
  const colon = line.indexOf(':')
  if (colon === -1) return { label: null, value: line }

  return {
    label: line.slice(0, colon + 1),
    value: line.slice(colon + 1),
  }
}

// Las líneas en blanco separan bloques en el textarea pero no aportan nada al
// render, así que se descartan una sola vez para todos los consumidores.
export function parseRhythmNotes(notes: string): RhythmLine[] {
  return notes.split('\n').filter(Boolean).map(parseRhythmLine)
}

// ── Vistas filtradas ────────────────────────────────────────────────────────
// Cada tile del panel abre la lista de alumnos con un ?filter=…, y lo que ese
// filtro significa se define una sola vez acá: el número del tile y la lista
// que abre salen de la misma regla, así que no pueden contar cosas distintas.

// The fields a filter looks at. Structural, like SearchableClient, so this stays
// independent of the row shape the list component renders.
export interface FilterableClient {
  active: boolean
  plans: { start_date: string; end_date: string }[]
  owedCount: number
}

// Only the keys the panel links to are accepted; anything else (a stale link, a
// hand-typed URL) falls back to the unfiltered list rather than an empty one.
export function parseClientFilter(value: string | undefined): ClientFilter | null {
  const known: readonly string[] = Object.values(CLIENT_FILTERS)
  return value !== undefined && known.includes(value) ? (value as ClientFilter) : null
}

export function matchesClientFilter(client: FilterableClient, filter: ClientFilter): boolean {
  switch (filter) {
    case CLIENT_FILTERS.ACTIVE:
      return client.active
    // Sobre todos los planes del alumno, no sobre el que muestra la fila: quien
    // tiene dos planes solapados igual entra si alguno está activo o por vencer.
    case CLIENT_FILTERS.WITH_ACTIVE_PLAN:
      return client.plans.some((plan) => getPlanStatus(plan) === PLAN_STATUS.ACTIVE)
    case CLIENT_FILTERS.EXPIRING:
      return client.plans.some(
        (plan) =>
          getPlanStatus(plan) === PLAN_STATUS.ACTIVE &&
          isExpiringWithin(plan.end_date, EXPIRING_SOON_DAYS),
      )
    // El panel cuenta deudores sólo entre los alumnos activos: uno dado de baja
    // no se reclama, y contarlo acá dejaría el tile y la lista en desacuerdo.
    case CLIENT_FILTERS.DEBTORS:
      return client.active && client.owedCount > 0
  }
}
