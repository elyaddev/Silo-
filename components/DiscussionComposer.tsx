"use client";

import { useState } from "react";
import supabase from "@/lib/supabaseClient";
import { logActivity } from "@/lib/logActivity";

export default function DiscussionComposer({ roomId }: { roomId: string }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function post() {
    if (!title.trim()) return;
    setLoading(true);

    // make sure user is signed in (optional UX guard)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setLoading(false);
      alert("You must be signed in to post.");
      return;
    }

    const { data, error } = await supabase
      .from("discussions") // unchanged
      .insert({ room_id: roomId, title, body })
      .select("id, title")
      .single();

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    // ✅ log activity (new)
    try {
      await logActivity("post_created", {
        roomId,
        discussionId: data?.id ?? null,
        title: data?.title ?? null,
        excerpt: (title || body || "").slice(0, 140),
      });
    } catch {
      // don't block navigation if logging fails
    }

    if (data?.id) {
      window.location.href = `/rooms/${roomId}/d/${data.id}`;
    }
  }

  return (
    <div className="card p-5 space-y-2">
      <h2 className="text-lg font-semibold text-[var(--color-brand)]">
        Start a new discussion
      </h2>
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
