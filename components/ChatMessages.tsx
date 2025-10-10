// components/ChatMessages.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import supabase from "@/lib/supabaseClient";

/**
 * ChatMessages displays a scrollable list of messages for a given discussion.
 * - Loads newest first, paginates older on scroll-up
 * - Subscribes to realtime inserts
 * - Adds deep-link anchors (id="m-<message_id>") and auto-scrolls to #m-<id>
 */
/**
 * Message rows are selected from the `v_messages_with_alias` view.
 * We intentionally IGNORE `display_name` to avoid "User 1" / "you".
 * Label rules: OP → "OP"; else alias number → "1", "2", ...; else blank.
 */
type Message = {
  id: string;
  content: string;
  created_at: string;
  profile_id: string | null;
  room_id: string;
  discussion_id: string | null;
  is_op: boolean | null;
  alias: number | null;
  display_name: string | null; // ignored for rendering
};

const PAGE_SIZE = 50;

export default function ChatMessages({
  roomId,
  discussionId,
}: {
  roomId: string;
  discussionId: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [reachedStart, setReachedStart] = useState(false);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const atBottomRef = useRef(true);

  // If URL has a hash like #m-123, we’ll scroll to it after first load
  const targetHash = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.hash || "";
  }, []);
  const wantsAnchorScroll = targetHash.startsWith("#m-");

  function preserveScrollPosition(prevHeight: number) {
    const el = viewportRef.current;
    if (!el) return;
    const newHeight = el.scrollHeight;
    el.scrollTop = newHeight - prevHeight;
  }

  function scrollToBottom(force = false) {
    const el = viewportRef.current;
    if (!el) return;
    if (force || atBottomRef.current) el.scrollTop = el.scrollHeight;
  }

  function onScroll() {
    const el = viewportRef.current;
    if (!el) return;
    const thresholdBottom = 80;
    atBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < thresholdBottom;
    if (!loadingOlder && !reachedStart && el.scrollTop < 80) {
      void loadOlder();
    }
  }

  // Label logic: NO "you", NO "User 1". Only "OP" or the number "1", "2", ...
  function labelFor(m: Message): string {
    if (m.is_op) return "OP";
    if (m.alias !== null && m.alias !== undefined) return String(m.alias);
    return ""; // anonymous → no badge text
  }

  // Initial fetch of the most recent messages
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("v_messages_with_alias")
        .select(
          "id, content, created_at, profile_id, room_id, discussion_id, is_op, alias, display_name"
        )
        .eq("room_id", roomId)
        .eq("discussion_id", discussionId)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (cancelled) return;

      if (error) {
        console.error(error.message);
        setMessages([]);
      } else {
        const ordered = (data ?? []).slice().reverse() as Message[];
        setMessages(ordered);
      }
      setLoading(false);

      // After first render, either scroll to anchor or to bottom
      setTimeout(() => {
        if (wantsAnchorScroll && targetHash) {
          const el = document.querySelector(targetHash) as HTMLElement | null;
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            // subtle highlight for context
            el.classList.add("ring-2", "ring-orange-400");
            setTimeout(
              () => el.classList.remove("ring-2", "ring-orange-400"),
              1200
            );
            return;
          }
        }
        scrollToBottom(true);
      }, 60);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, discussionId]);

  // Realtime subscription to new inserts
  useEffect(() => {
    const channel = supabase
      .channel(`messages-disc-${discussionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `discussion_id=eq.${discussionId}`,
        },
        async (payload) => {
          const inserted = payload.new as Message;
          // hydrate with alias fields by selecting from the view
          const { data: row } = await supabase
            .from("v_messages_with_alias")
            .select(
              "id, content, created_at, profile_id, room_id, discussion_id, is_op, alias, display_name"
            )
            .eq("id", inserted.id)
            .single();
          const enriched = row ?? inserted;
          setMessages((prev) => [...prev, enriched as Message]);
          if (!wantsAnchorScroll && atBottomRef.current) {
            setTimeout(() => scrollToBottom(), 0);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discussionId]);

  // Load an older page when the user scrolls near the top
  async function loadOlder() {
    if (loadingOlder || reachedStart || messages.length === 0) return;
    setLoadingOlder(true);

    const first = messages[0];
    const prevHeight = viewportRef.current?.scrollHeight ?? 0;

    const { data, error } = await supabase
      .from("v_messages_with_alias")
      .select(
        "id, content, created_at, profile_id, room_id, discussion_id, is_op, alias, display_name"
      )
      .eq("room_id", roomId)
      .eq("discussion_id", discussionId)
      .lt("created_at", first.created_at)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (error) {
      console.error(error.message);
      setLoadingOlder(false);
      return;
    }

    const older = (data ?? []).slice().reverse() as Message[];
    if (older.length === 0) {
      setReachedStart(true);
      setLoadingOlder(false);
      return;
    }

    setMessages((prev) => [...older, ...prev]);
    setLoadingOlder(false);
    setTimeout(() => preserveScrollPosition(prevHeight), 0);
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div
        ref={viewportRef}
        onScroll={onScroll}
        className="max-h-[60vh] overflow-y-auto px-4 py-4 space-y-4 scroll-smooth"
      >
        {loading ? (
          <div className="py-8 text-center text-[var(--color-muted)]">
            Loading messages…
          </div>
        ) : messages.length === 0 ? (
          <div className="py-8 text-center text-[var(--color-muted)]">
            No messages yet. Start the conversation below.
          </div>
        ) : (
          <>
            {loadingOlder && (
              <div className="text-center text-xs text-[var(--color-muted)] py-1">
                Loading older…
              </div>
            )}

            {messages.map((m) => {
              const label = labelFor(m);
              return (
                <div key={m.id} id={`m-${m.id}`} className="group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                      {/* Badge: OP or just the number; never "you", never "User 1" */}
                      {label && (
                        <span className="text-sm font-medium text-[var(--color-text)]">
                          {label}
                        </span>
                      )}
                      <time className="text-xs text-[var(--color-muted)]">
                        {new Date(m.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
                  </div>

                  <div className="mt-1 rounded-2xl px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text)] whitespace-pre-wrap">
                    {m.content}
                  </div>
                </div>
              );
            })}

            {!reachedStart && !loadingOlder && (
              <div className="text-center text-xs text-[var(--color-muted)] pb-1">
                Scroll up to load older
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
