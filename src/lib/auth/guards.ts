'use server'

import { createClient } from '@/lib/supabase/server'

// Single authenticated principal: the trainer who owns the data. Row-level
// security scopes every table by `created_by`, so the DB is the authoritative
// boundary; this guard repeats the check in Server Actions to return a friendly
// error and to supply the user id needed for inserts and ownership checks.
// Returns the user id, or null when there is no authenticated session.
export async function requireAuth(): Promise<{ userId: string } | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null
  return { userId: user.id }
}
