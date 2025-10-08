"use client";

import { useEffect, useRef, useState } from "react";
import supabase from "@/lib/supabaseClient";

/**
 * ChatMessages displays a scrollable list of messages for a given
 * discussion. It loads an initial batch of the newest messages, then
 * paginates older messages when the user scrolls up, and subscribes
 * to realtime inserts for new messages. The styling follows the
 * updated Silo design: neutral surfaces, warm accents and soft
 * separators. Bubbles are rendered as lightly bordered blocks with
 * rounded corners to keep the conversation gentle and inviting.
 */
type Message = {
  id: string;
  content: string;
  created_at: string;
  profile_id: string | null;
  room_id: string;
  discussion_id: string | null;
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

  // Maintain the scroll position when new older messages are prepended
  function preserveScrollPosition(prevHeight: number) {
    const el = viewportRef.current;
    if (!el) return;
    const newHeight = el.scrollHeight;
    el.scrollTop = newHeight - prevHeight;
  }

  // Scroll to the bottom if the user is near the bottom or when forced
  function scrollToBottom(force = false) {
    const el = viewportRef.current;
    if (!el) return;
    if (force || atBottomRef.current) el.scrollTop = el.scrollHeight;
  }

  // Handle scrolling to determine when to load older messages or when to
  // keep the view pinned to the bottom for new inserts
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

  // Initial fetch of the most recent messages
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("messages")
        .select(
          "id, content, created_at, profile_id, room_id, discussion_id"
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
      setTimeout(() => scrollToBottom(true), 0);
    })();
    return () => {
      cancelled = true;
    };
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
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          if (atBottomRef.current) {
            setTimeout(() => scrollToBottom(), 0);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [discussionId]);

  // Load an older page of messages when the user scrolls near the top
  async function loadOlder() {
    if (loadingOlder || reachedStart || messages.length === 0) return;
    setLoadingOlder(true);
    const first = messages[0];
    const prevHeight = viewportRef.current?.scrollHeight ?? 0;
    const { data, error } = await supabase
      .from("messages")
      .select(
        "id, content, created_at, profile_id, room_id, discussion_id"
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
            {messages.map((m) => (
              <div key={m.id} className="group">
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    {/* The handle is not yet available; replace 'anon' with the user's handle once profiles are joined. */}
                    <span className="text-sm font-medium text-[var(--color-text)]">
                      @anon
                    </span>
                    <time className="text-xs text-[var(--color-muted)]">
                      {new Date(m.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  </div>
                </div>
                <div className="mt-1 rounded-2xl px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text)] whitespace-pre-wrap">
                  {m.content}
                </div>
              </div>
            ))}
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