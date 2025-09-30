"use client";
import AuthGuard from "@/components/AuthGuard";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AccountPage() {
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setEmail(user.email ?? null);
    })();
  }, []);

  return (
    <AuthGuard>
      <main className="min-h-[60vh] grid place-items-center">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-semibold">Account</h1>
          <p className="text-gray-600">Signed in as {email}</p>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.replace("/"); }}
            className="rounded-xl border px-4 py-2 hover:bg-gray-50"
          >
            Sign out
          </button>
        </div>
      </main>
    </AuthGuard>
  );
}
