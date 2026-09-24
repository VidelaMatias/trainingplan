import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { readVerifiedClaims } from '@/lib/supabase/claims'

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Runs on every navigation and prefetch, so it verifies locally instead of
  // asking the Auth server (see readVerifiedClaims).
  const user = await readVerifiedClaims(supabase)

  const publicPaths = ['/login', '/forgot-password', '/reset-password']
  const isAuthRoute = request.nextUrl.pathname === '/login'
  const isPublicRoute = publicPaths.includes(request.nextUrl.pathname)

  // getClaims() refreshes an expired session first, which may have rotated it
  // and queued fresh cookies onto supabaseResponse. A bare
  // NextResponse.redirect() would throw those away and leave the browser holding
  // an already-rotated refresh token — which shows up as an intermittent,
  // unexplained logout. Carry them onto the redirect.
  const redirectTo = (pathname: string) => {
    const url = request.nextUrl.clone()
    url.pathname = pathname
    url.search = ''
    const response = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie))
    return response
  }

  if (!user && !isPublicRoute) return redirectTo('/login')
  if (user && isAuthRoute) return redirectTo('/dashboard')

  return supabaseResponse
}
