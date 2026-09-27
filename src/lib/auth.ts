import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

async function isSignedIn() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  return Boolean(data?.claims)
}

/** For pages only guests need, like sign in and sign up. */
export async function redirectIfSignedIn() {
  if (await isSignedIn()) {
    redirect('/')
  }
}

/** For pages that need a session, like setting a new password. */
export async function redirectIfSignedOut() {
  if (!(await isSignedIn())) {
    redirect('/login')
  }
}
