"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useTransition,
  memo,
} from "react";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabaseClient";
import { logActivity } from "@/lib/logActivity";
import ClientTime from "@/components/ClientTime";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

/** ─────────── Types ─────────── */
type Discussion = {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
};

type MessageViewRow = {
  id: number;
  room_id?: string;
  discussion_id: string;
  profile_id: string | null;
  parent_id: number | null;
  reply_to_message_id: number | null;
  content: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  flagged?: boolean;
  alias_label: string | null;
};

type Reply = MessageViewRow;
type ReplyTarget = { id: string; excerpt?: string };

/** ─────────── Helpers ─────────── */
function byCreatedAsc(a: { created_at: string }, b: { created_at: string }) {
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

/** ─────────── Component ─────────── */
export default function ThreadClient({
  roomId,
  discussion,
}: {
  roomId: string;
  discussion: Discussion;
}) {
  const router = useRouter();

  const [replies, setReplies] = useState<Reply[]>([]);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [isPending, startTransition] = useTransition();

  // Menus per-message
  const [menuForMsgId, setMenuForMsgId] = useState<number | null>(null);      // alias chip menu
  const [moreForMsgId, setMoreForMsgId] = useState<number | null>(null);      // three-dots menu

  const composerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendingIds = useRef<Set<string>>(new Set());

  /** ─────────── Load current user ─────────── */
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id ?? null);
    })();
  }, []);

  /** ─────────── Load messages from view ─────────── */
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("v_messages_with_alias")
        .select(
          "id, content, created_at, updated_at, profile_id, alias_label, is_deleted, parent_id, reply_to_message_id, discussion_id"
        )
        .eq("discussion_id", discussion.id)
        .order("created_at", { ascending: true });

      if (error) console.error(error.message);
      setReplies((data ?? []) as Reply[]);
    })();
  }, [discussion.id]);

  /** ─────────── Realtime updates ─────────── */
  useEffect(() => {
    const channel = supabase
      .channel(`replies:${discussion.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `discussion_id=eq.${discussion.id}`,
        },
        async (
          payload: RealtimePostgresChangesPayload<{ id: number }>
        ) => {
          const newId = (payload.new as { id?: number })?.id;
          if (!newId) return;

          const { data } = await supabase
            .from("v_messages_with_alias")
            .select(
              "id, content, created_at, updated_at, profile_id, alias_label, is_deleted, parent_id, reply_to_message_id, discussion_id"
            )
            .eq("id", newId)
            .maybeSingle();

          if (data) {
            startTransition(() =>
              setReplies((prev) => {
                const next = prev.filter((r) => r.id !== data.id);
                return [...next, data].sort(byCreatedAsc);
              })
            );
          }
        }
      )
      .subscribe();

    return () => void supabase.removeChannel(channel);
  }, [discussion.id]);

  /** ─────────── Scroll to composer ─────────── */
  const goToComposer = useCallback(() => {
    composerRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  /** ─────────── Request chat helper ─────────── */
  const requestChat = useCallback(
    async (targetUserId: string | null) => {
      if (!targetUserId) {
        alert("Cannot request chat: missing user.");
        return;
      }
      if (currentUserId && targetUserId === currentUserId) {
        alert("That’s you 🙂");
        return;
      }
      const { data, error } = await supabase.rpc("request_dm", {
        target_user_id: targetUserId,
      });
      if (error) {
        console.error(error);
        alert(error.message);
        return;
      }
      const status = (data as any)?.status as string | undefined;
      const conv = (data as any)?.conversation_id as string | undefined;

      if (status === "accepted" && conv) {
        router.push(`/dm/${conv}`);
      } else {
        alert("Chat request sent.");
      }
    },
    [currentUserId, router]
  );

  /** ─────────── Report user helper ─────────── */
  const reportUser = useCallback(
    async (targetUserId: string | null, ctx: Record<string, any>) => {
      if (!targetUserId) {
        alert("Missing user to report.");
        return;
      }
      try {
        const { error } = await supabase.rpc("report_user", {
          p_target_user_id: targetUserId,
          p_reason: "abuse",   // simple default; can add selector later
          p_details: "",
          p_context: ctx,
        });
        if (error) {
          console.error(error);
          alert(error.message);
          return;
        }
        alert("Report submitted. Thank you.");
      } catch (err: any) {
        console.error(err);
        alert("Failed to submit report.");
      }
    },
    []
  );

  /** ─────────── Send reply ─────────── */
  const send = useCallback(async () => {
    const text = content.trim();
    if (!text || posting) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert("You must be signed in to reply.");
      return;
    }

    const parentNumeric = replyTarget ? Number(replyTarget.id) : null;
    const signature = `${session.user.id}|${discussion.id}|${parentNumeric}|${text}`;
    if (sendingIds.current.has(signature)) return;
    sendingIds.current.add(signature);

    const optimistic: Reply = {
      id: -1,
      content: text,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      profile_id: session.user.id,
      alias_label: null,
      is_deleted: false,
      parent_id: parentNumeric,
      reply_to_message_id: parentNumeric ?? null,
      discussion_id: discussion.id,
      flagged: false,
    };
    startTransition(() =>
      setReplies((prev) => [...prev, optimistic].sort(byCreatedAsc))
    );

    setPosting(true);
    const { data, error } = await supabase.rpc("post_message", {
      p_room_id: roomId,
      p_discussion_id: discussion.id,
      p_content: text,
      p_parent_id: parentNumeric,
    });
    setPosting(false);
    sendingIds.current.delete(signature);

    if (error) {
      console.error(error);
      setReplies((prev) => prev.filter((r) => r !== optimistic));
      alert(error.message);
      return;
    }

    const newId = (data as any)?.id;
    if (typeof newId === "number") {
      const { data: full } = await supabase
        .from("v_messages_with_alias")
        .select(
          "id, content, created_at, updated_at, profile_id, alias_label, is_deleted, parent_id, reply_to_message_id, discussion_id"
        )
        .eq("id", newId)
        .maybeSingle();

      if (full) {
        startTransition(() =>
          setReplies((prev) => {
            const next = prev.filter((r) => r !== optimistic);
            return [...next, full].sort(byCreatedAsc);
          })
        );
      }
    }

    setContent("");
    setReplyTarget(null);
    try {
      await logActivity("reply_created", {
        roomId,
        discussionId: discussion.id,
        replyId: (data as any)?.id ?? null,
        excerpt: text.slice(0, 140),
      });
    } catch {}
  }, [content, posting, replyTarget, roomId, discussion.id]);

  /** ─────────── UI ─────────── */
  const MessageCard = memo(({ msg }: { msg: Reply }) => {
    const mine = !!currentUserId && msg.profile_id === currentUserId;
    const parent = replies.find((p) => p.id === msg.parent_id);

    return (
      <div
        className="rounded-3xl border border-neutral-200 bg-white px-5 py-4 shadow-[0_6px_18px_rgba(0,0,0,0.04)]"
        id={`msg-${msg.id}`}
      >
        {parent && (
          <div
            className="mb-2 cursor-pointer rounded-xl border border-[#FFD9B8] bg-[#FFF7EF] px-3 py-2 text-sm text-[#5C3B23] truncate hover:brightness-95 transition"
            onClick={() => {
              const el = document.getElementById(`msg-${parent.id}`);
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                el.classList.add("ring-2", "ring-[var(--color-brand)]");
                setTimeout(
                  () =>
                    el.classList.remove("ring-2", "ring-[var(--color-brand)]"),
                  1200
                );
              }
            }}
          >
            <strong>
              {parent.alias_label === "OP"
                ? "OP"
                : parent.alias_label
                ? `${parent.alias_label}`
                : "anonymous"}
            </strong>
            : {parent.content.slice(0, 60)}…
          </div>
        )}

        {msg.is_deleted ? (
          <div className="italic text-neutral-500 text-sm">
            This reply was deleted.
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-start justify-between gap-3">
              {/* Alias chip -> clickable popover for Request chat */}
              <div className="relative inline-block">
                <button
                  type="button"
                  onClick={() => {
                    if (!msg.profile_id || msg.profile_id === currentUserId) return;
                    setMenuForMsgId((open) => (open === msg.id ? null : (msg.id as number)));
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      setMenuForMsgId((open) => (open === msg.id ? null : open));
                    }, 150);
                  }}
                  disabled={!msg.profile_id || msg.profile_id === currentUserId}
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] transition ${
                    msg.alias_label === "OP"
                      ? "bg-[#FFF3E7] text-[#7B3E00] border-[#FFD9B8]"
                      : "bg-neutral-50 text-neutral-700 border-neutral-300"
                  } ${
                    !msg.profile_id || msg.profile_id === currentUserId
                      ? "opacity-60 cursor-default"
                      : "cursor-pointer hover:brightness-95"
                  }`}
                  title={
                    !msg.profile_id || msg.profile_id === currentUserId
                      ? "You can't DM yourself"
                      : "Click to request a chat"
                  }
                >
                  {msg.alias_label === "OP"
                    ? "OP"
                    : msg.alias_label
                    ? `${msg.alias_label}`
                    : "anonymous"}
                </button>

                {menuForMsgId === msg.id && (
                  <div className="absolute z-20 mt-2 w-44 rounded-xl border border-neutral-200 bg-white shadow-lg overflow-hidden">
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50"
                      onClick={async () => {
                        setMenuForMsgId(null);
                        await requestChat(msg.profile_id);
                      }}
                    >
                      Request chat
                    </button>
                  </div>
                )}
              </div>

              {/* Three-dots overflow on the right */}
              <div className="relative inline-block ml-auto">
                <button
                  type="button"
                  onClick={() =>
                    setMoreForMsgId((open) => (open === msg.id ? null : (msg.id as number)))
                  }
                  onBlur={() => {
                    setTimeout(() => {
                      setMoreForMsgId((open) => (open === msg.id ? null : open));
                    }, 150);
                  }}
                  className="rounded-full px-2 py-1 text-[12px] border border-neutral-300 hover:bg-neutral-50"
                  title="More"
                >
                  …
                </button>
                {moreForMsgId === msg.id && (
                  <div className="absolute right-0 mt-2 w-44 rounded-xl border border-neutral-200 bg-white shadow-lg overflow-hidden z-20">
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50"
                      onClick={async () => {
                        setMoreForMsgId(null);
                        await reportUser(msg.profile_id, {
                          kind: "discussion_message",
                          discussion_id: msg.discussion_id,
                          message_id: msg.id,
                        });
                      }}
                    >
                      Report user
                    </button>
                  </div>
                )}
              </div>
            </div>

            <p className="whitespace-pre-wrap text-[16px] leading-relaxed text-neutral-900">
              {msg.content}
            </p>
            <div className="mt-2 flex items-center justify-between text-[12px] text-neutral-600">
              <ClientTime iso={msg.created_at} />
              <div className="flex gap-2">
                <button
                  className="rounded-full px-3 py-1 text-[12px] border border-neutral-300 hover:bg-neutral-50"
                  onClick={() => {
                    setReplyTarget({
                      id: String(msg.id),
                      excerpt: msg.content.slice(0, 120),
                    });
                    goToComposer();
                  }}
                >
                  Reply
                </button>
                {mine && (
                  <button
                    className="rounded-full px-3 py-1 text-[12px] border border-red-300 text-red-600 hover:bg-red-50"
                    onClick={async () => {
                      // optimistic: flip to deleted immediately
                      const prev = msg;
                      setReplies((list) =>
                        list.map((r) => (r.id === msg.id ? { ...r, is_deleted: true } : r))
                      );

                      const { error } = await supabase
                        .from("messages")
                        .update({ is_deleted: true, updated_at: new Date().toISOString() })
                        .eq("id", msg.id);

                      if (error) {
                        console.error("Delete failed:", error);
                        // revert optimistic change
                        setReplies((list) => list.map((r) => (r.id === prev.id ? prev : r)));
                        alert(error.message);
                      }
                      // success path: realtime UPDATE will also arrive
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  });

  return (
    <div className="mx-auto max-w-4xl px-6 pb-24 pt-8 space-y-8">
      <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-[0_6px_18px_rgba(0,0,0,0.04)]">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-neutral-900">
          {discussion.title}
        </h1>
        {discussion.body && (
          <p className="mt-2 text-neutral-800 whitespace-pre-wrap">
            {discussion.body}
          </p>
        )}
      </div>

      {/* Replies */}
      <div className="space-y-4">
        {replies.map((m) => (
          <MessageCard key={`${m.id}-${m.created_at}`} msg={m} />
        ))}
      </div>

      {/* Composer */}
      <div
        ref={composerRef}
        className="sticky bottom-0 z-10 border-t border-neutral-200 bg-transparent backdrop-blur-sm p-4 max-w-4xl mx-auto"
      >
        {replyTarget && (
          <div
            className="mb-3 flex items-center justify-between rounded-2xl border border-[#FFD9B8] bg-[#FFF7EF] px-3 py-2 text-[14px] text-[#5C3B23]"
            style={{ borderLeftWidth: 4, borderLeftColor: "var(--color-brand)" }}
          >
            <div className="truncate">{replyTarget.excerpt}</div>
            <button
              type="button"
              onClick={() => setReplyTarget(null)}
              className="ml-3 rounded-full px-2 text-[#7B3E00] hover:bg-[#FFEAD2] font-bold text-lg leading-none"
              title="Cancel reply"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex gap-2 items-center">
          <input
            ref={inputRef}
            type="text"
            placeholder={replyTarget ? "Write a reply to this…" : "Write a reply…"}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full rounded-3xl border border-neutral-300 px-5 py-3 text-neutral-900 placeholder-neutral-500 outline-none focus:ring-2 focus:ring-[var(--color-brand)] focus:border-[var(--color-brand)] shadow-sm transition-all bg-white"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <button
            onClick={send}
            disabled={posting || isPending || !content.trim()}
            className="rounded-3xl px-6 h-10 flex items-center justify-center bg-[var(--color-brand)] text-white font-medium disabled:opacity-50 hover:brightness-95 transition-all"
            title="Send"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4.5 h-4.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
