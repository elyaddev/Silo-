"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let unsub = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/account");
      else setReady(true);
    }).data?.subscription;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.replace("/account");
      else setReady(true);
    })();

    return () => unsub?.unsubscribe();
  }, [router]);

  if (!ready) return null; // simple loading gate

  return <>{children}</>;
}
