// Comparación de texto en español, compartida por todo lo que ordena.
//
// Vivía dentro del módulo de alumnos, pero el reporte de métodos de pago ordena
// los mismos nombres y usaba `String.localeCompare`, que es sensible a los
// acentos: «Alvarez» y «Álvarez» quedaban en un orden en la lista de alumnos y
// en el otro en el reporte. Además localeCompare construye un Intl.Collator por
// llamada, y un sort las hace O(n log n) veces.

// Colación española: los acentos no reordenan y la ñ va después de la n.
const collator = new Intl.Collator('es', { sensitivity: 'base' })

export function compareText(a: string, b: string): number {
  return collator.compare(a, b)
}
