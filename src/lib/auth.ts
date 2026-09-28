import { redirect } from 'next/navigation'
import { cache } from 'react'

import { getPlanHistory, getProfile } from '@/lib/data'
import { todayIn } from '@/lib/dates'
import { createClient } from '@/lib/supabase/server'

export type CurrentUser = {
  id: string
  email?: string
  /** Name from the sign-in provider (e.g. Google), if it gave one. */
  providerName?: string
}

/** The signed-in user, verified from their session. Cached per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims) return null

  const metadata = claims.user_metadata ?? {}
  const providerName = metadata.full_name ?? metadata.name
  return {
    id: claims.sub,
    email: claims.email,
    providerName: typeof providerName === 'string' ? providerName : undefined,
  }
})

/** For pages only guests need, like sign in and sign up. */
export async function redirectIfSignedIn() {
  if (await getCurrentUser()) {
    redirect('/')
  }
}

/** For pages that need a session. Returns the signed-in user. */
export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }
  return user
}

/**
 * For app pages: the signed-in user with their profile and split history.
 * Users who haven't finished onboarding are sent to "/" to do it.
 */
export async function requireTrainingSetup() {
  const user = await requireUser()
  const [profile, history] = await Promise.all([getProfile(user.id), getPlanHistory(user.id)])
  if (!profile || history.timeline.length === 0) {
    redirect('/')
  }
  return { user, profile, history, today: todayIn(profile.timezone) }
}
