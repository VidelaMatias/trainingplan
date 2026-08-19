// Pure helpers behind the client list's search box and name ordering. They live
// here rather than inside the component so the interesting behaviour — accent
// folding, multi-word queries, Spanish collation — is testable on its own.

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

// Spanish collation: accents don't reorder names and ñ sorts after n.
const nameCollator = new Intl.Collator('es', { sensitivity: 'base' })

export function compareByName(a: SearchableClient, b: SearchableClient): number {
  return nameCollator.compare(
    `${a.first_name} ${a.last_name}`,
    `${b.first_name} ${b.last_name}`,
  )
}
