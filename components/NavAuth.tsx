"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function NavAuth() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setSignedIn(!!user);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session?.user);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (signedIn === null) return null; // avoid flicker

  return signedIn ? (
    <a
      href="/account"
      className="text-sm font-medium underline hover:opacity-80 transition-opacity"
    >
      Account
    </a>
  ) : (
    <a
      href="/login"
      className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-gray-50"
    >
      Login
    </a>
  );
}
