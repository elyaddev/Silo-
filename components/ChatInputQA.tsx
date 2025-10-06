"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type Message = {
  id: string;
  room_id: string;
  profile_id: string | null;
  content: string;
  created_at: string;
  parent_id: string | null;
  is_deleted: boolean;
};

export default function ChatInputQA({
  roomId,
  onOptimisticAdd,
  onConfirm,
  replyingTo,            // NEW: { id: string, excerpt?: string } | null
  onClearReplyTarget,    // NEW: () => void
}: {
  roomId: string;
  onOptimisticAdd: (m: Message) => void;
  onConfirm: (tempId: string, real: Message) => void;
  replyingTo: { id: string; excerpt?: string } | null;
  onClearReplyTarget: () => void;
}) {
  const supabase = createClientComponentClient();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    const title = question.trim();
    const body = answer.trim();
    if (!title && !body) return;

    const content = body ? `${title}\n\n${body}` : title;

    setSending(true);
    setQuestion("");
    setAnswer("");

    const tempId = `temp-${crypto.randomUUID()}`;
    const tempMsg: Message = {
      id: tempId,
      room_id: roomId,
      profile_id: null,
      content,
      created_at: new Date().toISOString(),
      parent_id: replyingTo?.id ?? null,
      is_deleted: false,
    };
    onOptimisticAdd(tempMsg);

    const { data, error } = await supabase
      .from("messages")
      .insert({ room_id: roomId, content, parent_id: replyingTo?.id ?? null })
      .select("*")
      .single();

    setSending(false);
    if (!error && data) {
      onConfirm(tempId, data as Message);
      onClearReplyTarget(); // clear reply target after successful send
    }
  }

  return (
    <div className="border-t p-3 bg-white">
      {replyingTo && (
        <div className="mb-2 flex items-center gap-2 text-sm rounded-2xl border px-3 py-2 bg-orange-50">
          <span className="text-orange-600">Replying to:</span>
          <span className="line-clamp-1">{replyingTo.excerpt ?? replyingTo.id}</span>
          <button
            type="button"
            onClick={onClearReplyTarget}
            className="ml-auto rounded-lg border px-2 py-1 hover:bg-white"
          >
            Cancel
          </button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="grid grid-cols-1 gap-2 sm:gap-3"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Question (headline)…"
          className="rounded-xl border px-3 py-2 outline-none text-[16px]"
        />
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Answer…"
          rows={3}
          className="rounded-xl border px-3 py-2 outline-none resize-y text-[16px]"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={sending || (!question.trim() && !answer.trim())}
            className="rounded-xl border px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
