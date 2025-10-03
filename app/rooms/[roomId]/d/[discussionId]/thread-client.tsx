"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Discussion = { id: string; title: string; body: string | null; created_at: string };
type Reply = { id: number | string; content: string; created_at: string; profile_id: string | null; username?: string | null };

export default function ThreadClient({
  roomId,
  discussion,
  initialReplies,
}: {
  roomId: string;
  discussion: Discussion;
  initialReplies: Reply[];
}) {
  const [replies, setReplies] = useState<Reply[]>(initialReplies || []);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // helper to fetch username once and cache it
  const usernameCache = useRef<Map<string, string>>(new Map());

  async function ensureUsername(profileId: string | null): Promise<string | null> {
    if (!profileId) return null;
    const cached = usernameCache.current.get(profileId);
    if (cached) return cached;

    const { data, error } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", profileId)
      .maybeSingle();

    const uname = error ? null : data?.username ?? null;
    if (uname) usernameCache.current.set(profileId, uname);
    return uname;
  }

  // hydrate usernames for initial replies (in case SSR missed any)
  useEffect(() => {
    (async () => {
      const updated = await Promise.all(
        (replies || []).map(async (r) => {
          if (r.username || !r.profile_id) return r;
          const uname = await ensureUsername(r.profile_id);
          return { ...r, username: uname };
        })
      );
      setReplies(updated);
    })();
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // subscribe to realtime inserts for this discussion
  useEffect(() => {
    const channel = supabase
      .channel(`replies:${discussion.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `discussion_id=eq.${discussion.id}` },
        async (payload) => {
          const m = payload.new as any;
          const uname = await ensureUsername(m.profile_id ?? null);
          setReplies((prev) => [
            ...prev,
            {
              id: m.id,
              content: m.content,
              created_at: m.created_at,
              profile_id: m.profile_id ?? null,
              username: uname ?? null,
            },
          ]);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [discussion.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies.length]);

  async function send() {
    const text = content.trim();
    if (!text) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert("You must be signed in to reply.");
      return;
    }

    setPosting(true);
    const { error } = await supabase.from("messages").insert({
      room_id: roomId,
      discussion_id: discussion.id,
      content: text,
      // profile_id will be auto-filled by trigger; no need to send it
    });
    setPosting(false);

    if (error) {
      alert(error.message);
      return;
    }
    setContent("");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      {/* question card */}
      <div
        className="rounded-3xl border bg-white p-6 shadow-sm"
        style={{ borderColor: "color-mix(in oklab, var(--color-brand), white 60%)" }}
      >
        <div className="mb-2">
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{
              background: "color-mix(in oklab, var(--color-brand), white 90%)",
              color: "var(--color-brand)",
            }}
          >
            Question
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{discussion.title}</h1>
        {discussion.body ? <p className="mt-2 text-slate-700">{discussion.body}</p> : null}
      </div>

      {/* replies */}
      <div className="space-y-3">
        {replies.map((m) => (
          <div
            key={m.id}
            className="rounded-2xl border bg-white p-4"
            style={{
              borderColor: "color-mix(in oklab, var(--color-brand), white 70%)",
              boxShadow: "0 2px 10px rgba(255,122,0,0.06)",
            }}
          >
            <div className="flex gap-3">
              <div className="mt-1 h-5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--color-accent)" }} />
              <div className="min-w-0">
                {/* USERNAME LINE */}
                <div className="text-[12px] font-medium text-slate-600">
                  {m.username ? `@${m.username}` : 'anonymous'}
                </div>
                <p className="text-[15px] text-slate-800 mt-0.5">{m.content}</p>
                <div className="mt-1 text-[11px] text-slate-500">{new Date(m.created_at).toLocaleString()}</div>
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* composer */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Write a reply…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full rounded-xl border px-4 py-2 outline-none"
            style={{ borderColor: "color-mix(in oklab, var(--color-brand), white 70%)" }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <button onClick={send} disabled={posting || !content.trim()} className="btn btn-primary shrink-0 disabled:opacity-50">
            {posting ? "Sending…" : "Reply"}
          </button>
        </div>
      </div>
    </div>
  );
}
