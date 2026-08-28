// PostgREST corta toda respuesta en el `max-rows` del proyecto (1000 por
// defecto) y no avisa: el request sale bien y la cola simplemente no está. Una
// lectura que dice "todos los X" y devuelve los primeros 1000 no falla, miente
// — y el bug que salió de ahí (media tabla de pagos sin llegar, y por lo tanto
// casi todos los alumnos listados como deudores) no dio ningún error.
//
// Cualquier query sin `.limit()` propio pasa por acá.

export const POSTGREST_PAGE_SIZE = 1000

export interface PagedError {
  code?: string
  message?: string
  details?: string | null
}

export interface PagedResponse<T> {
  data: T[] | null
  count: number | null
  error: PagedError | null
}

export interface PageRange {
  from: number
  to: number
  /**
   * Sólo true en la primera vuelta. El count exacto es un COUNT(*) sobre la
   * misma query —join y policies incluidos—, así que pedirlo en cada página es
   * repetir ese scan para recalcular siempre el mismo número.
   */
  withCount: boolean
}

/**
 * Lee todas las filas de una query paginando hasta el total real.
 *
 * `fetchPage` tiene que traer un orden total (una clave única), si no el
 * paginado puede saltear o repetir filas entre páginas.
 */
export async function readAllRows<T>(
  fetchPage: (range: PageRange) => PromiseLike<PagedResponse<T>>,
  toError: (error: PagedError) => Error,
): Promise<T[]> {
  const all: T[] = []
  let total = Infinity

  while (all.length < total) {
    const { data, count, error } = await fetchPage({
      from: all.length,
      to: all.length + POSTGREST_PAGE_SIZE - 1,
      withCount: all.length === 0,
    })

    if (error) throw toError(error)

    const page = data ?? []
    // Corta la vuelta pase lo que pase con el count: cada iteración suma al
    // menos una fila o sale, así que el loop no puede quedarse girando.
    if (page.length === 0) break
    all.push(...page)

    // Un count nulo no dice "está todo", dice "no sé". Tomarlo como el total
    // (`count ?? all.length`) colapsaba el loop en una sola página y devolvía
    // exactamente las 1000 filas truncadas, en silencio. Sin count se sigue
    // paginando hasta que una página vuelva vacía.
    if (count !== null && count !== undefined) total = count
  }

  return all
}
