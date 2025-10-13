// Navbar with DM unread badge + instant updates via window event 'dm:unread:update'
// Uses focus + gentle 30s interval for refresh (no global direct_messages realtime sub)

"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import Logo from "@/components/Logo";
import NotificationsBell from "@/components/NotificationsBell";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  const [openMobile, setOpenMobile] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Total unread DM count
  const [dmUnread, setDmUnread] = useState<number>(0);

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

  // Load session and fetch unread total on route change
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const isIn = !!session?.user;
      setSignedIn(isIn);

      if (isIn) {
        const { data, error } = await supabase.rpc("total_dm_unread");
        if (!error && typeof data === "number") setDmUnread(data);
        else setDmUnread(0);
      } else {
        setDmUnread(0);
      }
    })();
  }, [pathname]);

  // Lightweight refresh: on focus + gentle 30s interval
  useEffect(() => {
    if (!signedIn) return;

    let timer: any = null;

    async function refetch() {
      const { data, error } = await supabase.rpc("total_dm_unread");
      if (!error && typeof data === "number") setDmUnread(data);
    }

    const onFocus = () => {
      void refetch();
    };
    window.addEventListener("focus", onFocus);

    timer = setInterval(refetch, 30000);
    void refetch();

    return () => {
      window.removeEventListener("focus", onFocus);
      if (timer) clearInterval(timer);
    };
  }, [signedIn]);

  // Listen for local page events to update unread instantly when a DM is opened/read
  useEffect(() => {
    const onLocalUpdate = (e: Event) => {
      const ce = e as CustomEvent<{ count: number }>;
      if (typeof ce.detail?.count === "number") setDmUnread(ce.detail.count);
    };
    window.addEventListener("dm:unread:update", onLocalUpdate as EventListener);
    return () =>
      window.removeEventListener("dm:unread:update", onLocalUpdate as EventListener);
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const links = [
    { href: "/", label: "Home", prefetch: true },
    { href: "/rooms", label: "Rooms", prefetch: false },
  ];

  // Slightly larger badge
  function DMBadge({ count }: { count: number }) {
    if (!count) return null;
    const display = count > 99 ? "99+" : String(count);
    return (
      <span className="ml-1 inline-flex min-w-[20px] h-5 items-center justify-center rounded-full text-[11px] px-1.5 bg-[var(--color-brand)] text-white align-middle">
        {display}
      </span>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      {/* increased height & padding */}
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        {/* LEFT: Brand (bigger) */}
        <div className="flex items-center gap-3">
          <Logo className="h-9 w-auto" />
        </div>

        {/* CENTER: Desktop nav (bigger type & spacing) */}
        <nav className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              prefetch={l.prefetch as any}
              className={`text-base font-medium transition hover:text-orange-600 ${
                pathname === l.href ? "text-orange-600" : "text-slate-700"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* RIGHT: DMs + Notifications + Auth (desktop) */}
        <div className="hidden md:flex items-center gap-4">
          {signedIn && (
            <Link
              href="/dm"
              className="relative rounded-lg border px-4 py-2 text-base text-slate-700 hover:bg-neutral-50 inline-flex items-center"
              title="Direct Messages"
            >
              <span>DMs</span>
              <DMBadge count={dmUnread} />
            </Link>
          )}

          {/* Bell excludes dm_received; still shows discussion-related + dm requests */}
          {signedIn && <NotificationsBell />}

          {signedIn ? (
            <div className="flex items-center gap-3">
              {/* Dropdown for user menu */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className="rounded-lg border px-4 py-2 text-base text-slate-700 hover:bg-neutral-50"
                >
                  Account
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-lg border bg-white shadow-lg py-1 z-50">
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
                className="rounded-lg bg-orange-500 px-4 py-2 text-base font-semibold text-white hover:bg-orange-600"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-lg border px-4 py-2 text-base text-slate-700 hover:bg-neutral-50"
              >
                Log in
              </Link>
              <Link
                href="/login?mode=signup"
                className="rounded-lg bg-orange-500 px-4 py-2 text-base font-semibold text-white hover:bg-orange-600"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile: Menu button (bigger) */}
        <button
          className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-lg border hover:bg-neutral-50"
          onClick={() => setOpenMobile((v) => !v)}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile drawer */}
      {openMobile && (
        <div className="md:hidden border-t bg-white">
          <div className="mx-auto max-w-6xl px-5 py-4 space-y-4">
            {/* Notifications (mobile) */}
            <div className="flex items-center justify-end">
              {signedIn && <NotificationsBell />}
            </div>

            {/* Links */}
            <nav className="grid gap-1 pt-1">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  prefetch={l.prefetch as any}
                  onClick={() => setOpenMobile(false)}
                  className={`rounded-lg px-4 py-3 text-base font-medium transition hover:bg-neutral-50 ${
                    pathname === l.href ? "text-orange-600" : "text-slate-700"
                  }`}
                >
                  {l.label}
                </Link>
              ))}

              {/* DMs + Requests in mobile drawer (only when signed in) */}
              {signedIn && (
                <>
                  <Link
                    href="/dm"
                    onClick={() => setOpenMobile(false)}
                    className="rounded-lg px-4 py-3 text-base font-medium transition hover:bg-neutral-50 text-slate-700 flex items-center justify-between"
                  >
                    <span>Direct Messages</span>
                    {dmUnread > 0 && (
                      <span className="inline-flex min-w-[20px] h-5 items-center justify-center rounded-full text-[11px] px-1.5 bg-[var(--color-brand)] text-white">
                        {dmUnread > 99 ? "99+" : dmUnread}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/dm/requests"
                    onClick={() => setOpenMobile(false)}
                    className="rounded-lg px-4 py-3 text-base font-medium transition hover:bg-neutral-50 text-slate-700"
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
                      className="px-4 py-3 text-left text-base text-slate-700 border-b hover:bg-neutral-50"
                      onClick={() => {
                        setOpenMobile(false);
                        router.push("/account/activity");
                      }}
                    >
                      My Activity
                    </button>
                    <button
                      className="px-4 py-3 text-left text-base text-slate-700 hover:bg-neutral-50"
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
                <div className="flex items-center gap-3">
                  <Link
                    href="/login"
                    onClick={() => setOpenMobile(false)}
                    className="rounded-lg border px-4 py-2.5 text-base text-slate-700 hover:bg-neutral-50"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/login?mode=signup"
                    onClick={() => setOpenMobile(false)}
                    className="rounded-lg bg-orange-500 px-4 py-2.5 text-base font-semibold text-white hover:bg-orange-600"
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
