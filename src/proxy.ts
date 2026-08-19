import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

// Renamed from `middleware` in Next.js 16 — the file convention is deprecated.
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // /api is excluded on purpose: every route handler authenticates on its own
    // (the Excel export returns 401 without a session), so running the proxy
    // there only added a second, redundant Auth round trip per request.
    // Static assets and _next/data never need a session at all.
    '/((?!api|_next/static|_next/image|_next/data|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
}
