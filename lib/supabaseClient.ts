// lib/supabaseClient.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js'

declare global {
  // eslint-disable-next-line no-var
  var __sb__: SupabaseClient | undefined
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase: SupabaseClient =
  globalThis.__sb__ ??
  createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: { params: { eventsPerSecond: 5 } },
  })

if (process.env.NODE_ENV !== 'production') {
  globalThis.__sb__ = supabase
}

export default supabase
