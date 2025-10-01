"use client";

import { useRealtimeReplies } from "@/lib/useRealtimeReplies";
import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type Discussion = {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
};

type Reply = {
  id: string | number;
  discussion_id: string;
  room_id: string;
  profile_id: string | null;
  content: string;
  created_at: string;
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
  const { replies, setReplies } = useRealtimeReplies(discussion.id, initialReplies);
  const supabase = createClientComponentClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    const content = text.trim();
    if (!content) return;
    setSending(true);
    setText("");

    const tempId = `temp-${crypto.randomUUID()}`;
    const temp: Reply = {
      id: tempId,
      discussion_id: discussion.id,
      room_id: roomId,
      profile_id: null,
      content,
      created_at: new Date().toISOString(),
    };
    setReplies((p) => [...p, temp]);

    const { data, error } = await supabase
      .from("messages")
      .insert({ room_id: roomId, discussion_id: discussion.id, content })
      .select("*")
      .single();

    setSending(false);
    if (error || !data) return;
    setReplies((p) => p.map((r) => (r.id === tempId ? (data as Reply) : r)));
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      {/* Question header */}
      <article className="rounded-2xl border bg-white px-5 py-4 shadow-sm">
        <h1 className="text-xl sm:text-2xl font-semibold">{discussion.title}</h1>
        {discussion.body ? <p className="mt-2 whitespace-pre-wrap text-gray-800">{discussion.body}</p> : null}
        <div className="mt-1 text-[11px] text-gray-400">{new Date(discussion.created_at).toLocaleString()}</div>
      </article>

      {/* Replies */}
      <div className="space-y-3">
        {replies.map((r) => (
          <div key={r.id} className="ml-3 border-l-2 border-gray-200 pl-4">
            <div className="rounded-xl bg-gray-100 px-4 py-3">
              <p className="whitespace-pre-wrap text-[15px] text-gray-800 leading-relaxed">{r.content}</p>
              <div className="mt-1 text-[11px] text-gray-400">{new Date(r.created_at).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Reply box */}
      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="sticky bottom-4 bg-transparent"
      >
        <div className="rounded-xl border bg-white p-3 flex gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a reply…"
            rows={2}
            className="flex-1 resize-y outline-none"
          />
          <button
            disabled={sending || !text.trim()}
            className="shrink-0 rounded-xl border px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
          >
            Reply
          </button>
        </div>
      </form>
    </div>
  );
}
