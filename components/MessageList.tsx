"use client";
import { useEffect, useRef, useState } from "react";
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

  // Bail fast if no roomId yet
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
      setTimeout(() => scroller.current?.scrollTo(0, scroller.current.scrollHeight), 0);
    })();
    return () => { alive = false; };
  }, [roomId]);

  // Realtime
  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages((m) => [...m, payload.new as Message]);
          setTimeout(() => scroller.current?.scrollTo(0, scroller.current.scrollHeight), 0);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  if (!roomId) return <div ref={scroller as any} className="h-full overflow-y-auto" />;
  if (loading) return <p className="text-gray-600">Loading messages…</p>;

  return (
    <div ref={scroller as any} className="h-full overflow-y-auto space-y-3">
      {messages.length === 0 ? (
        <p className="text-gray-600">No messages yet. Start the conversation!</p>
      ) : (
        messages.map((m) => (
          <div key={m.id} className="rounded-xl border p-3">
            <div className="text-sm text-gray-500">
              {new Date(m.created_at).toLocaleString()}
            </div>
            <div className="mt-1">{m.content}</div>
          </div>
        ))
      )}
    </div>
  );
}
