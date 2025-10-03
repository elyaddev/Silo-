"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function AccountPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <main className="flex flex-col items-center justify-center h-screen">
        <p className="text-gray-600">Loading...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-semibold mb-4">Account</h1>
        <p className="mb-6 text-gray-600">Not signed in</p>
        <button
          onClick={() => supabase.auth.signInWithOAuth({ provider: "google" })}
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-2 rounded-lg shadow"
        >
          Sign in
        </button>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center h-screen bg-orange-50">
      <h1 className="text-2xl font-semibold mb-4">Account</h1>
      <p className="text-gray-800 mb-8">Signed in as {user.email}</p>

      <div className="flex gap-4">
        <Link
          href="/account/activity"
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg shadow"
        >
          My Activity
        </Link>

        <button
          onClick={() => supabase.auth.signOut()}
          className="border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white px-6 py-2 rounded-lg shadow"
        >
          Sign out
        </button>
      </div>
    </main>
  );
}
