"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabaseClient";
import ClientTime from "@/components/ClientTime";

type Noti = {
  id: string;
  type:
    | "reply_to_you"
    | "reply_in_discussion"
    | "dm_request"
    | "dm_request_accepted"
    | "dm_received"
    | string;
  user_id: string;
  actor_id: string;
  message_id: number;                // for reply_* and dm_received
  room_id: string;                    // discussion routes
  discussion_id: string | null;      // discussion routes
  data: {
    actor_label?: string | null;     // for reply_* labels
    request_id?: string | null;      // for dm_request / accepted
    conversation_id?: string | null; // for dm_* deep links
  } | null;
  created_at: string;
  read_at: string | null;
};

const ALLOWED: Array<Noti["type"]> = [
  "reply_to_you",
  "reply_in_discussion",
  "dm_request",
  "dm_request_accepted",
  "dm_received",
];

export default function NotificationsBell() {
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [notis, setNotis] = useState<Noti[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // --- load uid
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUid(session?.user?.id ?? null);
    })();
  }, []);

  // --- helpers
  function whoLabel(n: Noti) {
    return n.data?.actor_label === "OP"
      ? "OP"
      : n.data?.actor_label
      ? `${n.data.actor_label}`
      : "Someone";
  }

  function renderText(n: Noti) {
    switch (n.type) {
      case "reply_to_you":
        return `${whoLabel(n)} replied to your message`;
      case "reply_in_discussion":
        return `${whoLabel(n)} posted in a discussion you're in`;
      case "dm_request":
        return `New chat request`;
      case "dm_request_accepted":
        return `Chat request accepted`;
      case "dm_received":
        return `New message`;
      default:
        return "Notification";
    }
  }

  async function refreshUnread() {
    const { data, error } = await supabase.rpc("get_unread_notifications_count");
    if (!error && typeof data === "number") setUnreadCount(data);
  }

  async function fetchList() {
    if (!uid) return;
    const { data, error } = await supabase
      .from("notifications")
      .select(
        "id, type, user_id, actor_id, message_id, room_id, discussion_id, data, created_at, read_at"
      )
      .eq("user_id", uid)
      .in("type", ALLOWED)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) setNotis(data as Noti[]);
  }

  // --- initial load
  useEffect(() => {
    if (!uid) return;
    void fetchList();
    void refreshUnread();
  }, [uid]);

  // --- realtime inserts for my user
  useEffect(() => {
    if (!uid) return;
    const channel = supabase
      .channel(`noti:${uid}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${uid}`,
        },
        (payload) => {
          const row = payload.new as Noti;
          if (!ALLOWED.includes(row.type)) return;
          setNotis((prev) => [row, ...prev].slice(0, 50));
          setUnreadCount((c) => c + 1);
        }
      )
      .subscribe();
    return () => void supabase.removeChannel(channel);
  }, [uid]);

  // --- mark all read
  async function markAllRead() {
    if (!uid) return;
    const toMark = notis.filter((n) => ALLOWED.includes(n.type) && !n.read_at).map((n) => n.id);
    if (toMark.length === 0) {
      setOpen(false);
      return;
    }
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", toMark);

    if (!error) {
      setNotis((prev) =>
        prev.map((n) =>
          toMark.includes(n.id) ? { ...n, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadCount(0);
      setOpen(false);
    }
  }

  // --- click handler with deep-links
  async function handleClick(n: Noti) {
    switch (n.type) {
      case "reply_to_you":
      case "reply_in_discussion":
        if (n.room_id && n.discussion_id && n.message_id) {
          router.push(`/rooms/${n.room_id}/d/${n.discussion_id}#msg-${n.message_id}`);
        }
        break;
      case "dm_request":
        router.push(`/dm/requests`);
        break;
      case "dm_request_accepted": {
        const conv = n.data?.conversation_id;
        if (conv) router.push(`/dm/${conv}`);
        break;
      }
      case "dm_received": {
  const conv = n.data?.conversation_id;
  const dmMsgId = (n.data as any)?.dm_message_id; // <— new
  if (conv && dmMsgId) router.push(`/dm/${conv}#msg-${dmMsgId}`);
  else if (conv) router.push(`/dm/${conv}`);
  break;
}
    }

    // mark read after navigating
    if (!n.read_at) {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", n.id);
      if (!error) {
        setNotis((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    }

    setOpen(false);
  }

  const filtered = useMemo(() => notis.filter((n) => ALLOWED.includes(n.type)), [notis]);

  return (
    <div className="relative">
      {/* Bell */}
      <button
        aria-label="Notifications"
        onClick={async () => {
          setOpen((o) => !o);
          setTimeout(() => {
            void refreshUnread();
            void fetchList();
          }, 0);
        }}
        className="relative rounded-full p-2 hover:bg-neutral-100 transition"
      >
        {/* icon */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9a6 6 0 10-12 0v.75a8.967 8.967 0 01-2.311 6.022c1.76.64 3.59 1.085 5.455 1.31m5.713 0a24.255 24.255 0 01-5.713 0m5.713 0a3 3 0 11-5.713 0" />
        </svg>

        {/* badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] h-4 min-w-[16px] px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-neutral-200 bg-white shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-200">
            <div className="font-semibold text-sm">Notifications</div>
            <button
              onClick={markAllRead}
              className="text-xs rounded-full px-3 py-1 border border-neutral-300 hover:bg-neutral-50"
            >
              Mark all read
            </button>
          </div>

          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-sm text-neutral-600">No notifications yet.</div>
          ) : (
            <ul className="max-h-96 overflow-auto divide-y divide-neutral-200">
              {filtered.map((n) => (
                <li
                  key={n.id}
                  className={`px-4 py-3 text-sm hover:bg-neutral-50 cursor-pointer ${
                    !n.read_at ? "bg-neutral-50" : ""
                  }`}
                  onClick={() => void handleClick(n)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-neutral-900">{renderText(n)}</div>
                      <div className="text-neutral-500 text-xs mt-0.5">
                        <ClientTime iso={n.created_at} />
                      </div>
                    </div>
                    {!n.read_at && (
                      <span className="mt-1 inline-block h-2 w-2 rounded-full bg-[var(--color-brand)]" />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
