import Link from "next/link";

export default function SiloProPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 space-y-8">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-bold" style={{ color: "var(--color-brand)" }}>
          Pro Support
        </h1>
        <p className="text-slate-600">
          Private access to licensed professionals (coming soon).
        </p>
      </header>

      <section
        className="rounded-3xl border p-6"
        style={{ background: "color-mix(in oklab, var(--color-accent), white 92%)" }}
      >
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold">Join the waitlist</h3>
            <p className="text-slate-700">Be first to know when we open sessions.</p>
          </div>
          <Link href="/contact" className="btn btn-primary" style={{ background: "var(--color-accent)" }}>
            Join waitlist
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Feature
          title="Real experts"
          text="Licensed pros with college-athlete experience."
        />
        <Feature
          title="Private & safe"
          text="Clear guardrails and anonymous intake."
        />
        <Feature
          title="Flexible"
          text="One-off consults or recurring sessions."
        />
        <Feature
          title="For teams"
          text="Coach dashboards and org pricing."
        />
      </section>
    </main>
  );
}

function Feature({ title, text }: { title: string; text: string }) {
  return (
    <div
      className="rounded-2xl border bg-white p-4"
      style={{ borderColor: "color-mix(in oklab, var(--color-brand), white 70%)" }}
    >
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-slate-600 text-sm">{text}</p>
    </div>
  );
}
