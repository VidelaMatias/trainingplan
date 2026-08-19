import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// A client that stores nothing: no cookies, no refresh loop. Signing in on it
// cannot overwrite the caller's live session, which is what makes it safe to
// use for verifying a password (see changePassword in modules/auth/actions.ts).
// Sign the session out with `{ scope: 'local' }` when done — the default
// 'global' scope would revoke every session the user has.
export function createIsolatedClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  )
}
