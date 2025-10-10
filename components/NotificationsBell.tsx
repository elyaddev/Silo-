"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  fetchUnreadCount,
  fetchLatest,
  markAllRead,
  markRead,
  type Notification,
} from "@/lib/notifications";
import Link from "next/link";

function lineFor(n: Notification) {
  if (n.type === "reply_to_you") {
    return `${n.actor_username ? "@" + n.actor_username : "Someone"} replied to your message`;
  }
  return `${n.actor_username ? "@" + n.actor_username : "Someone"} replied in a discussion you’re in`;
}

function hrefFor(n: Notification) {
  // Prefer room + discussion + anchor; fall back to just room + anchor if discussion_id is null
  if (n.discussion_id) {
    return `/rooms/${n.room_id}/d/${n.discussion_id}#m-${n.message_id}`;
  }
  return `/rooms/${n.room_id}#m-${n.message_id}`;
}

export default function NotificationsBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);

  useEffect(() => {
    let active = true;

    (async () => {
      const [c, list] = await Promise.all([fetchUnreadCount(), fetchLatest()]);
      if (!active) return;
      setCount(c);
      setItems(list);
    })();

    // Realtime: only bump the badge; refresh the list when opening
    const channel = supabase
      .channel("notif")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => {
          setCount((x) => x + 1);
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  async function toggleOpen() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      const list = await fetchLatest();
      setItems(list);
      // NOTE: we DO NOT auto-mark as read here anymore
    }
  }

  async function handleItemClick(n: Notification) {
    // Optimistic UI: mark this single item as read locally
    if (!n.read_at) {
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x))
      );
      setCount((c) => Math.max(0, c - 1));
      // Persist to DB (best effort)
      void markRead(n.id);
    }
    // Let the <Link> navigate; no preventDefault needed
  }

  return (
    <div className="relative">
      <button
        onClick={toggleOpen}
        aria-label="Notifications"
        className="relative rounded-full p-2 hover:bg-neutral-100"
      >
        <svg width="22" height="22" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm6-6V11a6 6 0 1 0-12 0v5l-2 2v1h16v-1Z"/>
        </svg>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 grid place-items-center rounded-full text-xs text-white bg-[color:var(--color-brand)]">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 rounded-xl border bg-white shadow-lg p-2 z-50">
          <div className="flex items-center justify-between px-2 py-1">
            <div className="font-medium">Notifications</div>
            <button
  onClick={async () => {
    await markAllRead();
    setItems((prev) =>
      prev.map((x) => (x.read_at ? x : { ...x, read_at: new Date().toISOString() }))
    );
    setCount(0);
  }}
  className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs
             border-neutral-300 text-slate-700
             hover:bg-orange-500 hover:text-white hover:border-orange-500
             transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
  title="Mark all as read"
>
  <span>Mark all as read</span>
</button>

          </div>

          <ul className="max-h-96 overflow-auto">
            {items.length === 0 ? (
              <li className="p-3 text-sm text-neutral-500">No notifications</li>
            ) : (
              items.map((n) => {
                const href = hrefFor(n);
                const unread = !n.read_at;
                return (
                  <li key={n.id} className="border-t first:border-t-0">
                    <Link
                      href={href}
                      onClick={() => handleItemClick(n)}
                      className={`block p-3 transition ${
                        unread ? "bg-orange-50/60 hover:bg-orange-50" : "hover:bg-neutral-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className={`text-[0.95rem] ${unread ? "font-medium" : ""}`}>
                            {lineFor(n)}
                          </div>
                          {n.message_preview && (
                            <div className="mt-0.5 text-xs text-neutral-600 line-clamp-2">
                              “{n.message_preview}”
                            </div>
                          )}
                        </div>
                        {/* unread dot */}
                        {unread && (
                          <span className="mt-1 inline-block h-2 w-2 rounded-full bg-[color:var(--color-brand)] shrink-0" />
                        )}
                      </div>
                      <div className="mt-1 text-[10px] text-neutral-400">
                        {new Date(n.created_at).toLocaleString()}
                      </div>
                    </Link>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
