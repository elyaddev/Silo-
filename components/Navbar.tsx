// This file is copied and adapted from the original repository.
// Changes include:
//  * Sign-up links now point to `/login?mode=signup` instead of `/signup` so
//    pressing “Sign up” shows the account creation form instead of a 404.
//  * When a user is signed in the “Account” link has been replaced with a
//    dropdown menu.  Clicking your username toggles a menu containing your
//    username and a link to your activity page.  This prepares the UI for
//    additional menu items in the future.
//  * Notifications bell added (desktop + mobile) which listens via Supabase Realtime.

"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import supabase from "@/lib/supabaseClient";
import Logo from "@/components/Logo";
import NotificationsBell from "@/components/NotificationsBell"; // 👈 NEW

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [openMobile, setOpenMobile] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSignedIn(!!session?.user);
      if (session?.user?.id) {
        const { data } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", session.user.id)
          .maybeSingle();
        setUsername(data?.username ?? null);
      } else {
        setUsername(null);
      }
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

        {/* RIGHT: Search + Notifications + Auth (desktop) */}
        <div className="hidden md:flex items-center gap-3">
          <SearchBar />
          {signedIn && <NotificationsBell />}{/* 👈 NEW */}
          {signedIn ? (
            <div className="flex items-center gap-2">
              {/* Dropdown for user menu */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className="rounded-lg border px-3 py-1.5 text-sm text-slate-700 hover:bg-neutral-50"
                >
                  {username ? `@${username}` : "Account"}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-40 rounded-lg border bg-white shadow-lg py-1 z-50">
                    {username && (
                      <div className="px-4 py-2 text-sm font-medium text-neutral-700">
                        @{username}
                      </div>
                    )}
                    <Link
                      href="/account/activity"
                      className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      My Activity
                    </Link>
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
              {signedIn && <NotificationsBell />}{/* 👈 NEW */}
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
