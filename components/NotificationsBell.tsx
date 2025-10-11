// components/NotificationsBell.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabaseClient";

type Notif = {
  id: string;
  type: "reply_to_you" | "reply_in_discussion" | string;
  created_at: string;
  read_at: string | null;
  message_id: number;
  room_id: string;
  data: {
    discussion_id?: string;
    actor_label?: string; // "OP" or alias number as string (e.g. "1")
    // excerpt?: string;   // we won’t render this anymore
  } | null;
};

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Notif[] | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const closeTimer = useRef<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!items) return;
    setUnreadCount(items.filter((n) => !n.read_at).length);
  }, [items]);

  async function ensureLoaded() {
    if (items !== null || loading) return;


    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, created_at, read_at, message_id, room_id, data")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) {
      console.error(error.message);
      setItems([]);
      setLoading(false);
      return;
    }
    const normalized: Notif[] = (data ?? []).map((n: any) => ({
      id: n.id,
      type: n.type,
      created_at: n.created_at,
      read_at: n.read_at,
      message_id: n.message_id,
      room_id: n.room_id,
      data: n.data ?? {},
    }));
    setItems(normalized);
    setLoading(false);
  }

  async function markRead(id: string) {
    setItems((prev) =>
      (prev ?? []).map((n) => (n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n))
    );
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    if (error) console.error(error.message);
  }

  async function markAllRead() {
    if (!items?.some((n) => !n.read_at)) return;
    setItems((prev) => (prev ?? []).map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null);
    if (error) console.error(error.message);
  }

  function describe(n: Notif): { title: string; href?: string } {
    const actor = n.data?.actor_label ?? "someone";
    const discussionId = n.data?.discussion_id;
    let title = "Notification";
    if (n.type === "reply_to_you") title = `${actor} replied to your message`;
    else if (n.type === "reply_in_discussion") title = `${actor} posted in this discussion`;

    const href =
      discussionId && n.room_id && n.message_id
        ? `/rooms/${n.room_id}/d/${discussionId}#m-${n.message_id}`
        : undefined;

    return { title, href };
  }

  // relative time (just now / Xm / Xh / Xd)
  function timeAgo(iso: string) {
    const now = Date.now();
    const then = new Date(iso).getTime();
    const s = Math.max(0, Math.round((now - then) / 1000));
    if (s < 5) return "just now";
    if (s < 60) return `${s}s ago`;
    const m = Math.round(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.round(h / 24);
    return `${d}d ago`;
  }

  async function onToggle() {
    const next = !open;
    setOpen(next);
    if (next) await ensureLoaded();
  }

  function scheduleClose() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 140);
  }

  const anyUnread = unreadCount > 0;

  return (
    <div className="relative">
      <button
        aria-label="Notifications"
        onClick={onToggle}
        onBlur={scheduleClose}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 bg-white hover:bg-neutral-50"
      >
        <span aria-hidden className="text-[18px] leading-none">🔔</span>
        {anyUnread && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex h-2.5 w-2.5 rounded-full bg-[var(--color-brand)] ring-2 ring-white" />
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 z-30 mt-2 w-[24rem] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_12px_30px_rgba(0,0,0,0.08)]"
          onMouseEnter={() => closeTimer.current && window.clearTimeout(closeTimer.current)}
          onMouseLeave={scheduleClose}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
            <div className="font-semibold">Notifications</div>
            <button
              className="text-sm underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-500 disabled:opacity-50"
              onClick={markAllRead}
              disabled={!anyUnread}
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            {loading && <div className="px-4 py-4 text-sm text-neutral-500">Loading…</div>}
            {!loading && (!items || items.length === 0) && (
              <div className="px-4 py-4 text-sm text-neutral-500">You’re all caught up.</div>
            )}

            {!loading &&
              (items ?? []).map((n) => {
                const { title, href } = describe(n);
                const unread = !n.read_at;

                return (
                  <button
                    key={n.id}
                    className={`block w-full text-left px-4 py-3 border-b border-neutral-100 hover:bg-neutral-50 ${
                      unread ? "bg-orange-50/40" : "bg-white"
                    }`}
                    onClick={async () => {
                      await markRead(n.id);
                      if (href) router.push(href);
                      setOpen(false);
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`mt-1 inline-block h-2.5 w-2.5 rounded-full ${
                          unread ? "bg-[var(--color-brand)]" : "bg-neutral-300"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-medium text-neutral-900 line-clamp-1">{title}</div>
                        {/* removed excerpt/subtitle line */}
                        <div className="mt-1 text-[11px] text-neutral-500">{timeAgo(n.created_at)}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
