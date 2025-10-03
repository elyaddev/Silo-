"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function AccountPage() {
  const supabase = createClientComponentClient();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) setSession(data.session);
      setLoading(false);
    };

    load();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, [supabase]);

  if (loading) {
    return (
      <main className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-500">Loading…</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="text-gray-600">Not signed in</p>
        <Link href="/login">
          <button className="px-6 py-2 rounded-full bg-[#f58220] text-white hover:bg-[#e87012] transition">
            Sign in
          </button>
        </Link>
      </main>
    );
  }

  const email = session.user?.email;

  return (
    <main className="min-h-[60vh] flex flex-col items-center py-16 gap-6">
      <h1 className="text-2xl font-semibold">Account</h1>
      <p className="text-gray-700">Signed in as {email}</p>

      <div className="flex gap-3">
        <Link href="/account/activity">
          <button className="px-6 py-2 rounded-full border border-[#f58220] text-[#f58220] hover:bg-[#f58220] hover:text-white transition">
            My Activity
          </button>
        </Link>

        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/";
          }}
          className="px-6 py-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
        >
            Sign out
        </button>
      </div>
    </main>
  );
}
