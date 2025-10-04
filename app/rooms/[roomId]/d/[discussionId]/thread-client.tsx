"use client";

import { useEffect, useRef, useState } from "react";
import supabase from "@/lib/supabaseClient";
import { logActivity } from "@/lib/logActivity";
import ClientTime from "@/components/ClientTime";

type Discussion = { id: string; title: string; body: string | null; created_at: string };
type Reply = {
  id: number | string;
  content: string;
  created_at: string;
  profile_id: string | null;
  username?: string | null;
};

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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const usernameCache = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id ?? null);
    })();
  }, []);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`replies:${discussion.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `discussion_id=eq.${discussion.id}`,
        },
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
        }
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

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      alert("You must be signed in to reply.");
      return;
    }

    setPosting(true);

    const { data, error } = await supabase
      .from("messages")
      .insert({
        room_id: roomId,
        discussion_id: discussion.id,
        content: text,
      })
      .select("id, content, created_at, profile_id")
      .single();

    setPosting(false);

    if (error) {
      alert(error.message);
      return;
    }

    setContent("");

    try {
      await logActivity("reply_created", {
        roomId,
        discussionId: discussion.id,
        replyId: data?.id ?? null,
        excerpt: text.slice(0, 140),
      });
    } catch {}

    // Realtime will append the reply; no manual push required.
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 space-y-8">
      {/* Question card */}
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
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          {discussion.title}
        </h1>
        {discussion.body ? (
          <p className="mt-2 text-slate-700">{discussion.body}</p>
        ) : null}
      </div>

      {/* Replies */}
      <div className="space-y-3">
        {replies.map((m) => {
          const isMine = !!currentUserId && m.profile_id === currentUserId;

          const bubbleClasses = isMine ? "bg-orange-50 border-orange-200" : "bg-white";
          const borderColor = isMine
            ? "color-mix(in oklab, var(--color-brand), white 40%)"
            : "color-mix(in oklab, var(--color-brand), white 70%)";

          return (
            <div
              key={m.id}
              className={[
                "rounded-2xl border p-4 shadow-sm transition",
                bubbleClasses,
                isMine ? "ml-auto" : "",
                "max-w-full",
              ].join(" ")}
              style={{ borderColor }}
            >
              <div className={["flex gap-3", isMine ? "justify-end" : ""].join(" ")}>
                <div
                  className={[
                    "mt-1 h-5 w-1.5 shrink-0 rounded-full",
                    isMine ? "order-2" : "order-1",
                  ].join(" ")}
                  style={{
                    background: isMine ? "var(--color-brand)" : "var(--color-accent)",
                  }}
                />
                <div className={isMine ? "text-right" : "text-left"}>
                  <div className="text-[13px] md:text-sm font-semibold text-slate-800 flex items-center gap-2 justify-start">
                    <span className={isMine ? "ml-auto" : ""}>
                      {m.username ? `@${m.username}` : "anonymous"}
                    </span>
                    {isMine && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                        you
                      </span>
                    )}
                  </div>

                  <p className="text-[15px] md:text-[16px] leading-relaxed text-slate-800 mt-1">
                    {m.content}
                  </p>

                  <div className="mt-1 text-[11px] text-slate-500">
                    <ClientTime iso={m.created_at} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div
        className="rounded-2xl border bg-white p-4"
        style={{ borderColor: "color-mix(in oklab, var(--color-brand), white 70%)" }}
      >
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Write a reply…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full rounded-xl border px-4 py-2 outline-none focus:ring-2 focus:ring-orange-500"
            style={{ borderColor: "color-mix(in oklab, var(--color-brand), white 70%)" }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <button
            onClick={send}
            disabled={posting || !content.trim()}
            className="btn btn-primary shrink-0 disabled:opacity-50"
          >
            {posting ? "Sending…" : "Reply"}
          </button>
        </div>
      </div>
    </div>
  );
}
