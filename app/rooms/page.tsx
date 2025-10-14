// app/rooms/page.tsx
import Link from "next/link";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

type RoomRow = {
  id: string;
  name: string;
  created_at: string;
};

export default async function RoomsIndexPage() {
  const supabase = createServerComponentClient({ cookies });

  const { data: rooms, error } = await supabase
    .from("rooms")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-12">
        <Header />
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load rooms: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <Header />
      {(!rooms || rooms.length === 0) ? (
        <EmptyState />
      ) : (
        <ul className="mt-6 space-y-4">
          {rooms.map((r) => (
            <li key={r.id}>
              <RoomCard id={r.id} name={r.name} created_at={r.created_at} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Header() {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-black tracking-tight">
        <span className="text-neutral-900">Chat </span>
        <span className="text-orange-500">Rooms</span>
      </h1>
      <p className="mt-2 text-sm text-neutral-600">
        Find your community. Discuss topics freely and safely.
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-8 text-center">
      <p className="text-neutral-700">No rooms yet.</p>
      <p className="text-neutral-500 text-sm">Create one to get started.</p>
    </div>
  );
}

function RoomCard({
  id,
  name,
}: {
  id: string;
  name: string;
  created_at?: string;
}) {
  return (
    <Link
      href={`/rooms/${id}`}
      className="
        group block rounded-2xl border border-orange-100 bg-white
        shadow-sm transition-all
        hover:-translate-y-0.5 hover:border-orange-500 hover:bg-orange-500 hover:shadow-md
        focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200
      "
      aria-label={`Open room: ${name}`}
    >
      <div className="flex items-center gap-4 p-5 md:p-6">
        {/* Left dot */}
        <div
          className="
            h-3 w-3 shrink-0 rounded-full bg-orange-500/80
            transition group-hover:bg-white
          "
          aria-hidden
        />
        {/* Title */}
        <h2
          className="
            flex-1 text-lg md:text-xl font-semibold tracking-tight
            text-neutral-900 transition-colors
            group-hover:text-white
          "
        >
          {name}
        </h2>

        {/* Chevron */}
        <span
          className="
            translate-x-0 text-neutral-400 transition
            group-hover:translate-x-1 group-hover:text-white
          "
          aria-hidden
        >
          →
        </span>
      </div>
    </Link>
  );
}
