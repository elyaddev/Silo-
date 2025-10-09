"use client";

import { useEffect, useMemo, useState } from "react";
import supabase from "@/lib/supabaseClient";

type Status = "loading" | "success" | "error";

export default function AuthCallback() {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string>("Verifying your email...");

  // Parse hash/query for Supabase error codes from magic links
  const urlError = useMemo(() => {
    // Supabase sends errors in the hash fragment on email links:
    // e.g. #error=access_denied&error_code=otp_expired&error_description=...
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const errCode = params.get("error_code");
    const errDesc = params.get("error_description");
    if (errCode || errDesc) return decodeURIComponent(errDesc ?? errCode ?? "");
    return null;
  }, []);

  useEffect(() => {
    let unsub: (() => void) | undefined;

    async function run() {
      // If Supabase already attached a session, we're done.
      const { data, error } = await supabase.auth.getSession();
      if (data?.session) {
        setStatus("success");
        return;
      }

      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }

      // If the link itself says it's invalid/expired, surface that immediately.
      if (urlError) {
        setStatus("error");
        setMessage(urlError);
        return;
      }

      // Otherwise, wait for Supabase to process the URL hash (it fires a SIGNED_IN event)
      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_IN" && session) {
          setStatus("success");
        } else if (event === "USER_UPDATED" && session) {
          setStatus("success");
        }
      });

      unsub = () => sub.subscription.unsubscribe();

      // Fallback timeout in case nothing arrives
      setTimeout(() => {
        setStatus((s) => (s === "loading" ? "error" : s));
        setMessage((m) => (m === "Verifying your email..." ? "Link expired or invalid." : m));
      }, 5000);
    }

    run();
    return () => {
      if (unsub) unsub();
    };
  }, [urlError]);

  if (status === "loading") {
    return (
      <div className="grid h-screen place-items-center bg-white text-gray-700">
        <div className="flex flex-col items-center space-y-3 text-center">
          <div className="animate-spin h-8 w-8 border-2 border-[color:var(--color-brand)] border-t-transparent rounded-full" />
          <p>{message}</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="grid h-screen place-items-center bg-white text-gray-700">
        <div className="text-center space-y-4 max-w-sm mx-auto p-6 rounded-2xl border border-neutral-200 shadow-sm">
          <h1 className="text-2xl font-semibold text-red-500">Link expired or invalid</h1>
          <p className="text-gray-600">{message || "Try sending yourself a new login link."}</p>
          <a
            href="/login"
            className="inline-block rounded-full bg-[color:var(--color-brand)] px-5 py-2 text-white hover:brightness-95 transition-all"
          >
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  // success
  return (
    <div className="grid h-screen place-items-center bg-gradient-to-br from-white to-orange-50 dark:from-neutral-900 dark:to-neutral-950">
      <div className="text-center max-w-sm mx-auto p-8 rounded-3xl border border-orange-100 bg-white/80 backdrop-blur-sm shadow-md dark:bg-neutral-900/80 dark:border-neutral-800">
        <div className="flex justify-center mb-4">
          <div className="h-14 w-14 rounded-full bg-[color:var(--color-brand)]/10 flex items-center justify-center">
            <svg
              className="h-7 w-7 text-[color:var(--color-brand)]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-[color:var(--color-brand)]">You’re all set!</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Your email has been verified successfully. You can now log in to your account.
        </p>

        <a
          href="/login"
          className="mt-6 inline-block rounded-full bg-[color:var(--color-brand)] px-6 py-2.5 text-white font-medium hover:brightness-95 transition-all"
        >
          Go to Login
        </a>
      </div>
    </div>
  );
}
