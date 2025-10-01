"use client";

import { useEffect, useRef, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type Message = {
  id: string;
  room_id: string;
  profile_id: string | null;
  content: string;
  created_at: string;
};

export function useRealtimeMessages(roomId: string, initial: Message[] = []) {
  const supabase = createClientComponentClient();
  const [messages, setMessages] = useState<Message[]>(initial);
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current && initial.length === 0 && roomId) {
      isFirstMount.current = false;
      supabase
        .from("messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true })
        .limit(100)
        .then(({ data, error }) => {
          if (!error && data) setMessages(data as Message[]);
        });
    }
  }, [roomId, supabase, initial.length]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, supabase]);

  return { messages, setMessages };
}
