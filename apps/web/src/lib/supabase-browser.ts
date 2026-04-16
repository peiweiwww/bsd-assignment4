import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Browser-side Supabase client for use in Client Components.
 * token should be obtained via Clerk's useAuth().getToken() before calling.
 *
 * Note: token refresh on reconnect is not implemented; reload to reconnect if needed.
 */
export function createBrowserSupabaseClient(token: string | null) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 10 } },
  })
}
