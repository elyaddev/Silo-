import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default async function RoomsPage() {
  const supabase = createClientComponentClient();
  const { data: rooms } = await supabase.from("rooms").select("*").order("created_at");

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 space-y-6">
      <h1 className="text-3xl font-bold text-center text-[var(--color-brand)]">Chat Rooms</h1>
      <p className="text-center text-slate-600">
        Find your community. Discuss topics freely and safely.
      </p>

      <div className="grid gap-4">
        {rooms?.map((r) => (
          <div key={r.id} className="card flex items-center justify-between px-5 py-4">
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-text)]">{r.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {r.is_private ? "Private" : "Public"} room
              </p>
            </div>
            <Link
              href={`/rooms/${r.id}`}
              className="btn-primary text-sm"
              style={{ background: "var(--color-accent)" }}
            >
              Enter
            </Link>
          </div>
        )) || <p className="text-center text-slate-500">No rooms yet.</p>}
      </div>
    </main>
  );
}
