'use server'

import type { AuthError } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export type AuthFormState = {
  error?: string
  email?: string
  checkEmail?: boolean
}

const MIN_PASSWORD_LENGTH = 8

async function getOrigin() {
  const h = await headers()
  const origin = h.get('origin')
  if (origin) return origin
  const proto = h.get('x-forwarded-proto') ?? 'http'
  return `${proto}://${h.get('x-forwarded-host') ?? h.get('host')}`
}

function friendlyError(error: AuthError) {
  switch (error.code) {
    case 'invalid_credentials':
      return "That email and password don't match an account."
    case 'email_not_confirmed':
      return 'Confirm your email first. Check your inbox for the link we sent.'
    case 'user_already_exists':
      return 'An account with this email already exists. Try signing in instead.'
    case 'weak_password':
      return 'That password is too weak. Try a longer one with a mix of characters.'
    case 'over_email_send_rate_limit':
      return 'Too many emails sent recently. Please wait a few minutes and try again.'
    default:
      return error.message
  }
}

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get('email') ?? '').trim(),
    password: String(formData.get('password') ?? ''),
  }
}

export async function signInWithEmail(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const { email, password } = readCredentials(formData)
  if (!email || !password) {
    return { email, error: 'Enter your email and password.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return { email, error: friendlyError(error) }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signUpWithEmail(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const { email, password } = readCredentials(formData)
  if (!email) {
    return { email, error: 'Enter your email address.' }
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { email, error: `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.` }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${await getOrigin()}/auth/callback` },
  })
  if (error) {
    return { email, error: friendlyError(error) }
  }

  // No session means Supabase is waiting for the user to confirm their email.
  if (!data.session) {
    return { email, checkEmail: true }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signInWithGoogle(): Promise<AuthFormState> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${await getOrigin()}/auth/callback` },
  })
  if (error || !data.url) {
    return { error: "Couldn't start Google sign-in. Please try again." }
  }

  redirect(data.url)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
