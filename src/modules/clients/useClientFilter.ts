import { useSearchParams } from 'next/navigation'

import { parseClientFilter } from '@/modules/clients/utils'
import type { ClientFilter } from '@/types/constants'

// The alumnos list view the current page was reached from, read from its URL.
// Every page of the flow carries it as ?filter=…, so client components that
// render links (list rows, row actions, plan cards) take it from here instead
// of having it passed down as a prop through each level of the tree. Server
// pages read the same param with readClientFilter.
export function useClientFilter(): ClientFilter | null {
  return parseClientFilter(useSearchParams().get('filter'))
}
