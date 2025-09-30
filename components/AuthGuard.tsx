"use client";
import { useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace("/login");
      setReady(true);
    })();
  }, [router]);

  if (!ready) {
    return (
      <main className="min-h-[50vh] grid place-items-center">
        <p>Checking access…</p>
      </main>
    );
  }
  return <>{children}</>;
}
