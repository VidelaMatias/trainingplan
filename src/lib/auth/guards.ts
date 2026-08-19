import { cache } from 'react'
import type { User } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/server'

// Single authenticated principal: the trainer who owns the data. Row-level
// security scopes every table by `created_by`, so the DB is the authoritative
// boundary; these helpers repeat the check to return a friendly error and to
// supply the user id needed for inserts and ownership checks.
//
// Note: no 'use server' here. These are internal helpers called from Server
// Components and from within Server Actions — marking the module would publish
// them as callable endpoints for no reason.

// supabase.auth.getUser() is a network round trip to the Auth server on every
// call, and a single dashboard render used to make three of them (layout, page,
// and each action). React's cache() collapses them into one per request.
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

// Returns the user id, or null when there is no authenticated session.
export async function requireAuth(): Promise<{ userId: string } | null> {
  const user = await getCurrentUser()
  if (!user) return null
  return { userId: user.id }
}
