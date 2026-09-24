import assert from 'node:assert/strict'
import { describe, it, mock } from 'node:test'

import {
  PAGE_CONCURRENCY,
  readAllRows,
  type PageRange,
  type PagedResponse,
} from '@/lib/supabase/paged'

// Una tabla en memoria que se comporta como PostgREST: corta cada respuesta en
// `maxRows` y sólo manda el count cuando se lo piden (y si `withCount` está).
// `ticksFor` demora cada página esa cantidad de vueltas del event loop, para
// simular una respuesta lenta.
function fakeTable(
  size: number,
  {
    maxRows = 1000,
    withCount = true,
    ticksFor = (() => 1) as (from: number) => number,
  } = {},
) {
  const rows = Array.from({ length: size }, (_, i) => i)
  const calls: PageRange[] = []
  let inFlight = 0
  let peakInFlight = 0

  async function fetchPage(range: PageRange): Promise<PagedResponse<number>> {
    calls.push(range)
    inFlight += 1
    peakInFlight = Math.max(peakInFlight, inFlight)
    for (let i = 0; i < ticksFor(range.from); i += 1) {
      await new Promise((resolve) => setImmediate(resolve))
    }
    inFlight -= 1
    const to = Math.min(range.to, range.from + maxRows - 1)
    return {
      data: rows.slice(range.from, to + 1),
      count: range.withCount && withCount ? size : null,
      error: null,
    }
  }

  return { rows, calls, fetchPage, peak: () => peakInFlight }
}

const toError = () => new Error('boom')

describe('readAllRows', () => {
  it('devuelve una tabla chica en una sola página', async () => {
    const table = fakeTable(40)
    assert.deepEqual(await readAllRows(table.fetchPage, toError), table.rows)
    assert.equal(table.calls.length, 1)
  })

  it('pide en paralelo todas las páginas que faltan una vez que sabe el total', async () => {
    const table = fakeTable(3500)
    assert.deepEqual(await readAllRows(table.fetchPage, toError), table.rows)
    assert.equal(table.calls.length, 4)
    // Las tres que siguen a la primera salen juntas, no una detrás de otra.
    assert.equal(table.peak(), 3)
    // El count sólo en la primera: pedirlo de nuevo repetía el mismo scan.
    assert.deepEqual(
      table.calls.map((c) => c.withCount),
      [true, false, false, false],
    )
  })

  it('no pide más de PAGE_CONCURRENCY páginas a la vez', async () => {
    const table = fakeTable(12_000, { maxRows: 500 })
    assert.deepEqual(await readAllRows(table.fetchPage, toError), table.rows)
    assert.equal(table.calls.length, 24)
    assert.equal(table.peak(), PAGE_CONCURRENCY)
  })

  it('una página lenta no frena a las demás', async () => {
    // En tandas fijas, la página lenta retenía a toda la tanda siguiente; con la
    // ventana deslizante el resto sigue saliendo mientras ella tarda.
    let startedWhileSlow = 0
    let slowPending = false
    const table = fakeTable(13_000, { ticksFor: (from) => (from === 1000 ? 50 : 1) })
    const fetchPage = (range: PageRange): Promise<PagedResponse<number>> => {
      if (range.from === 1000) slowPending = true
      else if (slowPending) startedWhileSlow += 1
      return table.fetchPage(range).finally(() => {
        if (range.from === 1000) slowPending = false
      })
    }
    assert.deepEqual(await readAllRows(fetchPage, toError), table.rows)
    assert.equal(startedWhileSlow, 11)
    assert.equal(table.peak(), PAGE_CONCURRENCY)
  })

  it('relee una vez si las filas no cierran con el count', async () => {
    // Una fila borrada entre el count y la página siguiente corre los offsets.
    const table = fakeTable(2500)
    let reads = 0
    const fetchPage = async (range: PageRange): Promise<PagedResponse<number>> => {
      if (range.withCount) reads += 1
      const page = await table.fetchPage(range)
      return reads === 1 && range.from === 1000 ? { ...page, data: page.data!.slice(1) } : page
    }
    assert.deepEqual(await readAllRows(fetchPage, toError), table.rows)
    assert.equal(reads, 2)
  })

  it('avisa si tampoco cierra al releer, sin tirar la página abajo', async () => {
    const warn = mock.method(console, 'warn', () => {})
    try {
      const table = fakeTable(2500)
      const fetchPage = async (range: PageRange): Promise<PagedResponse<number>> => {
        const page = await table.fetchPage(range)
        return range.from === 1000 ? { ...page, data: page.data!.slice(1) } : page
      }
      assert.equal((await readAllRows(fetchPage, toError)).length, 2499)
      assert.equal(warn.mock.callCount(), 1)
    } finally {
      warn.mock.restore()
    }
  })

  it('pagina con lo que la base devolvió cuando max-rows es menor a 1000', async () => {
    const table = fakeTable(1200, { maxRows: 500 })
    assert.deepEqual(await readAllRows(table.fetchPage, toError), table.rows)
    assert.deepEqual(
      table.calls.map((c) => c.from),
      [0, 500, 1000],
    )
  })

  it('sin count sigue de a una página hasta que vuelva vacía', async () => {
    const table = fakeTable(2500, { withCount: false })
    assert.deepEqual(await readAllRows(table.fetchPage, toError), table.rows)
    assert.equal(table.calls.length, 4)
    assert.equal(table.peak(), 1)
  })

  it('devuelve vacío sin más pedidos cuando no hay filas', async () => {
    const table = fakeTable(0)
    assert.deepEqual(await readAllRows(table.fetchPage, toError), [])
    assert.equal(table.calls.length, 1)
  })

  it('propaga el error de cualquier página', async () => {
    const table = fakeTable(2500)
    const failing = async (range: PageRange): Promise<PagedResponse<number>> =>
      range.from === 2000
        ? { data: null, count: null, error: { message: 'max-rows' } }
        : table.fetchPage(range)
    await assert.rejects(readAllRows(failing, toError), /boom/)
  })
})
