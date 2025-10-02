import Link from "next/link";

export default function HomePage() {
  return (
    <main className="px-4">
      {/* HERO */}
      <section className="mx-auto max-w-4xl py-20 text-center">
        <div
          className="mx-auto inline-block rounded-2xl px-3 py-1 text-xs font-medium"
          style={{ background: "color-mix(in oklab, var(--color-brand), white 88%)", color: "var(--color-brand)" }}
        >
          Built for student-athletes
        </div>

        <h1 className="mt-5 text-4xl sm:text-5xl font-semibold tracking-tight">
          Anonymous, safe discussions for athletes.
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Ask the hard questions. Get honest answers. Your identity stays private.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/rooms" className="btn btn-primary">Enter rooms</Link>
          <Link href="/account" className="btn btn-ghost">Sign in</Link>
        </div>

        <div
          className="pointer-events-none mx-auto mt-12 h-1 w-40 rounded-full"
          style={{ background: "linear-gradient(90deg, var(--color-brand), var(--color-accent))" }}
        />
      </section>

      {/* FEATURES */}
      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-4 pb-20 sm:grid-cols-2">
        <Feature badge="Anon handles" title="Be heard without being seen"
                 text="Pick a handle. Share openly. Your legal name is never shown." />
        <Feature badge="Realtime" tone="green" title="Fast, live threads"
                 text="Post a question, get replies instantly with Supabase Realtime." />
        <Feature badge="Safety-first" title="Clear guardrails"
                 text="Community rules & moderation tools keep rooms supportive." />
        <Feature badge="For teams" tone="green" title="Room topics for every sport"
                 text="Training, injuries, performance, and more." />
      </section>

      {/* CTA */}
      <section
        className="mx-auto mb-24 max-w-4xl rounded-2xl border p-6 text-center"
        style={{ background: "color-mix(in oklab, var(--color-accent), white 92%)" }}
      >
        <h3 className="text-xl font-semibold">Coaches & orgs</h3>
        <p className="mt-1 text-slate-700">Pilot Silo with your athletes. We’ll handle setup and safety.</p>
        <div className="mt-4">
          <Link href="/contact" className="btn btn-primary">Get in touch</Link>
        </div>
      </section>
    </main>
  );
}

function Feature({
  badge, title, text, tone = "orange",
}: { badge: string; title: string; text: string; tone?: "orange" | "green" }) {
  const bg = tone === "green"
    ? "color-mix(in oklab, var(--color-accent), white 88%)"
    : "color-mix(in oklab, var(--color-brand), white 88%)";
  const fg = tone === "green" ? "var(--color-accent)" : "var(--color-brand)";
  return (
    <div className="card p-5">
      <span className="inline-block rounded-xl px-2 py-1 text-[11px] font-medium" style={{ background: bg, color: fg }}>
        {badge}
      </span>
      <h3 className="mt-2 text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-slate-600">{text}</p>
    </div>
  );
}
