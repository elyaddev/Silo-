// app/rooms/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type Room = {
  id: string;
  name: string;
  is_private: boolean | null;
  created_at: string;
};

export default function RoomsPage() {
  const supabase = createClientComponentClient();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .order("created_at", { ascending: true });

      if (!mounted) return;
      if (error) {
        console.error(error);
        setRooms([]);
      } else {
        setRooms(data ?? []);
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  return (
    <main className="mx-auto max-w-4xl px-4 md:px-6 py-12 md:py-14">
      {/* Header — mirrors homepage tone */}
      <header className="text-center space-y-3 md:space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          <span className="text-slate-800">Chat</span>{" "}
          <span className="text-orange-500">Rooms</span>
        </h1>
        <p className="mx-auto max-w-2xl text-slate-600">
          Find your community. Discuss topics freely and safely.
        </p>
      </header>

      {/* List */}
      <section className="mt-10 grid gap-4">
        {loading && (
          <div className="text-center text-slate-500 py-10">Loading rooms…</div>
        )}

        {!loading && rooms.length === 0 && (
          <div className="text-center text-slate-500 py-10">
            No rooms yet.
          </div>
        )}

        {!loading &&
          rooms.map((r) => (
            <div
              key={r.id}
              className="card group flex items-center justify-between gap-4 px-6 py-5 shadow-sm hover:shadow-md transition"
            >
              <div>
                <h3 className="text-lg md:text-xl font-semibold text-slate-800">
                  {r.name}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {r.is_private ? "Private" : "Public"} room
                </p>
              </div>

              <Link
                href={`/rooms/${r.id}`}
                className="btn btn-primary rounded-full shadow-md hover:shadow-lg"
              >
                Enter
              </Link>
            </div>
          ))}
      </section>
    </main>
  );
}
