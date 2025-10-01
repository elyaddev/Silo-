"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type Message = {
  id: string;
  room_id: string;
  profile_id: string | null;
  content: string;
  created_at: string;
};

export default function ChatInputQA({
  roomId,
  onOptimisticAdd,
  onConfirm,
}: {
  roomId: string;
  onOptimisticAdd: (m: Message) => void;
  onConfirm: (tempId: string, real: Message) => void;
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
    };
    onOptimisticAdd(tempMsg);

    const { data, error } = await supabase
      .from("messages")
      .insert({ room_id: roomId, content })
      .select("*")
      .single();

    setSending(false);
    if (error || !data) return;
    onConfirm(tempId, data as Message);
  }

  return (
    <div className="border-t p-3 bg-white">
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
          className="rounded-xl border px-3 py-2 outline-none"
        />
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Answer…"
          rows={3}
          className="rounded-xl border px-3 py-2 outline-none resize-y"
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
