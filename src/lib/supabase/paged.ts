// PostgREST corta toda respuesta en el `max-rows` del proyecto (1000 por
// defecto) y no avisa: el request sale bien y la cola simplemente no está. Una
// lectura que dice "todos los X" y devuelve los primeros 1000 no falla, miente
// — y el bug que salió de ahí (media tabla de pagos sin llegar, y por lo tanto
// casi todos los alumnos listados como deudores) no dio ningún error.
//
// Cualquier query sin `.limit()` propio pasa por acá.

export const POSTGREST_PAGE_SIZE = 1000

// Cuántas páginas se piden a la vez una vez conocido el total. Una página de
// render lee varias tablas en paralelo, así que esto se multiplica.
export const PAGE_CONCURRENCY = 4

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
  const first = await readOnce(fetchPage, toError)
  if (first.complete) return first.rows

  // El paginado por offset no es una foto: si entre el count y las páginas
  // siguientes se borran o agregan filas, los offsets se corren y alguna fila
  // queda sin leer. Es justo el faltante silencioso que este archivo existe para
  // evitar, así que se relee una vez —un pago marcado a mitad de lectura no
  // debería dejar al alumno como deudor— y si vuelve a no cerrar, se avisa.
  const retry = await readOnce(fetchPage, toError)
  if (!retry.complete) {
    console.warn('[paged] read did not match its count', {
      count: retry.count,
      rows: retry.rows.length,
    })
  }
  return retry.rows
}

interface ReadResult<T> {
  rows: T[]
  count: number | null
  // Sin count no hay contra qué comparar: se da por completa.
  complete: boolean
}

async function readOnce<T>(
  fetchPage: (range: PageRange) => PromiseLike<PagedResponse<T>>,
  toError: (error: PagedError) => Error,
): Promise<ReadResult<T>> {
  const first = await fetchPage({ from: 0, to: POSTGREST_PAGE_SIZE - 1, withCount: true })
  if (first.error) throw toError(first.error)

  const firstRows = first.data ?? []
  const total = first.count
  if (firstRows.length === 0) {
    return { rows: [], count: total ?? null, complete: !total }
  }

  if (total === null || total === undefined) {
    const rows = await readRemainingInSeries(firstRows, fetchPage, toError)
    return { rows, count: null, complete: true }
  }

  // Con el total en la mano, las páginas que faltan ya no dependen de nada: se
  // piden con hasta PAGE_CONCURRENCY en vuelo a la vez, y apenas una termina
  // sale la siguiente. En serie, cada una esperaba a la anterior (una tabla de
  // 3.000 pagos eran tres idas y vueltas en lugar de dos); todas juntas, una
  // tabla grande o un max-rows bajo disparaban decenas de requests contra el
  // pooler; en tandas fijas, una página lenta frenaba la tanda siguiente. El paso
  // es lo que la primera página trajo de verdad y no el tamaño pedido: con un
  // max-rows menor a 1000, pedir de a 1000 dejaría huecos entre páginas.
  const step = firstRows.length
  const starts: number[] = []
  for (let from = step; from < total; from += step) starts.push(from)

  const pages: T[][] = new Array(starts.length)
  let next = 0
  let failed = false

  async function worker(): Promise<void> {
    // Después de un error no sale ningún pedido más: el resultado ya se perdió.
    while (!failed && next < starts.length) {
      const index = next++
      const from = starts[index]
      try {
        const page = await fetchPage({ from, to: from + step - 1, withCount: false })
        if (page.error) throw toError(page.error)
        pages[index] = page.data ?? []
      } catch (error) {
        failed = true
        throw error
      }
    }
  }

  const workers = Array.from({ length: Math.min(PAGE_CONCURRENCY, starts.length) }, worker)
  await Promise.all(workers)

  const rows = firstRows.concat(...pages)
  return { rows, count: total, complete: rows.length === total }
}

// Un count nulo no dice "está todo", dice "no sé". Tomarlo como el total
// (`count ?? all.length`) colapsaba la lectura en una sola página y devolvía
// exactamente las 1000 filas truncadas, en silencio. Sin count no hay cómo
// saber cuántas páginas faltan: se sigue de a una hasta que una vuelva vacía.
// Cada vuelta suma al menos una fila o sale, así que no puede quedarse girando.
async function readRemainingInSeries<T>(
  firstRows: T[],
  fetchPage: (range: PageRange) => PromiseLike<PagedResponse<T>>,
  toError: (error: PagedError) => Error,
): Promise<T[]> {
  const all = [...firstRows]
  for (;;) {
    const { data, error } = await fetchPage({
      from: all.length,
      to: all.length + POSTGREST_PAGE_SIZE - 1,
      withCount: false,
    })
    if (error) throw toError(error)

    const page = data ?? []
    if (page.length === 0) return all
    all.push(...page)
  }
}
