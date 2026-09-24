import assert from 'node:assert/strict'
import { afterEach, describe, it, mock } from 'node:test'

import {
  compareByName,
  matchesClientFilter,
  matchesTokens,
  nameHaystack,
  normalizeName,
  parseClientFilter,
  parseRhythmLine,
  parseRhythmNotes,
  searchTokens,
  withClientFilter,
  type FilterableClient,
  type SearchableClient,
} from '@/modules/clients/utils'
import { CLIENT_FILTERS } from '@/types/constants'

const client = (first_name: string, last_name: string): SearchableClient => ({
  first_name,
  last_name,
})

// Matches the way the list filters: normalize the name once, then test tokens.
const matches = (c: SearchableClient, query: string) =>
  matchesTokens(nameHaystack(c), searchTokens(query))

describe('normalizeName', () => {
  it('lowercases', () => {
    assert.equal(normalizeName('JUAN'), 'juan')
  })

  it('strips accents', () => {
    assert.equal(normalizeName('Pérez'), 'perez')
    assert.equal(normalizeName('MARTÍNEZ'), 'martinez')
  })

  it('folds ñ to n, so an unaccented keyboard still finds the name', () => {
    assert.equal(normalizeName('Núñez'), 'nunez')
    assert.equal(normalizeName('Peña'), 'pena')
  })
})

describe('searchTokens', () => {
  it('splits on whitespace and normalizes each word', () => {
    assert.deepEqual(searchTokens('Juan  Pérez'), ['juan', 'perez'])
  })

  it('is empty for a blank query, so nothing gets filtered out', () => {
    assert.deepEqual(searchTokens(''), [])
    assert.deepEqual(searchTokens('    '), [])
  })
})

describe('search matching', () => {
  const juan = client('Juan', 'Pérez')

  it('matches on first name', () => {
    assert.equal(matches(juan, 'juan'), true)
  })

  it('matches on last name', () => {
    assert.equal(matches(juan, 'perez'), true)
  })

  it('matches a partial fragment', () => {
    assert.equal(matches(juan, 'pere'), true)
    assert.equal(matches(juan, 'ua'), true)
  })

  it('ignores accents typed either way round', () => {
    assert.equal(matches(juan, 'pérez'), true)
    assert.equal(matches(client('Ana', 'Nuñez'), 'núñez'), true)
  })

  it('ignores case', () => {
    assert.equal(matches(juan, 'JUAN'), true)
  })

  it('matches both words regardless of the order typed', () => {
    assert.equal(matches(juan, 'juan perez'), true)
    assert.equal(matches(juan, 'perez juan'), true)
  })

  it('requires every token to match', () => {
    assert.equal(matches(juan, 'juan gomez'), false)
  })

  it('does not match an unrelated name', () => {
    assert.equal(matches(juan, 'rodriguez'), false)
  })

  it('matches everyone when the query is blank', () => {
    assert.equal(matches(juan, ''), true)
    assert.equal(matches(juan, '   '), true)
  })
})

describe('compareByName', () => {
  const sorted = (clients: SearchableClient[]) =>
    [...clients].sort(compareByName).map((c) => `${c.first_name} ${c.last_name}`)

  it('orders alphabetically by first then last name', () => {
    assert.deepEqual(
      sorted([client('Carlos', 'Diaz'), client('Ana', 'Blanco'), client('Beto', 'Ruiz')]),
      ['Ana Blanco', 'Beto Ruiz', 'Carlos Diaz'],
    )
  })

  it('separates people who share a first name by last name', () => {
    assert.deepEqual(
      sorted([client('Ana', 'Zapata'), client('Ana', 'Blanco')]),
      ['Ana Blanco', 'Ana Zapata'],
    )
  })

  it('does not push accented names to the end', () => {
    // A plain codepoint sort would put "Álvarez" after "Zapata"; Spanish
    // collation keeps it where a reader expects to find it.
    assert.deepEqual(
      sorted([client('Zoe', 'Zapata'), client('Álvaro', 'Alvarez'), client('Bruno', 'Costa')]),
      ['Álvaro Alvarez', 'Bruno Costa', 'Zoe Zapata'],
    )
  })

  it('reverses cleanly for descending order', () => {
    const clients = [client('Ana', 'Blanco'), client('Carlos', 'Diaz'), client('Beto', 'Ruiz')]
    const descending = [...clients]
      .sort((a, b) => compareByName(b, a))
      .map((c) => c.first_name)
    assert.deepEqual(descending, ['Carlos', 'Beto', 'Ana'])
  })
})


// ── Vistas filtradas del panel ──────────────────────────────────────────────

// 2026-08-19 12:00 in Argentina — mid-day, so the server date and the trainer's
// date agree and the assertions isolate the filter logic itself.
const MIDDAY = '2026-08-19T15:00:00Z'

function freezeAtMidday(): void {
  mock.timers.enable({ apis: ['Date'], now: new Date(MIDDAY).getTime() })
}

const filterable = (overrides: Partial<FilterableClient> = {}): FilterableClient => ({
  active: true,
  plans: [],
  owedCount: 0,
  ...overrides,
})

const RUNNING = { start_date: '2026-08-01', end_date: '2026-09-30' }
const ENDING_FRIDAY = { start_date: '2026-08-01', end_date: '2026-08-21' }
const FINISHED = { start_date: '2026-06-01', end_date: '2026-07-31' }

afterEach(() => {
  mock.timers.reset()
})

describe('parseRhythmLine', () => {
  it('splits label from value at the colon', () => {
    assert.deepEqual(parseRhythmLine('Ritmo U (Umbral de lactato): 3:15 a 3:20 x mil'), {
      label: 'Ritmo U (Umbral de lactato):',
      value: ' 3:15 a 3:20 x mil',
    })
  })

  it('only splits at the first colon', () => {
    // Los valores traen sus propios «:» (distancias, tiempos); partir por todos
    // dejaría la etiqueta hecha pedazos y el resto sin color.
    assert.deepEqual(parseRhythmLine('Ritmo R (Repetición): 200 MTS: 31/34 SEG'), {
      label: 'Ritmo R (Repetición):',
      value: ' 200 MTS: 31/34 SEG',
    })
  })

  it('treats a line without a colon as all value', () => {
    assert.deepEqual(parseRhythmLine('Sin etiqueta'), { label: null, value: 'Sin etiqueta' })
  })
})

describe('parseRhythmNotes', () => {
  it('drops blank lines and parses the rest', () => {
    const lines = parseRhythmNotes('Ritmo M: 3:35 x mil\n\nRitmo I: 3 x mil')
    assert.deepEqual(lines, [
      { label: 'Ritmo M:', value: ' 3:35 x mil' },
      { label: 'Ritmo I:', value: ' 3 x mil' },
    ])
  })
})

describe('parseClientFilter', () => {
  it('accepts every key the panel links to', () => {
    for (const key of Object.values(CLIENT_FILTERS)) {
      assert.equal(parseClientFilter(key), key)
    }
  })

  it('falls back to no filter for anything else', () => {
    // A stale bookmark or a hand-typed URL should show the whole list, not an
    // empty one that reads as "no tenés alumnos".
    for (const bad of [undefined, '', 'activos', 'debtors ', '../../etc/passwd', ['expiring']]) {
      assert.equal(parseClientFilter(bad), null)
    }
  })
})

describe('withClientFilter', () => {
  it('carries the filtered view in the query string', () => {
    assert.equal(
      withClientFilter('/dashboard/clients/abc', CLIENT_FILTERS.EXPIRING),
      '/dashboard/clients/abc?filter=expiring',
    )
  })

  it('leaves the path alone when there is no filter', () => {
    assert.equal(withClientFilter('/dashboard/clients', null), '/dashboard/clients')
    assert.equal(withClientFilter('/dashboard/clients', undefined), '/dashboard/clients')
  })
})

describe('matchesClientFilter', () => {
  it('active: only alumnos that are not dados de baja', () => {
    freezeAtMidday()
    assert.equal(matchesClientFilter(filterable({ active: true }), CLIENT_FILTERS.ACTIVE), true)
    assert.equal(matchesClientFilter(filterable({ active: false }), CLIENT_FILTERS.ACTIVE), false)
  })

  it('with-active-plan: any plan running today counts', () => {
    freezeAtMidday()
    const filter = CLIENT_FILTERS.WITH_ACTIVE_PLAN
    assert.equal(matchesClientFilter(filterable({ plans: [RUNNING] }), filter), true)
    assert.equal(matchesClientFilter(filterable({ plans: [FINISHED] }), filter), false)
    assert.equal(matchesClientFilter(filterable({ plans: [] }), filter), false)
    // Looks at every plan, not just the first: the row badge picks one plan to
    // show, the filter must not inherit that choice.
    assert.equal(matchesClientFilter(filterable({ plans: [FINISHED, RUNNING] }), filter), true)
  })

  it('expiring: an active plan ending within the week', () => {
    freezeAtMidday()
    const filter = CLIENT_FILTERS.EXPIRING
    assert.equal(matchesClientFilter(filterable({ plans: [ENDING_FRIDAY] }), filter), true)
    assert.equal(matchesClientFilter(filterable({ plans: [RUNNING] }), filter), false)
    assert.equal(matchesClientFilter(filterable({ plans: [FINISHED] }), filter), false)
    assert.equal(matchesClientFilter(filterable({ plans: [RUNNING, ENDING_FRIDAY] }), filter), true)
  })

  it('debtors: owes something and is still activo', () => {
    freezeAtMidday()
    const filter = CLIENT_FILTERS.DEBTORS
    assert.equal(matchesClientFilter(filterable({ owedCount: 2 }), filter), true)
    assert.equal(matchesClientFilter(filterable({ owedCount: 0 }), filter), false)
    // The panel counts debtors among active alumnos only; including an inactive
    // one here would make the tile and the list it opens disagree.
    assert.equal(matchesClientFilter(filterable({ active: false, owedCount: 2 }), filter), false)
  })

  it('ignores finished plans: the list only loads the latest one', () => {
    // getClientsWithPlans sends every running or upcoming plan but at most one
    // finished plan per alumno. A filter that read finished plans would quietly
    // give wrong results there, so adding any number of them changes nothing.
    freezeAtMidday()
    const UPCOMING = { start_date: '2026-12-01', end_date: '2026-12-31' }
    const history = [FINISHED, { start_date: '2026-05-01', end_date: '2026-05-31' }]
    for (const filter of Object.values(CLIENT_FILTERS)) {
      for (const plans of [[], [RUNNING], [ENDING_FRIDAY], [UPCOMING], [RUNNING, UPCOMING]]) {
        for (const base of [
          filterable({ plans }),
          filterable({ plans, active: false }),
          filterable({ plans, owedCount: 3 }),
        ]) {
          assert.equal(
            matchesClientFilter({ ...base, plans: [...plans, ...history] }, filter),
            matchesClientFilter(base, filter),
            `${filter} changed with finished plans added to ${JSON.stringify(plans)}`,
          )
        }
      }
    }
  })
})
