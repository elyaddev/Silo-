// lib/logActivity.ts
'use client';

import supabase from '@/lib/supabaseClient';

/**
 * Logs an entry in the `public.activity` table for the current user.
 * Assumes RLS allows inserts where auth.uid() = user_id.
 *
 * @param type   A string describing the action (e.g., 'post_created', 'reply_created')
 * @param payload Optional JSON payload with additional context
 */
export async function logActivity(type: string, payload?: Record<string, any>) {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) return; // Skip logging if not signed in

  const { error } = await supabase.from('activity').insert({
    user_id: user.id,
    type,
    payload: payload ?? null,
  });

  if (error) {
    // Don’t crash the UI if activity logging fails
    console.warn('logActivity failed:', error.message);
  }
}

export default logActivity;
