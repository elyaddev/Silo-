"use client";
import { FormEvent, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Composer({ roomId }: { roomId: string }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const lastSentAt = useRef<number>(0); // tiny client-side rate limit

  async function send(e: FormEvent) {
    e.preventDefault();
    setErr(null);

    const now = Date.now();
    if (now - lastSentAt.current < 800) {
      setErr("You're sending too fast. Try again.");
      return;
    }

    const trimmed = text.trim();
    if (!trimmed) return;

    setSending(true);

    // Get logged in user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { 
      setErr("You must be signed in."); 
      setSending(false); 
      return; 
    }

    // Ensure profile row exists (covers old accounts that don’t have one yet)
    await supabase.from("profiles").upsert(
      { id: user.id }, 
      { onConflict: "id" }
    );

    // Insert the new message
    const { error } = await supabase
      .from("messages")
      .insert([{
        room_id: roomId,
        profile_id: user.id,
        content: trimmed,
      }]);

    if (error) {
      setErr(error.message);
    } else {
      lastSentAt.current = now;
      setText("");
    }

    setSending(false);
  }

  return (
    <form onSubmit={send} className="flex gap-2">
      <input
        className="flex-1 rounded-lg border px-3 py-2"
        placeholder="Write a message…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        type="submit"
        disabled={sending || !text.trim()}
        className="rounded-xl border px-4 py-2 font-medium hover:bg-gray-50 disabled:opacity-60"
      >
        {sending ? "Sending…" : "Send"}
      </button>
      {err && <span className="ml-3 self-center text-sm text-red-600">{err}</span>}
    </form>
  );
}
