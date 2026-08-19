import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  compareByName,
  matchesTokens,
  nameHaystack,
  normalizeName,
  searchTokens,
  type SearchableClient,
} from '@/modules/clients/utils'

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
