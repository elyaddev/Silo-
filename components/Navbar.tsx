// This file is copied and adapted from the original repository.
// Changes include:
//  * Sign-up links now point to `/login?mode=signup` instead of `/signup`.
//  * When a user is signed in the “Account” link is a dropdown.
//  * Notifications bell added (desktop + mobile).
//  * NEW: Direct Messages links added to navbar (desktop + mobile).

"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import supabase from "@/lib/supabaseClient";
import Logo from "@/components/Logo";
import NotificationsBell from "@/components/NotificationsBell"; // 👈

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [openMobile, setOpenMobile] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [username] = useState<string | null>(null); // not shown; aliasing is per-discussion
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close the dropdown menu when clicking outside of it
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSignedIn(!!session?.user);
    })();
  }, [pathname]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const links = [
    { href: "/", label: "Home", prefetch: true },
    { href: "/rooms", label: "Rooms", prefetch: false },
  ];

  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* LEFT: Brand */}
        <div className="flex items-center gap-2">
          <Logo className="h-7 w-auto" />
        </div>

        {/* CENTER: Desktop nav */}
        <nav className="hidden md:flex items-center gap-4">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              prefetch={l.prefetch as any}
              className={`text-sm font-medium transition hover:text-orange-600 ${
                pathname === l.href ? "text-orange-600" : "text-slate-700"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* RIGHT: Search + DMs + Notifications + Auth (desktop) */}
        <div className="hidden md:flex items-center gap-3">
          <SearchBar />

          {/* NEW: Direct Messages quick link (only when signed in) */}
          {signedIn && (
            <Link
              href="/dm"
              className="rounded-lg border px-3 py-1.5 text-sm text-slate-700 hover:bg-neutral-50"
              title="Direct Messages"
            >
              DMs
            </Link>
          )}

          {signedIn && <NotificationsBell />}

          {signedIn ? (
            <div className="flex items-center gap-2">
              {/* Dropdown for user menu */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className="rounded-lg border px-3 py-1.5 text-sm text-slate-700 hover:bg-neutral-50"
                >
                  Account
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-40 rounded-lg border bg-white shadow-lg py-1 z-50">
                    <Link
                      href="/account/activity"
                      className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      My Activity
                    </Link>
                    {/* If you ever want DMs in the dropdown as well, uncomment:
                    <Link
                      href="/dm"
                      className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      Direct Messages
                    </Link>
                    <Link
                      href="/dm/requests"
                      className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      Chat Requests
                    </Link>
                    */}
                  </div>
                )}
              </div>
              <button
                onClick={signOut}
                className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-orange-600"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-lg border px-3 py-1.5 text-sm text-slate-700 hover:bg-neutral-50"
              >
                Log in
              </Link>
              <Link
                href="/login?mode=signup"
                className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-orange-600"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile: Menu button */}
        <button
          className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-neutral-50"
          onClick={() => setOpenMobile((v) => !v)}
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>
      </div>

      {/* Mobile drawer */}
      {openMobile && (
        <div className="md:hidden border-t bg-white">
          <div className="mx-auto max-w-6xl px-4 py-3 space-y-3">
            {/* Search + Notifications (mobile) */}
            <div className="flex items-center justify-between">
              <SearchBar />
              {signedIn && <NotificationsBell />}
            </div>

            {/* Links */}
            <nav className="grid gap-1 pt-2">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  prefetch={l.prefetch as any}
                  onClick={() => setOpenMobile(false)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-neutral-50 ${
                    pathname === l.href ? "text-orange-600" : "text-slate-700"
                  }`}
                >
                  {l.label}
                </Link>
              ))}

              {/* NEW: DMs + Requests in mobile drawer (only when signed in) */}
              {signedIn && (
                <>
                  <Link
                    href="/dm"
                    onClick={() => setOpenMobile(false)}
                    className="rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-neutral-50 text-slate-700"
                  >
                    Direct Messages
                  </Link>
                  <Link
                    href="/dm/requests"
                    onClick={() => setOpenMobile(false)}
                    className="rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-neutral-50 text-slate-700"
                  >
                    Chat Requests
                  </Link>
                </>
              )}
            </nav>

            {/* Auth actions */}
            <div className="pt-2">
              {signedIn ? (
                <div className="flex items-center gap-2">
                  <div className="flex flex-col w-full border rounded-lg overflow-hidden">
                    <button
                      className="px-3 py-2 text-left text-sm text-slate-700 border-b hover:bg-neutral-50"
                      onClick={() => {
                        setOpenMobile(false);
                        router.push("/account/activity");
                      }}
                    >
                      My Activity
                    </button>
                    <button
                      className="px-3 py-2 text-left text-sm text-slate-700 hover:bg-neutral-50"
                      onClick={async () => {
                        setOpenMobile(false);
                        await signOut();
                      }}
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    onClick={() => setOpenMobile(false)}
                    className="rounded-lg border px-3 py-1.5 text-sm text-slate-700 hover:bg-neutral-50"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/login?mode=signup"
                    onClick={() => setOpenMobile(false)}
                    className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-orange-600"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
