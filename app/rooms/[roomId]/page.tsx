// app/rooms/[roomId]/page.tsx
import DiscussionList from "@/components/DiscussionList";
import DiscussionComposer from "@/components/DiscussionComposer";
import BackBar from "@/components/BackBar";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

type DiscussionRow = {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
};

export default async function RoomPage({ params }: { params: { roomId: string } }) {
  const supabase = createServerComponentClient({ cookies });

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", params.roomId)
    .maybeSingle();

  const { data: discussions, error: discError } = await supabase
    .from("discussions")
    .select("id, title, body, created_at")
    .eq("room_id", params.roomId)
    .order("created_at", { ascending: false });

  const roomLabel = (room as any)?.name ?? (room as any)?.title ?? "(Room)";

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <BackBar backHref="/rooms" backLabel="All Rooms" />

      <h1 className="text-2xl font-semibold">{roomLabel}</h1>

      {(roomError || !room) && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700">
          {roomError
            ? `Could not load room: ${roomError.message}`
            : "Room not found (or you don't have permission)."}
        </div>
      )}

      <div id="compose">
        <DiscussionComposer roomId={params.roomId} />
      </div>

      <h2 className="text-lg font-semibold">Discussions</h2>

      {discError ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          Failed to load discussions: {discError.message}
        </div>
      ) : (
        <DiscussionList
          roomId={params.roomId}
          items={(discussions ?? []) as DiscussionRow[]}
        />
      )}
    </div>
  );
}
