// app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 md:px-6 py-14">
      {/* HERO SECTION */}
      <section className="text-center space-y-5">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-800">
          Feel <span className="text-orange-500">better</span> together
        </h1>
        <p className="text-lg text-slate-600">
          A calm space to share, listen, and grow — safely.
        </p>

        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <Link
            href="/rooms"
            className="rounded-full bg-orange-500 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-orange-600 hover:shadow-lg"
          >
            Explore Rooms
          </Link>
          <Link
            href="/guidelines"
            className="rounded-full border border-orange-200 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-orange-50 transition"
          >
            Community Rules
          </Link>
        </div>
      </section>

      {/* FEATURE ROW */}
      <section className="mt-16 grid gap-6 sm:grid-cols-3">
        <FeatureCard
          title="Anon Handles"
          text="Be heard without being seen."
          color="orange"
        />
        <FeatureCard
          title="Kind Spaces"
          text="Every room is moderated for safety."
          color="emerald"
        />
        <FeatureCard
          title="For Athletes"
          text="Talk with others who get it."
          color="sky"
        />
      </section>

      {/* CTA */}
      <section className="mt-16 text-center">
        <Link
          href="/rooms"
          className="rounded-full bg-orange-500 px-8 py-4 text-lg font-semibold text-white shadow-md transition hover:bg-orange-600 hover:shadow-lg"
        >
          Find Your Room
        </Link>
      </section>
    </main>
  );
}

/* ----- FeatureCard Component ----- */
function FeatureCard({
  title,
  text,
  color,
}: {
  title: string;
  text: string;
  color: "orange" | "emerald" | "sky";
}) {
  const palette = {
    orange: "bg-orange-50 text-orange-700 border-orange-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    sky: "bg-sky-50 text-sky-700 border-sky-100",
  }[color];

  return (
    <div
      className={`rounded-2xl border ${palette} p-6 text-left shadow-sm hover:shadow-md transition`}
    >
      <h3 className="text-lg font-bold mb-1">{title}</h3>
      <p className="text-slate-600">{text}</p>
    </div>
  );
}
