import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// PostgREST v14.5 (what hosted Supabase runs) sometimes checks a fresh token
// against a stale cached clock and rejects it with a 401 "JWT issued at future",
// most often right after sign-in or a token refresh. Nothing ran, so resending
// is safe, and its clock catches up within a second or two.
// ponytail: remove once the project runs PostgREST v14.18+, where it's fixed.
export async function fetchWithClockRetry(input: RequestInfo | URL, init?: RequestInit) {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(input, init)
    if (response.status !== 401 || attempt === 3) return response
    if (!(await response.clone().text()).includes('JWT issued at future')) return response
    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
  }
}

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { fetch: fetchWithClockRetry },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet, _headers) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have a proxy refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
