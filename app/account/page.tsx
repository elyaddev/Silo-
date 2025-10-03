'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type U = { id: string; email?: string | null } | null;

export default function AccountPage() {
  const [user, setUser] = useState<U>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // initial read
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user ?? null);
      setLoading(false);
    });

    // keep in sync with any auth changes
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <div className="text-sm text-neutral-500">Loading account…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-semibold">Account</h1>
          <p className="text-neutral-600">Not signed in</p>
          <Link
            href="/login?next=/account"
            className="inline-block rounded-lg bg-orange-500 text-white px-4 py-2"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const email = user.email ?? '—';

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Account</h1>
        <Link
          href="/account/activity"
          className="rounded-lg border px-3 py-1.5 hover:bg-neutral-50"
        >
          My Activity
        </Link>
      </div>

      <div className="mt-6 rounded-2xl border p-6 bg-white">
        <div className="text-neutral-600">Signed in as</div>
        <div className="mt-1 text-lg font-medium">{email}</div>

        <form
          className="mt-6"
          onSubmit={async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
            // onAuthStateChange will flip the UI automatically
          }}
        >
          <button className="rounded-lg border px-4 py-2 hover:bg-neutral-50">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
