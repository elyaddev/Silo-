"use client";
import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function DiscussionComposer({ roomId }: { roomId: string }) {
  const supabase = createClientComponentClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function post() {
    if (!title.trim()) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("discussions")
      .insert({ room_id: roomId, title, body })
      .select("id")
      .single();
    setLoading(false);
    if (error) return alert(error.message);
    if (data?.id) window.location.href = `/rooms/${roomId}/d/${data.id}`;
  }

  return (
    <div className="card p-5 space-y-2">
      <h2 className="text-lg font-semibold text-[var(--color-brand)]">Start a new discussion</h2>
      <input
        className="rounded-xl border border-orange-200 px-4 py-2 w-full"
        placeholder="What's on your mind?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="rounded-xl border border-orange-200 px-4 py-2 w-full"
        rows={4}
        placeholder="Add some context (optional)"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="flex justify-end">
        <button
          disabled={loading || !title.trim()}
          onClick={post}
          className="btn-primary disabled:opacity-50"
        >
          {loading ? "Posting..." : "Post"}
        </button>
      </div>
    </div>
  );
}
