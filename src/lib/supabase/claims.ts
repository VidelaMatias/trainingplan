import type { JwtPayload, SupabaseClient } from '@supabase/supabase-js'

// The session's JWT claims, or null when there is no usable session.
//
// getClaims() verifies the JWT locally against the project's JWKS (ES256 key,
// cached in-process), where getUser() was a network round trip to the Auth
// server before any page could start its queries. With a legacy HS256 key it
// falls back to getUser() itself, so it is never slower. It still refreshes an
// expired session first. Every query sends the JWT on to PostgREST, whose RLS
// stays the authoritative boundary.
//
// Unlike getUser(), it throws instead of returning an error for a token it
// cannot decode or that is already expired (a corrupted cookie, clock skew).
// Left uncaught that was a 500 on every route — /login included, so the only
// way out was clearing cookies by hand. Here it reads as "no session".
export async function readVerifiedClaims(supabase: SupabaseClient): Promise<JwtPayload | null> {
  try {
    const { data } = await supabase.auth.getClaims()
    return data?.claims ?? null
  } catch (error) {
    console.error('[auth] getClaims failed', error)
    return null
  }
}
