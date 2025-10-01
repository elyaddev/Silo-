"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

export default function DiscussionComposer({ roomId }: { roomId: string }) {
  const supabase = createClientComponentClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const router = useRouter();

  async function createDiscussion() {
    const t = title.trim();
    const b = body.trim();
    if (!t) return;

    setSending(true);

    const { data, error } = await supabase
      .from("discussions")
      .insert({ room_id: roomId, title: t, body: b || null })
      .select("id")
      .single();

    setSending(false);

    if (error || !data) {
      console.error("Create discussion failed:", error);
      alert(error?.message ?? "Could not create discussion");
      return;
    }

    setTitle("");
    setBody("");
    router.push(`/rooms/${roomId}/d/${data.id}`);
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); createDiscussion(); }}
      className="rounded-2xl border bg-white p-4 space-y-2"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Start a new discussion — question (headline)"
        className="w-full rounded-xl border px-3 py-2 outline-none"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Optional details / context"
        rows={3}
        className="w-full rounded-xl border px-3 py-2 outline-none resize-y"
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={sending || !title.trim()}
          className="rounded-xl border px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
        >
          {sending ? "Posting…" : "Post"}
        </button>
      </div>
    </form>
  );
}
