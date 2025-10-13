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
      <div className="mx-auto max-w-5xl px-6 py-14">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900">
          Chat Rooms
        </h1>
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load rooms: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      {/* Header */}
      <div className="text-center mb-8 md:mb-10">
        <h1 className="text-[34px] md:text-[44px] font-bold tracking-tight">
          <span className="text-neutral-900">Chat </span>
          <span className="text-[var(--color-brand)]">Rooms</span>
        </h1>
        <p className="mt-2 text-neutral-600 text-[15px] md:text-base">
          Find your community. Discuss topics freely and safely.
        </p>
      </div>

      {/* List */}
      <ul className="grid gap-4 md:gap-5">
        {(rooms ?? []).map((r) => (
          <li key={r.id}>
            <Link
              href={`/rooms/${r.id}`}
              className={[
                "group block rounded-3xl border shadow-sm",
                "border-[#FFE0C8] bg-white/90",
                "px-5 py-5 md:px-7 md:py-6",
                "transition-all duration-200 ease-out",
                "hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-lg",
                "hover:bg-[#FFF8F2] hover:border-[#FFCFAE]",
                "focus:outline-none focus:ring-2 focus:ring-[#FFB98A]/60",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-4">
                <h2 className="truncate text-xl md:text-2xl font-medium tracking-tight text-neutral-900">
                  {r.name}
                </h2>

                <span
                  className={[
                    "inline-flex items-center justify-center rounded-full px-4 md:px-5 h-10 md:h-11",
                    "text-sm md:text-[15px] font-medium",
                    "bg-[var(--color-brand)] text-white",
                    "transition-all duration-200 ease-out",
                    "group-hover:brightness-95 group-active:scale-95",
                    "shadow-[0_6px_18px_rgba(255,140,0,0.25)]",
                  ].join(" ")}
                >
                  Enter
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {(rooms ?? []).length === 0 && (
        <div className="mt-8 rounded-3xl border border-[#FFE0C8] bg-[#FFF6EE] p-6 text-center text-neutral-700">
          No rooms yet. Check back soon!
        </div>
      )}
    </div>
  );
}
