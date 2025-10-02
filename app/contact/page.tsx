"use client";
import { useState } from "react";

export default function ContactPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: wire up to an API route or Supabase table (feedback)
    setSent(true);
    setEmail("");
    setMsg("");
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold" style={{ color: "var(--color-brand)" }}>
          Contact
        </h1>
        <p className="text-slate-600">
          Have feedback or want early access? Drop your email.
        </p>
      </header>

      <form onSubmit={onSubmit} className="rounded-3xl border bg-white p-6 space-y-3">
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-2xl border px-4 py-2 outline-none"
          style={{ borderColor: "color-mix(in oklab, var(--color-brand), white 70%)" }}
        />
        <textarea
          placeholder="Your message"
          rows={5}
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          className="w-full rounded-2xl border px-4 py-2 outline-none"
          style={{ borderColor: "color-mix(in oklab, var(--color-brand), white 70%)" }}
        />
        <div className="flex justify-end">
          <button className="btn btn-primary" type="submit">Send</button>
        </div>
        {sent && (
          <div
            className="mt-2 inline-flex items-center gap-2 rounded-xl px-3 py-1 text-sm"
            style={{ background: "color-mix(in oklab, var(--color-accent), white 90%)", color: "var(--color-accent)" }}
          >
            Thanks! We’ll be in touch.
          </div>
        )}
      </form>
    </main>
  );
}
