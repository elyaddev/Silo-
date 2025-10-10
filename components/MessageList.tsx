"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Message = {
  id: number;
  content: string;
  created_at: string;
  profile_id: string | null;
};

export default function MessageList({ roomId }: { roomId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const scroller = useRef<HTMLDivElement | null>(null);

  // If the page URL has #m-<id> we’ll scroll to it (and not force-scroll to bottom)
  const targetHash = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.hash || "";
  }, []);
  const wantsAnchorScroll = targetHash.startsWith("#m-");

  // Fetch initial messages
  useEffect(() => {
    if (!roomId) return;
    let alive = true;

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("messages")
        .select("id, content, created_at, profile_id")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true })
        .limit(50);

      if (!alive) return;
      if (!error) setMessages(data || []);
      setLoading(false);

      // After first render, either scroll to anchor or to bottom
      setTimeout(() => {
        if (wantsAnchorScroll && targetHash) {
          const el = document.querySelector(targetHash) as HTMLElement | null;
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("ring-2", "ring-orange-400");
            setTimeout(() => el.classList.remove("ring-2", "ring-orange-400"), 1200);
            return;
          }
        }
        scroller.current?.scrollTo(0, scroller.current.scrollHeight);
      }, 60);
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Realtime: append new messages. If no anchor scroll was requested, keep autoscrolling.
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setMessages((m) => [...m, payload.new as Message]);
          // If user landed on a specific message via hash, don't yank them to bottom
          if (!wantsAnchorScroll) {
            setTimeout(() => {
              scroller.current?.scrollTo(0, scroller.current.scrollHeight);
            }, 0);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  if (!roomId) return <div ref={scroller as any} className="h-full overflow-y-auto" />;
  if (loading) return <p className="text-gray-600">Loading messages…</p>;

  return (
    <div ref={scroller as any} className="h-full overflow-y-auto space-y-3">
      {messages.length === 0 ? (
        <p className="text-gray-600">No messages yet. Start the conversation!</p>
      ) : (
        messages.map((m) => (
          <div
            key={m.id}
            id={`m-${m.id}`}                         // 👈 anchor for deep-linking
            data-message-id={m.id}
            className="rounded-xl border p-3 bg-white/80"
          >
            <div className="text-sm text-gray-500">
              {new Date(m.created_at).toLocaleString()}
            </div>
            <div className="mt-1 whitespace-pre-wrap break-words">
              {m.content}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
