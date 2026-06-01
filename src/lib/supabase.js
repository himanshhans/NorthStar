import { createClient } from '@supabase/supabase-js'
import { useSession } from '@clerk/clerk-react'
import { useMemo } from 'react'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Supabase client bound to the signed-in Clerk session.
 * Clerk issues the JWT; Supabase RLS reads `auth.jwt()->>'sub'` as the user id.
 * Token is fetched fresh per request via the accessToken callback.
 */
export function useSupabase() {
  const { session } = useSession()

  return useMemo(() => {
    return createClient(url, anonKey, {
      accessToken: async () => (session ? await session.getToken() : null),
    })
  }, [session])
}

// Anonymous client for public reads (no auth context). Use sparingly.
export const supabasePublic = createClient(url, anonKey)
