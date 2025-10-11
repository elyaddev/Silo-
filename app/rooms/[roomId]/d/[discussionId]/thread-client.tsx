"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  useTransition,
  memo,
} from "react";
import supabase from "@/lib/supabaseClient";
import { logActivity } from "@/lib/logActivity";
import ClientTime from "@/components/ClientTime";

/** ─────────────────────────── Types ─────────────────────────── */
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
  display_name?: string | null;
  is_deleted: boolean;
  parent_id: number | null;
};

type ReplyTarget = { id: string; excerpt?: string };
type ParentPreview = { id: number; excerpt: string; authorLabel: string | null };

/** ─────────────────────────── Helpers ───────────────────────── */
function byCreatedAsc(a: { created_at: string }, b: { created_at: string }) {
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}
function isNearBottom(container: HTMLElement | null, px = 120) {
  if (!container) return true;
  const { scrollTop, scrollHeight, clientHeight } = container;
  return scrollHeight - (scrollTop + clientHeight) < px;
}

/** ───────────────────────── Component ───────────────────────── */
export default function ThreadClient({
  roomId,
  discussion,
  initialReplies,
}: {
  roomId: string;
  discussion: Discussion;
  initialReplies: Reply[];
}) {
  const [replies, setReplies] = useState<Reply[]>(
    (initialReplies ?? []).slice().sort(byCreatedAsc)
  );
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [isPending, startTransition] = useTransition();

  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const aliasCache = useRef<Map<string, string>>(new Map());
  const parentPreviewCache = useRef<Map<number, ParentPreview>>(new Map());
  const sendingIds = useRef<Set<string>>(new Set());

  /** Helpers */
  const upsertReply = useCallback((list: Reply[], row: Reply): Reply[] => {
    const idStr = String(row.id);
    let replaced = false;
    const next = list.map((r) => {
      if (String(r.id) === idStr) {
        replaced = true;
        return row;
      }
      return r;
    });
    const out = replaced ? next : [...next, row];
    out.sort(byCreatedAsc);
    return out;
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id ?? null);
    })();
  }, []);

  const normalizeLabel = (raw?: string | null) => {
    if (!raw) return null;
    const t = raw.trim();
    if (/^OP$/i.test(t)) return "OP";
    const m = t.match(/(?:User\s*)?#?\s*(\d+)/i);
    return m ? m[1] : null;
  };

  async function ensureAlias(profileId: string | null): Promise<string | null> {
    if (!profileId) return null;
    const key = `${discussion.id}:${profileId}`;
    const cached = aliasCache.current.get(key);
    if (cached) return cached;

    const { data } = await supabase
      .from("discussion_aliases")
      .select("is_op, alias")
      .eq("discussion_id", discussion.id)
      .eq("user_id", profileId)
      .maybeSingle();

    let label: string | null = null;
    if (data) {
      if (data.is_op) label = "OP";
      else if (data.alias !== null && data.alias !== undefined)
        label = String(data.alias);
    }
    if (label) aliasCache.current.set(key, label);
    return label;
  }

  useEffect(() => {
    (async () => {
      const updated = await Promise.all(
        (replies || []).map(async (r) => {
          const norm =
            normalizeLabel(r.display_name) ??
            (r.profile_id ? await ensureAlias(r.profile_id) : null);
          return { ...r, display_name: norm };
        })
      );
      setReplies(updated);
    })();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`replies:${discussion.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `discussion_id=eq.${discussion.id}` },
        async (payload) => {
          const m = payload.new as any;
          const label = await ensureAlias(m.profile_id ?? null);
          const row: Reply = {
            id: m.id,
            content: m.content,
            created_at: m.created_at,
            profile_id: m.profile_id ?? null,
            display_name: label,
            is_deleted: m.is_deleted ?? false,
            parent_id: (m.parent_id ?? null) as number | null,
          };
          startTransition(() => {
            setReplies((prev) => upsertReply(prev, row));
          });
        }
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [discussion.id, upsertReply]);

  const goToComposer = useCallback(() => {
    composerRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  /** Send reply */
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

    const tempId = `tmp-${Date.now()}`;
    const optimistic: Reply = {
      id: tempId,
      content: text,
      created_at: new Date().toISOString(),
      profile_id: session.user.id,
      display_name:
        (await ensureAlias(session.user.id)) ?? normalizeLabel("OP") ?? undefined,
      is_deleted: false,
      parent_id: parentNumeric,
    };
    startTransition(() => {
      setReplies((prev) => upsertReply(prev, optimistic));
    });

    setPosting(true);
    const { data, error } = await supabase
      .from("messages")
      .insert({
        room_id: roomId,
        discussion_id: discussion.id,
        content: text,
        parent_id: parentNumeric,
      })
      .select("id, content, created_at, profile_id, is_deleted, parent_id")
      .single();
    setPosting(false);
    sendingIds.current.delete(signature);

    if (error) {
      console.error(error);
      setReplies((prev) => prev.filter((r) => r.id !== tempId));
      alert(error.message);
      return;
    }

    const label = await ensureAlias(data?.profile_id ?? null);
    const confirmed: Reply = {
      id: data!.id,
      content: data!.content,
      created_at: data!.created_at,
      profile_id: data!.profile_id ?? null,
      display_name: label,
      is_deleted: data!.is_deleted ?? false,
      parent_id: (data!.parent_id ?? null) as number | null,
    };
    startTransition(() => {
      setReplies((prev) =>
        prev.map((r) => (r.id === tempId ? confirmed : r)).sort(byCreatedAsc)
      );
    });

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
  }, [content, posting, replyTarget, roomId, discussion.id, upsertReply]);

  const handleDelete = useCallback(async (id: number | string) => {
    await supabase.from("messages").update({ is_deleted: true }).eq("id", id);
  }, []);

  const flatReplies = useMemo(
    () => (replies ?? []).slice().sort(byCreatedAsc),
    [replies]
  );

  /** ───────────────────────── Render ────────────────────────── */
  function Pill({
    text,
    tone = "neutral",
  }: {
    text: string;
    tone?: "neutral" | "brand";
  }) {
    const cls =
      tone === "brand"
        ? "bg-[#FFF3E7] text-[#7B3E00] border-[#FFD9B8]"
        : "bg-neutral-50 text-neutral-700 border-neutral-300";
    return (
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] ${cls}`}
      >
        {text}
      </span>
    );
  }

  const MessageCard = memo(function MessageCard({ msg }: { msg: Reply }) {
    const mine = !!currentUserId && msg.profile_id === currentUserId;
    if (msg.is_deleted) {
      return (
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 italic text-neutral-500 text-sm">
          This reply was deleted.
        </div>
      );
    }
    return (
      <div
        className="rounded-3xl border border-neutral-200 bg-white px-5 py-4 shadow-[0_6px_18px_rgba(0,0,0,0.04)]"
        id={`msg-${msg.id}`}
      >
        <div className="mb-2">
          <Pill
            text={msg.display_name ?? "anonymous"}
            tone={msg.display_name === "OP" ? "brand" : "neutral"}
          />
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
                onClick={() => handleDelete(msg.id)}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    );
  });

  return (
    <div className="mx-auto max-w-4xl px-6 pb-24 pt-8 space-y-8">
      {/* Question */}
      <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-[0_6px_18px_rgba(0,0,0,0.04)]">
        <div className="mb-2">
          <span className="rounded-full px-2 py-0.5 text-[11px] font-medium bg-neutral-50 text-neutral-800 border border-neutral-300">
            Question
          </span>
        </div>
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
      <div ref={listRef} className="space-y-4">
        {flatReplies.map((m) => (
          <MessageCard key={String(m.id)} msg={m} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div
        ref={composerRef}
        className="sticky bottom-0 z-10 border-t border-neutral-200 bg-white/95 backdrop-blur-sm p-4 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] max-w-4xl mx-auto"
      >
        {replyTarget && (
          <div
            className="mb-3 truncate rounded-2xl border border-[#FFD9B8] bg-[#FFF7EF] px-3 py-2 text-[14px] text-[#5C3B23]"
            style={{ borderLeftWidth: 4, borderLeftColor: "var(--color-brand)" }}
          >
            {replyTarget.excerpt}
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder={
              replyTarget ? "Write a reply to this…" : "Write a reply…"
            }
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full rounded-3xl border border-neutral-300 px-5 py-3 text-neutral-900 placeholder-neutral-500 outline-none focus:ring-2 focus:ring-[var(--color-brand)] focus:border-[var(--color-brand)] shadow-sm transition-all"


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
            className="rounded-full px-5 py-3 bg-[var(--color-brand)] text-white font-semibold disabled:opacity-50 hover:brightness-95"
          >
            {posting ? "Sending…" : "Reply"}
          </button>
        </div>
      </div>
    </div>
  );
}
