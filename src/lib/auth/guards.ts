import { cache } from 'react'

import { readVerifiedClaims } from '@/lib/supabase/claims'
import { createClient } from '@/lib/supabase/server'

// Single authenticated principal: the trainer who owns the data. Row-level
// security scopes every table by `created_by`, so the DB is the authoritative
// boundary; these helpers repeat the check to return a friendly error and to
// supply the user id needed for inserts and ownership checks.
//
// Note: no 'use server' here. These are internal helpers called from Server
// Components and from within Server Actions — marking the module would publish
// them as callable endpoints for no reason.

// What the app reads from the session: the id for ownership checks and inserts,
// and the email the shell and the account page display.
export interface SessionUser {
  id: string
  email: string | null
}

// Verified locally from the JWT (see readVerifiedClaims): no Auth round trip.
// React's cache() keeps it to one verification per request across layout,
// page and actions. The email is the one the token was issued with, so it can
// lag a change made outside the app by up to one token lifetime — fine for the
// shell; use getFreshUser where the email must be current.
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient()
  const claims = await readVerifiedClaims(supabase)
  if (!claims) return null
  return { id: claims.sub, email: claims.email ?? null }
})

// The user as the Auth server has it right now: a network round trip, so only
// where "the JWT is still valid" is not enough. A session revoked elsewhere
// (logout's global signOut, a user banned or deleted from the dashboard) keeps
// a verifiable JWT until it expires, and only the Auth server knows it is gone.
// Also the current email: verifying the password against a stale one would
// reject a correct password.
export const getFreshUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  return { id: user.id, email: user.email ?? null }
})

// Guard for writes: the user id, or null when there is no live session. Checked
// against the Auth server (getFreshUser) so a revoked session cannot keep
// writing for the rest of its token's lifetime. Reads — pages, the Excel
// export, loading a plan's weeks — use getCurrentUser and stay local; what a
// revoked session can still do until its token expires is read the trainer's
// own data on a device that was already signed in.
export async function requireAuth(): Promise<{ userId: string } | null> {
  const user = await getFreshUser()
  if (!user) return null
  return { userId: user.id }
}
