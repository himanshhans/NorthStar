import { createClient } from '@supabase/supabase-js'
import { useSession } from '@clerk/clerk-react'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Latest Clerk token getter, updated by useSupabase(). The single client below
// reads it fresh on every request via the accessToken callback.
let tokenGetter = async () => null

// One shared client for the whole app (stable identity → stable React Query behavior).
const client = createClient(url, anonKey, {
  accessToken: () => tokenGetter(),
})

/**
 * Returns the shared Supabase client, bound to the current Clerk session.
 * Clerk issues the JWT; Supabase RLS reads `auth.jwt()->>'sub'` as the user id.
 */
export function useSupabase() {
  const { session } = useSession()
  tokenGetter = async () => (session ? await session.getToken() : null)
  return client
}

// Anonymous client for public reads (no auth context). Use sparingly.
export const supabasePublic = createClient(url, anonKey)
