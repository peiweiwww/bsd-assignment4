import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.'
  )
}

/**
 * Server-side Supabase client authenticated with the current Clerk session JWT.
 * Import this only in Server Components, Server Actions, or Route Handlers.
 *
 * The JWT is passed as Authorization: Bearer <token> so Supabase RLS can read
 * auth.jwt() ->> 'sub' to enforce per-user row access.
 *
 * If the user is not signed in, getToken() returns null and we fall back to
 * the anon key — RLS will simply return no rows for protected tables.
 */
export async function createServerSupabaseClient() {
  const { getToken } = await auth()
  const token = await getToken()

  return createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
    auth: { persistSession: false },
  })
}
