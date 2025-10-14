"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useParams, useRouter } from "next/navigation";
import supabase from "@/lib/supabaseClient";
import ClientTime from "@/components/ClientTime";
import { createPortal } from "react-dom";

type DM = {
  id: number;
  conversation_id: string;
  sender_id: string;
  content: string;
  reply_to_message_id: number | null;
  created_at: string;
  is_deleted: boolean;
};

/* ────────────────────────── Portal Menu (into list container) ────────────────────────── */
const MENU_W = 176; // Tailwind w-44

function PortalMenu({
  open,
  top,
  left,
  onClose,
  onReport,
  container,
}: {
  open: boolean;
  top: number;
  left: number;
  onClose: () => void;
  onReport: () => void;
  container: HTMLElement | null;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      const el = menuRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDocDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !container) return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{ position: "absolute", top, left, width: MENU_W }}
      className="z-[10000] rounded-xl border border-neutral-200 bg-white shadow-lg overflow-hidden"
    >
      <button
        className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50"
        onClick={onReport}
      >
        Report user
      </button>
    </div>,
    container
  );
}

/* ───────────────────────── Conversation Page ───────────────────────── */

export default function DMConversationPage() {
  const router = useRouter();
  const { conversationId } = useParams<{ conversationId: string }>();

  const [me, setMe] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<DM[]>([]);
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [posting, setPosting] = useState(false);

  // Menu state (portaled to list container)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- helpers --------------------------------------------------------------

  async function refreshTotalUnread() {
    const { data, error } = await supabase.rpc("total_dm_unread");
    const total = !error && typeof data === "number" ? data : 0;
    window.dispatchEvent(new CustomEvent("dm:unread:update", { detail: { count: total } }));
  }

  async function markReadNow() {
    if (!conversationId || !me) return;
    await supabase
      .from("direct_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", me);
    await refreshTotalUnread();
  }

  // 1) get current user
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setMe(session?.user?.id ?? null);
    })();
  }, []);

  // 2) membership guard + read marker
  useEffect(() => {
    if (!conversationId) return;
    (async () => {
      const uid = (await supabase.auth.getUser()).data.user?.id ?? "";
      const { data, error } = await supabase
        .from("direct_members")
        .select("user_id, conversation_id")
        .eq("conversation_id", conversationId)
        .eq("user_id", uid)
        .limit(1);

      if (error) {
        alert(error.message);
        return;
      }
      if (!data || data.length === 0) {
        alert("You do not have access to this conversation.");
        router.replace("/dm/requests");
        return;
      }
      await supabase
        .from("direct_members")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("user_id", uid);

      await refreshTotalUnread();
    })();
  }, [conversationId, router]);

  // 3) initial load
  useEffect(() => {
    if (!conversationId) return;
    (async () => {
      const { data, error } = await supabase
        .from("direct_messages")
        .select("id, conversation_id, sender_id, content, reply_to_message_id, created_at, is_deleted")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(500);
      if (error) {
        console.error(error);
        alert(error.message);
        return;
      }
      setMsgs((data ?? []) as DM[]);
      setTimeout(() => listRef.current?.scrollTo({ top: listRef.current!.scrollHeight }), 50);
    })();
  }, [conversationId]);

  // 4) realtime inserts
  useEffect(() => {
    if (!conversationId) return;
    const ch = supabase
      .channel(`dm:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages", filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          const row = payload.new as DM;
          startTransition(() => setMsgs((prev) => [...prev, row]));
          if (row.sender_id === me) await markReadNow();
          setTimeout(() => listRef.current?.scrollTo({ top: listRef.current!.scrollHeight, behavior: "smooth" }), 50);
        }
      )
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [conversationId, me]);

  // 5) send
  const send = useCallback(async () => {
    const value = text.trim();
    if (!value || posting) return;
    setPosting(true);

    const temp: DM = {
      id: -Date.now(),
      conversation_id: conversationId,
      sender_id: me ?? "",
      content: value,
      reply_to_message_id: null,
      created_at: new Date().toISOString(),
      is_deleted: false,
    };
    setMsgs((prev) => [...prev, temp]);

    const { error } = await supabase.rpc("send_dm", {
      p_conversation_id: conversationId,
      p_content: value,
      p_reply_to_message_id: null,
    });

    setPosting(false);

    if (error) {
      setMsgs((prev) => prev.filter((m) => m.id !== temp.id));
      alert(error.message);
      return;
    }

    setText("");
    inputRef.current?.focus();
    await markReadNow();
  }, [conversationId, me, posting, text]);

  // 6) report helper
  const reportUser = useCallback(
    async (targetUserId: string, dmMessageId: number) => {
      try {
        const { error } = await supabase.rpc("report_user", {
          p_target_user_id: targetUserId,
          p_reason: "abuse",
          p_details: "",
          p_context: {
            kind: "dm_message",
            conversation_id: conversationId,
            dm_message_id: dmMessageId,
          },
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
    [conversationId]
  );

  const you = useMemo(() => me, [me]);

  // Open the menu anchored to the button, positioned inside the list container
  function openMenuFor(e: React.MouseEvent<HTMLButtonElement>, msgId: number) {
    const list = listRef.current;
    if (!list) return;

    const btnRect = e.currentTarget.getBoundingClientRect();
    const listRect = list.getBoundingClientRect();

    // position inside the scrolling container (absolute)
    const gap = 8;
    const top = btnRect.bottom - listRect.top + list.scrollTop + gap;
    let left = btnRect.right - listRect.left - MENU_W; // right-align to button

    // clamp within container horizontal bounds
    const minLeft = 8;
    const maxLeft = Math.max(minLeft, list.clientWidth - MENU_W - 8);
    left = Math.min(Math.max(left, minLeft), maxLeft);

    setMenuPos({ top, left });
    setOpenMenuId(msgId);
  }

  return (
    <div className="mx-auto max-w-3xl h-[calc(100vh-140px)] px-4 pt-6 pb-4 flex flex-col">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">Direct Message</h1>
        <button
          className="rounded-full px-3 py-1 text-sm border border-neutral-300 hover:bg-neutral-50"
          onClick={() => router.push("/dm/requests")}
        >
          Requests
        </button>
      </div>

      {/* Messages list */}
      <div
        ref={listRef}
        className="relative flex-1 overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-4 space-y-3"
      >
        {msgs.length === 0 ? (
          <div className="text-sm text-neutral-600">Say hi 👋</div>
        ) : (
          msgs.map((m) => {
            const mine = you !== null && m.sender_id === you;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  id={`msg-${m.id}`}
                  className={`relative max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                    mine
                      ? "ml-auto bg-[var(--color-brand)] text-white"
                      : "bg-neutral-100 text-neutral-900"
                  }`}
                >
                  {m.is_deleted ? (
                    <span className="italic opacity-80">Message deleted</span>
                  ) : (
                    <>
                      <div className="whitespace-pre-wrap">{m.content}</div>
                      <div
                        className={`mt-1 flex items-center gap-2 text-[11px] opacity-80 ${
                          mine ? "text-white" : "text-neutral-600"
                        }`}
                      >
                        <ClientTime iso={m.created_at} />
                        {!mine && (
                          <div className="relative inline-block">
                            <button
                              type="button"
                              onClick={(e) => openMenuFor(e, m.id)}
                              className="rounded-full px-2 py-0.5 border border-neutral-300 hover:bg-neutral-50"
                              title="More"
                            >
                              …
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Portal menu (renders inside the list container so it scrolls with content) */}
        <PortalMenu
          open={openMenuId !== null}
          top={menuPos.top}
          left={menuPos.left}
          container={listRef.current}
          onClose={() => setOpenMenuId(null)}
          onReport={async () => {
            const msg = msgs.find((x) => x.id === openMenuId!);
            setOpenMenuId(null);
            if (!msg) return;
            await reportUser(msg.sender_id, msg.id);
          }}
        />
      </div>

      {/* Composer */}
      <div className="mt-3 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Write a message…"
          className="w-full rounded-3xl border border-neutral-300 px-5 py-3 text-neutral-900 placeholder-neutral-500 outline-none focus:ring-2 focus:ring-[var(--color-brand)] focus:border-[var(--color-brand)] bg-white"
        />
        <button
          onClick={send}
          disabled={!text.trim() || isPending || posting}
          className="rounded-3xl px-6 h-10 flex items-center justify-center bg-[var(--color-brand)] text-white font-medium disabled:opacity-50 hover:brightness-95"
          title="Send"
        >
          Send
        </button>
      </div>
    </div>
  );
}
