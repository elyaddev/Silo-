"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import supabase from "@/lib/supabaseClient";
import { logActivity } from "@/lib/logActivity";
import ClientTime from "@/components/ClientTime";

type Discussion = {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
};

type Reply = {
  id: number | string;
  content: string;
  created_at: string;
  profile_id: string | null;
  username?: string | null;
  is_deleted: boolean;
  parent_id: number | null; // <-- BIGINT now
};

type ReplyTarget = { id: string; excerpt?: string };

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
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Cache for usernames
  const usernameCache = useRef<Map<string, string>>(new Map());

  // Load current user
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id ?? null);
    })();
  }, []);

  // Fetch username from profiles table if not cached
  async function ensureUsername(profileId: string | null): Promise<string | null> {
    if (!profileId) return null;
    const cached = usernameCache.current.get(profileId);
    if (cached) return cached;
    const { data } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", profileId)
      .maybeSingle();
    const uname = data?.username ?? null;
    if (uname) usernameCache.current.set(profileId, uname);
    return uname;
  }

  // Ensure usernames on initial load
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

  // Realtime subscription for inserts and updates
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
              is_deleted: m.is_deleted ?? false,
              parent_id: (m.parent_id ?? null) as number | null,
            },
          ]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `discussion_id=eq.${discussion.id}`,
        },
        async (payload) => {
          const m = payload.new as any;
          const uname = await ensureUsername(m.profile_id ?? null);
          setReplies((prev) =>
            prev.map((r) =>
              r.id === m.id
                ? {
                    ...r,
                    content: m.content,
                    created_at: m.created_at,
                    profile_id: m.profile_id ?? null,
                    username: uname ?? null,
                    is_deleted: m.is_deleted ?? false,
                    parent_id: (m.parent_id ?? null) as number | null,
                  }
                : r
            )
          );
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [discussion.id]);

  // Scroll to bottom when replies change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies.length]);

  // Send a new reply (with optional parent)
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

    // parent_id must be numeric now
    const parentNumeric = replyTarget ? Number(replyTarget.id) : null;

    const { data, error } = await supabase
      .from("messages")
      .insert({
        room_id: roomId,
        discussion_id: discussion.id,
        content: text,
        parent_id: parentNumeric, // <-- numeric insert
      })
      .select("id, content, created_at, profile_id, is_deleted, parent_id")
      .single();

    setPosting(false);
    if (error) {
      alert(error.message);
      return;
    }

    setContent("");
    setReplyTarget(null);

    try {
      await logActivity("reply_created", {
        roomId,
        discussionId: discussion.id,
        replyId: data?.id ?? null,
        excerpt: text.slice(0, 140),
      });
    } catch {}
  }

  // Soft-delete a message (owner only)
  async function handleDelete(id: number | string) {
    const { error } = await supabase
      .from("messages")
      .update({ is_deleted: true })
      .eq("id", id);
    if (error) {
      alert(error.message);
    }
  }

  // Group replies into root-level and children
  const { rootReplies, childrenMap } = useMemo(() => {
    const map = new Map<number | string, Reply[]>();
    const roots: Reply[] = [];
    for (const m of replies) {
      if (m.parent_id !== null && m.parent_id !== undefined) {
        const key = m.parent_id;
        const arr = map.get(key) ?? [];
        arr.push(m);
        map.set(key, arr);
      } else {
        roots.push(m);
      }
    }
    return { rootReplies: roots, childrenMap: map };
  }, [replies]);

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
          <p className="mt-2 text-slate-700 whitespace-pre-wrap">{discussion.body}</p>
        ) : null}
      </div>

      {/* Replies (root messages + nested children) */}
      <div className="space-y-3">
        {rootReplies.map((m) => {
          const isMine = !!currentUserId && m.profile_id === currentUserId;

          function MessageCard({ msg }: { msg: Reply }) {
            const mine = !!currentUserId && msg.profile_id === currentUserId;

            if (msg.is_deleted) {
              return (
                <div className="rounded-2xl border border-dashed bg-neutral-50 px-4 py-3 italic text-neutral-500 text-sm">
                  This reply was deleted.
                </div>
              );
            }

            return (
              <div className="rounded-2xl border bg-white px-5 py-4 shadow-sm">
                <div className="text-[13px] md:text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <span>{msg.username ? `@${msg.username}` : "anonymous"}</span>
                  {mine && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                      you
                    </span>
                  )}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-[15px] md:text-[16px] leading-relaxed text-slate-800">
                  {msg.content}
                </p>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                  <ClientTime iso={msg.created_at} />
                  <div className="flex gap-2">
                    <button
                      className="underline hover:no-underline"
                      onClick={() =>
                        setReplyTarget({
                          id: String(msg.id), // UI state can stay string
                          excerpt: msg.content.slice(0, 80),
                        })
                      }
                    >
                      Reply
                    </button>
                    {mine && (
                      <button
                        className="underline hover:no-underline text-red-500"
                        onClick={() => handleDelete(msg.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={m.id}>
              <MessageCard msg={m} />
              {!!childrenMap.get(m.id)?.length && (
                <div className="mt-3 space-y-3">
                  {childrenMap
                    .get(m.id)!
                    .sort((a, b) =>
                      new Date(a.created_at).getTime() -
                      new Date(b.created_at).getTime()
                    )
                    .map((c) => (
                      <div key={c.id} className="ml-3 border-l-2 border-gray-200 pl-4">
                        <MessageCard msg={c} />
                      </div>
                    ))}
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Composer with reply-to pill */}
      <div className="rounded-2xl border bg-white p-4">
        {replyTarget && (
          <div className="mb-2 flex items-center gap-2 text-sm rounded-2xl border px-3 py-2 bg-orange-50">
            <span className="text-orange-600">Replying to:</span>
            <span className="line-clamp-1">{replyTarget.excerpt}</span>
            <button
              type="button"
              onClick={() => setReplyTarget(null)}
              className="ml-auto rounded-lg border px-2 py-1 hover:bg-white"
            >
              Cancel
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={
              replyTarget ? "Write a reply to this message…" : "Write a reply…"
            }
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full rounded-xl border px-4 py-2 outline-none focus:ring-2 focus:ring-orange-500 text-[16px]"
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
            className="rounded-xl border px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
          >
            {posting ? "Sending…" : "Reply"}
          </button>
        </div>
      </div>
    </div>
  );
}
