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

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setLoading(false);
      alert("You must be signed in to post.");
      return;
    }

    const { data, error } = await supabase
      .from("discussions")
      .insert({ room_id: roomId, title, body })
      .select("id, title")
      .single();

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    try {
      await logActivity("post_created", {
        roomId,
        discussionId: data?.id ?? null,
        title: data?.title ?? null,
        excerpt: (title || body || "").slice(0, 140),
      });
    } catch {}

    if (data?.id) {
      window.location.href = `/rooms/${roomId}/d/${data.id}`;
    }
  }

  const disabled = loading || !title.trim();

  return (
    <div
      className="
        rounded-2xl border border-neutral-200 bg-white/80
        shadow-sm backdrop-blur-sm
        dark:bg-neutral-900/70 dark:border-neutral-800
        p-5 space-y-3
      "
    >
      <h2
        className="
          text-base sm:text-lg font-semibold
          text-[color:var(--color-brand)]
        "
      >
        Start a new discussion
      </h2>

      {/* Title */}
      <div className="space-y-1.5">
        <label htmlFor="dc-title" className="sr-only">Title</label>
        <input
          id="dc-title"
          className="
            w-full rounded-xl border bg-white/70
            border-neutral-200 px-4 py-2.5
            placeholder:text-neutral-400
            focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand)]/30 focus:border-[color:var(--color-brand)]
            dark:bg-neutral-900/70 dark:border-neutral-800
          "
          placeholder="What's on your mind?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* Body */}
      <div className="space-y-1.5">
        <label htmlFor="dc-body" className="sr-only">Body</label>
        <textarea
          id="dc-body"
          className="
            w-full rounded-xl border bg-white/70
            border-neutral-200 px-4 py-2.5
            placeholder:text-neutral-400
            focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand)]/30 focus:border-[color:var(--color-brand)]
            dark:bg-neutral-900/70 dark:border-neutral-800
          "
          rows={4}
          placeholder="Add some context (optional)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>

      {/* Action row */}
      <div className="flex items-center justify-end pt-1">
        <button
          disabled={disabled}
          onClick={post}
          className={`
            inline-flex items-center gap-2 rounded-full
            px-5 py-2 text-sm font-medium shadow-sm
            transition-all focus:outline-none
            ${disabled
              ? "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 cursor-not-allowed"
              : "bg-[color:var(--color-brand)] text-white hover:brightness-95 active:brightness-90"}
          `}
        >
          {loading ? "Posting..." : "Post"}
        </button>
      </div>
    </div>
  );
}