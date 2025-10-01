"use client";
import { useEffect, useRef, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type Reply = {
  id: string | number;
  discussion_id: string;
  room_id: string;
  profile_id: string | null;
  content: string;
  created_at: string;
};

export function useRealtimeReplies(discussionId: string, initial: Reply[] = []) {
  const supabase = createClientComponentClient();
  const [replies, setReplies] = useState<Reply[]>(initial);
  const once = useRef(false);

  // Optional initial fetch if server didn't preload
  useEffect(() => {
    if (!discussionId || once.current || initial.length) return;
    once.current = true;
    supabase.from("messages")
      .select("*")
      .eq("discussion_id", discussionId)
      .order("created_at", { ascending: true })
      .then(({ data }) => data && setReplies(data as Reply[]));
  }, [discussionId, initial.length, supabase]);

  useEffect(() => {
    if (!discussionId) return;
    const ch = supabase
      .channel(`disc:${discussionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `discussion_id=eq.${discussionId}` },
        (p) => setReplies((prev) => (prev.some((r) => r.id === (p.new as any).id) ? prev : [...prev, p.new as Reply]))
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [discussionId, supabase]);

  return { replies, setReplies };
}
