"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ClientTime from "@/components/ClientTime";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type Msg = {
  id: string;
  content: string;
  profile_id: string | null;
  created_at: string;
  is_deleted: boolean;
  parent_id: string | null;
};

export default function ChatMessages({
  messages,
  onChooseReplyTarget, // (msgId: string, excerpt?: string) => void
}: {
  messages: Msg[];
  onChooseReplyTarget: (msgId: string, excerpt?: string) => void;
}) {
  const supabase = createClientComponentClient();
  const endRef = useRef<HTMLDivElement | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setMyUserId(data.user?.id ?? null);
    });
  }, [supabase]);

  // Build parent -> children map for 1-level threading
  const { roots, childrenMap } = useMemo(() => {
    const map = new Map<string, Msg[]>();
    const roots: Msg[] = [];
    for (const m of messages) {
      if (m.parent_id) {
        const arr = map.get(m.parent_id) ?? [];
        arr.push(m);
        map.set(m.parent_id, arr);
      } else {
        roots.push(m);
      }
    }
    return { roots, childrenMap: map };
  }, [messages]);

  async function deleteMessage(id: string) {
    // Soft delete: mark is_deleted = true (owner or moderator)
    await supabase.from("messages").update({ is_deleted: true }).eq("id", id);
    // Realtime UPDATE handler in useRealtimeReplies will update UI
  }

  function Tombstone() {
    return (
      <div className="rounded-2xl border border-dashed bg-neutral-50 text-neutral-500 text-sm px-4 py-3 italic">
        This reply was deleted.
      </div>
    );
  }

  function MessageCard({ m }: { m: Msg }) {
    const canDelete = myUserId && m.profile_id === myUserId;

    return (
      <div className="rounded-2xl border border-gray-300 bg-white px-5 py-4 shadow-sm">
        {m.is_deleted ? (
          <Tombstone />
        ) : (
          <>
            <p className="whitespace-pre-wrap text-[15px] text-gray-800 leading-relaxed">
              {m.content}
            </p>
            <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-500">
              <ClientTime iso={m.created_at} />
              <button
                className="underline hover:no-underline"
                onClick={() => onChooseReplyTarget(m.id, m.content.slice(0, 80))}
              >
                Reply
              </button>
              {canDelete && (
                <button
                  className="underline hover:no-underline text-red-500"
                  onClick={() => deleteMessage(m.id)}
                >
                  Delete
                </button>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        No messages yet — start the conversation!
      </div>
    );
  }

  const [first, ...rest] = roots; // first message = question

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
      {/* First message as the question */}
      {first && (
        <article className="rounded-2xl border border-gray-300 bg-white px-5 py-4 shadow-sm">
          <h2 className="text-lg sm:text-xl font-semibold tracking-tight mb-2">
            {first.is_deleted ? "This question was deleted." : first.content}
          </h2>
          <div className="text-xs text-gray-400">
            <ClientTime iso={first.created_at} />
          </div>
          {/* children of the first message */}
          {!!childrenMap.get(first.id)?.length && (
            <div className="mt-4 space-y-3">
              {childrenMap.get(first.id)!.map((c) => (
                <div key={c.id} className="ml-3 border-l-2 border-gray-200 pl-4">
                  <MessageCard m={c} />
                </div>
              ))}
            </div>
          )}
        </article>
      )}

      {/* The rest of root messages (top-level answers) */}
      <div className="space-y-4">
        {rest.map((m) => (
          <div key={m.id}>
            <MessageCard m={m} />
            {/* 1-level nested replies */}
            {!!childrenMap.get(m.id)?.length && (
              <div className="mt-3 space-y-3">
                {childrenMap.get(m.id)!.map((c) => (
                  <div key={c.id} className="ml-3 border-l-2 border-gray-200 pl-4">
                    <MessageCard m={c} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div ref={endRef} />
    </div>
  );
}
