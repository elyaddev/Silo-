// app/rooms/page.tsx
import Link from "next/link";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

type RoomRow = {
  id: string;
  name?: string | null;
  title?: string | null;   // if your schema ever uses title, we won't break
  is_private?: boolean | null;
  created_at?: string | null;
};

export default async function RoomsPage() {
  const supabase = createServerComponentClient({ cookies });

  // Select * so we don't care which columns exist (name vs title)
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-2xl font-semibold mb-4">Rooms</h1>
        <p className="text-sm text-red-600">Failed to load rooms: {error.message}</p>
      </main>
    );
  }

  const rooms = (data ?? []) as RoomRow[];

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <h1 className="text-2xl font-semibold">Rooms</h1>

      <div className="space-y-3">
        {rooms.length === 0 && <p className="text-gray-500">No rooms yet.</p>}
        {rooms.map((r) => {
          const label = r.name ?? r.title ?? "Untitled room";
          return (
            <div
              key={r.id}
              className="rounded-2xl border bg-white px-4 py-3 flex items-center justify-between"
            >
              <div>
                <div className="font-medium">{label}</div>
                <div className="text-xs text-gray-500">
                  {r.is_private ? "Private" : "Public"}
                </div>
              </div>
              <Link href={`/rooms/${r.id}`} className="underline text-sm">
                Open
              </Link>
            </div>
          );
        })}
      </div>
    </main>
  );
}
